/**
 * @file scripts/ingest.mjs
 * @description Production-grade RAG ingestion pipeline.
 *
 * Reads text/PDF sources, chunks them, generates 384-dim embeddings via
 * Xenova/all-MiniLM-L6-v2, and pushes everything to Firebase Firestore.
 *
 * Usage:
 *   node scripts/ingest.mjs [--source <file_or_dir>] [--chunk-size <n>] [--overlap <n>] [--dry-run]
 *
 * Environment variables required:
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * Supported input formats: .txt, .md, .pdf (via pdf-parse)
 */
import 'dotenv/config';
import fsPromises from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// ─── CONFIG ────────────────────────────────────────────────────────────────────

const ARGS            = process.argv.slice(2);
const getArg          = (flag, fallback) => { const idx = ARGS.indexOf(flag); return idx !== -1 ? ARGS[idx + 1] : fallback; };
const DRY_RUN         = ARGS.includes('--dry-run');
const SOURCE_PATH     = getArg('--source', 'D:/RAG/temp-pdf/out_utf8.txt');
const CHUNK_SIZE      = parseInt(getArg('--chunk-size', '1200'), 10);
const CHUNK_OVERLAP   = parseInt(getArg('--overlap', '250'), 10);
const COLLECTION_NAME = 'embeddings';
const BATCH_SIZE      = 100; // Firestore max batch size 

// ─── VALIDATE ENV ──────────────────────────────────────────────────────────────

const REQUIRED_ENV = ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missingEnv = REQUIRED_ENV.filter((k) => !process.env[k] || process.env[k].includes('your-'));

if (missingEnv.length > 0 && !DRY_RUN) {
  console.error('\n❌ Missing Firebase credentials in .env:\n  ' + missingEnv.join('\n  '));
  console.error('\n📋 To fix, open .env and fill in:\n');
  console.error('   FIREBASE_PROJECT_ID="your-actual-project-id"');
  console.error('   FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com"');
  console.error('   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
  console.error('\n🔑 Get these from: Firebase Console → Project Settings → Service Accounts → Generate new private key\n');
  process.exit(1);
}

// ─── TEXT PROCESSING ────────────────────────────────────────────────────────────

/**
 * Chunk text with overlap to preserve context at boundaries.
 * @param {string} text
 * @param {number} maxChars
 * @param {number} overlap
 * @returns {string[]}
 */
function chunkText(text, maxChars = 1200, overlap = 250) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const chunk = text.slice(i, i + maxChars).trim();
    if (chunk.length > 30) chunks.push(chunk);  // skip tiny tail chunks
    i += maxChars - overlap;
  }
  return chunks;
}

/**
 * Cleans raw text for embedding quality.
 * Removes page headers, repeated whitespace, control chars.
 * @param {string} raw
 * @returns {string}
 */
function cleanText(raw) {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\f/g, '\n')                    // form feeds (page breaks)
    .replace(/[ \t]+/g, ' ')                 // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')              // max 2 consecutive newlines
    .replace(/[^\x20-\x7E\n]/g, ' ')         // strip non-ASCII control chars
    .trim();
}

/**
 * Load and parse a single file. Supports .txt, .md, .pdf.
 * @param {string} filePath
 * @returns {Promise<{filename: string, content: string}>}
 */
async function loadFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);

  if (ext === '.pdf') {
    const pdfParse = require('pdf-parse');
    const buffer = await fsPromises.readFile(filePath);
    const data = await pdfParse(buffer);
    return { filename, content: cleanText(data.text) };
  }

  if (ext === '.txt' || ext === '.md') {
    const raw = await fsPromises.readFile(filePath, 'utf-8');
    return { filename, content: cleanText(raw) };
  }

  throw new Error(`Unsupported file format: ${ext} (${filePath})`);
}

/**
 * Discover all supported files at a path (file or directory).
 * @param {string} sourcePath
 * @returns {Promise<string[]>}
 */
async function discoverFiles(sourcePath) {
  const stat = await fsPromises.stat(sourcePath);
  if (stat.isFile()) return [sourcePath];

  // Directory: recurse
  const entries = await fsPromises.readdir(sourcePath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(sourcePath, entry.name);
    if (entry.isDirectory()) {
      files.push(...await discoverFiles(full));
    } else if (['.txt', '.md', '.pdf'].includes(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

// ─── FIRESTORE ─────────────────────────────────────────────────────────────────

async function initFirestore() {
  const adminModule = await import('firebase-admin');
  const admin = adminModule.default ?? adminModule;

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }
  return admin.firestore();
}

/**
 * Push an array of {id, content, embedding, metadata} docs to Firestore in batches.
 * @param {FirebaseFirestore.Firestore} db
 * @param {Array} records
 */
async function pushToFirestore(db, records) {
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = records.slice(i, i + BATCH_SIZE);
    for (const rec of slice) {
      const ref = db.collection(COLLECTION_NAME).doc(rec.id);
      batch.set(ref, {
        content: rec.content,
        embedding: rec.embedding,
        filename: rec.filename,
        metadata: rec.metadata,
      });
    }
    await batch.commit();
    process.stdout.write(`\r  ✔  Committed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(records.length / BATCH_SIZE)}  (${i + slice.length}/${records.length} docs)`);
  }
  process.stdout.write('\n');
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║       🔥 RAG Firestore Ingestion Pipeline v2.0           ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  console.log(`📂 Source      : ${SOURCE_PATH}`);
  console.log(`📦 Chunk size  : ${CHUNK_SIZE} chars  |  Overlap: ${CHUNK_OVERLAP}`);
  console.log(`🔥 Target      : Firestore → ${COLLECTION_NAME}`);
  console.log(`🏃 Mode        : ${DRY_RUN ? '🔍 DRY RUN (no writes)' : '✍️  LIVE'}\n`);

  // 1. Discover files
  const files = await discoverFiles(SOURCE_PATH);
  console.log(`📄 Found ${files.length} file(s):`);
  files.forEach((f) => console.log(`   • ${path.relative(process.cwd(), f)}`));

  // 2. Load content
  const allChunks = [];
  for (const filePath of files) {
    let loaded;
    try {
      loaded = await loadFile(filePath);
    } catch (e) {
      console.warn(`   ⚠️  Skipping ${filePath}: ${e.message}`);
      continue;
    }
    const chunks = chunkText(loaded.content, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`\n📖 "${loaded.filename}" → ${chunks.length} chunks`);
    chunks.forEach((chunk, i) => {
      allChunks.push({
        rawId: `${loaded.filename.replace(/\W+/g, '_')}_${i}`,
        filename: loaded.filename,
        content: chunk,
        chunkIndex: i,
      });
    });
  }

  if (allChunks.length === 0) {
    console.error('\n❌ No chunks produced. Check your source path and file contents.');
    process.exit(1);
  }

  console.log(`\n🔢 Total chunks to embed: ${allChunks.length}`);

  // 3. Load embedding model
  console.log('\n🧠 Loading Xenova/all-MiniLM-L6-v2 embedding model (quantized)...');
  const { pipeline } = await import('@xenova/transformers');
  const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  console.log('   ✔  Model ready.\n');

  // 4. Generate embeddings
  const records = [];
  let skipped = 0;

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    if (chunk.content.trim().length < 30) { skipped++; continue; }

    try {
      const out = await extractor(chunk.content, { pooling: 'mean', normalize: true });
      const embedding = Array.from(out.data);

      if (embedding.length !== 384 || embedding.every((v) => v === 0)) {
        console.warn(`   ⚠️  Bad embedding at chunk ${i}, skipping.`);
        skipped++;
        continue;
      }

      records.push({
        id: chunk.rawId,
        filename: chunk.filename,
        content: chunk.content,
        embedding,
        metadata: {
          source: chunk.filename,
          chunkIndex: chunk.chunkIndex,
          charCount: chunk.content.length,
        },
      });

      // Progress bar
      const pct = Math.round(((i + 1) / allChunks.length) * 100);
      const bar = '█'.repeat(Math.floor(pct / 5)) + '░'.repeat(20 - Math.floor(pct / 5));
      process.stdout.write(`\r  [${bar}] ${pct}% (${i + 1}/${allChunks.length})  `);
    } catch (e) {
      console.warn(`\n   ⚠️  Embedding error at chunk ${i}: ${e.message}`);
      skipped++;
    }
  }

  process.stdout.write('\n');
  console.log(`\n✅ Generated ${records.length} embeddings. Skipped: ${skipped}`);

  // 5. Dry run exit
  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN complete. No data was written to Firestore.');
    console.log(`   Would push ${records.length} documents to collection: "${COLLECTION_NAME}"`);
    console.log('   Re-run without --dry-run to commit.\n');
    return;
  }

  // 6. Push to Firestore
  console.log(`\n🔥 Pushing ${records.length} documents to Firestore...`);
  const db = await initFirestore();
  await pushToFirestore(db, records);

  console.log(`\n🎉 Ingestion complete!`);
  console.log(`   Collection : ${COLLECTION_NAME}`);
  console.log(`   Documents  : ${records.length}`);
  console.log(`   Project    : ${process.env.FIREBASE_PROJECT_ID}\n`);
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
