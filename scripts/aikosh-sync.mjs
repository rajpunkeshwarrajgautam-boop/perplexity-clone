import { pipeline } from '@xenova/transformers';
// Load environment variables
import 'dotenv/config';

const AIKOSH_API_KEY = process.env.AIKOSH_API_KEY;

if (!AIKOSH_API_KEY) {
  console.error("❌ ERROR: Missing AIKOSH_API_KEY in .env file.");
  process.exit(1);
}


/**
 * AIKosh Dataset Ingestion Pipeline
 * 
 * 1. Takes an AIKosh Dataset ID
 * 2. Fetches the Download URL using the AIKosh Datasets API
 * 3. Downloads the JSON/CSV dataset and parses the text rows
 * 4. Pushes the dataset embeddings locally into our RAG Vector Store
 */
async function syncAikoshDataset(datasetId) {
  try {
    console.log(`\n☁️ Triggering AIKosh API sync for dataset: ${datasetId}`);

    // AIKosh Download Endpoint Structure
    // Since AIKosh stores large files (.csv / .json), we request the secure download URL
    const previewUrl = `https://aikosh.indiaai.gov.in/api/datasets/download?datasetIdentifier=${datasetId}&fileIdentifier=0`;
    
    let rawData;
    try {
      console.log(`\n⏳ Requesting Secure Download Link from AIKosh servers...`);
      const res = await fetch(previewUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${AIKOSH_API_KEY}`,
          'Accept': 'application/json'
        }
      });

      if (!res.ok) throw new Error("Status " + res.status);
      const jsonRes = await res.json();
      const downloadUrl = jsonRes.downloadUrl;
      console.log(`✅ Secure Download Link obtained: ${downloadUrl}`);
      
      console.log(`\n⬇️ Downloading Dataset chunks...`);
      const dataRes = await fetch(downloadUrl);
      rawData = await dataRes.text();
    } catch (e) {
      console.log(`⚠️ AIKosh API returned an error (${e.message}).`);
      throw new Error(`Failed to download dataset ${datasetId}. Aborting sync.`);
    }

    console.log(`\n🧠 Booting Local AIKosh -> Xenova Embedding Pipeline...`);
    const generateEmbedding = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const rows = JSON.parse(rawData);
    
    // Instead of local JSON, push to production Firestore Vector store
    console.log(`\n🔄 Pushing ${rows.length} new records directly into production Firestore Vector DB...`);
    
    // Lazy-load Firebase to avoid missing config aborts if user just running for help
    const admin = await import('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
    }
    const db = admin.firestore();

    const batchSize = 100;
    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = db.batch();
        const chunkRows = rows.slice(i, i + batchSize);
        
        for (let j = 0; j < chunkRows.length; j++) {
            const rowIndex = i + j;
            const textContent = chunkRows[j].text || chunkRows[j].content || JSON.stringify(chunkRows[j]);
            const embeddingRecord = await generateEmbedding(textContent, { pooling: 'mean', normalize: true });
            
            const docRef = db.collection('embeddings').doc(`aikosh_${datasetId}_${rowIndex}`);
            batch.set(docRef, {
                content: textContent,
                embedding: Array.from(embeddingRecord.data),
                metadata: { source: `AIKosh Dataset: ${datasetId}`, row: rowIndex }
            });
        }
        
        await batch.commit();
        process.stdout.write(`\rSuccessfully pushed batch of ${chunkRows.length} to Firestore...`);
    }

    console.log(`\n✅ Integration Complete! Ingested AIKosh Dataset into Production Firestore.`);

  } catch (err) {
    console.error(`\n❌ Ingestion Failed: ${err.message}`);
    console.log("\n💡 TIPS: Verify your AIKOSH_API_KEY scopes on aikosh.indiaai.gov.in and ensure you have passed a valid datasetIdentifier string.");
  }
}

// Check for dataset ID in terminal args or show help
const targetDataset = process.argv[2];
if (!targetDataset) {
    console.log("\n⚠️ Usage: node scripts/aikosh-sync.mjs <DATASET_ID>");
    console.log("Example: node scripts/aikosh-sync.mjs ind-agri-faqs-v1\n");
    process.exit(1);
}

syncAikoshDataset(targetDataset);
