import 'dotenv/config';
import { embedMany } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const bytezProvider = createOpenAI({
  apiKey: process.env.BYTEZ_API_KEY,
  baseURL: 'https://api.bytez.com/v1' // Assuming Bytez OpenAI API endpoint
});
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const _pdfParse = require('pdf-parse');
const pdfParse = _pdfParse.default || _pdfParse;

const INPUT_FILE = 'D:/RAG/pdf_content.txt';
const OUTPUT_FILE = path.join(process.cwd(), 'data/vector_store.json');

// Helper to chunk text
function chunkText(text, maxChars = 1000, overlap = 200) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxChars));
    i += maxChars - overlap;
  }
  return chunks;
}

async function main() {
  if (!process.env.BYTEZ_API_KEY) {
    console.error('Error: BYTEZ_API_KEY is not set in environment.');
    process.exit(1);
  }

  console.log(`Reading extracted PDF content from: ${INPUT_FILE}`);
  
  const documents = [];
  let docId = 1;

  const dataBuffer = await fs.readFile(INPUT_FILE, 'utf-8');
  
  // Clean text
  const cleanText = dataBuffer.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  
  // Chunking
  const chunks = chunkText(cleanText, 1500, 300);
  console.log(`  -> Created ${chunks.length} chunks.`);
  
  for (const chunk of chunks) {
    documents.push({
      id: docId++,
      filename: 'Research PDFs',
      content: chunk
    });
  }

  console.log(`Generating embeddings for ${documents.length} chunks...`);
  
  try {
    const contents = documents.map(d => d.content);
    const validContents = contents.filter(c => c.trim().length > 20);

    if (validContents.length > 0) {
      console.log('Loading local embedding model (Xenova/all-MiniLM-L6-v2)...');
      const { pipeline } = await import('@xenova/transformers');
      const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

      for (let i = 0; i < documents.length; i++) {
        if (documents[i].content.trim().length <= 20) {
            documents[i].embedding = new Array(384).fill(0); // Dummy for skipped
            continue;
        }
        const out = await extractor(documents[i].content, { pooling: 'mean', normalize: true });
        documents[i].embedding = Array.from(out.data);
      }

      const outDir = path.dirname(OUTPUT_FILE);
      await fs.mkdir(outDir, { recursive: true });
      // Filter out invalid embeddings
      const finalDocs = documents.filter(d => Array.isArray(d.embedding) && d.embedding.length === 384 && d.embedding[0] !== 0);
      await fs.writeFile(OUTPUT_FILE, JSON.stringify(finalDocs, null, 2));

      console.log(`✅ Ingestion complete! Saved vector database to ${OUTPUT_FILE}`);
    } else {
        console.log("No valid chunks found to embed.");
    }
} catch (err) {
    console.error('Error computing embeddings:', err);
  }
}

main().catch(err => {
  console.error("Uncaught Error:", err);
});
