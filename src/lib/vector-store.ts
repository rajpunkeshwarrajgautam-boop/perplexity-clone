import fs from 'fs/promises';
import path from 'path';
import { embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const bytezProvider = createOpenAI({
  apiKey: process.env.BYTEZ_API_KEY,
  baseURL: 'https://api.bytez.com/v1'
});

export type VectorDoc = {
  id: number;
  filename: string;
  content: string;
  embedding: number[];
}

export type SearchResult = {
  doc: VectorDoc;
  score: number;
}

const VECTOR_STORE_PATH = path.join(process.cwd(), 'data/vector_store.json');

let store: VectorDoc[] | null = null;

export async function loadVectorStore() {
  if (store) return store;
  try {
    const data = await fs.readFile(VECTOR_STORE_PATH, 'utf-8');
    store = JSON.parse(data);
    return store;
  } catch (err) {
    console.log('Error loading vector store or it does not exist.', err);
    return [];
  }
}

function cosineSimilarity(A: number[], B: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < A.length; i++) {
    dotProduct += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

let extractor: any = null;

export async function vectorSearch(query: string, topK: number = 3): Promise<SearchResult[]> {
  const documents = await loadVectorStore();
  if (!documents || documents.length === 0) return [];

  // Create embedding for query using local Transformer model
  if (!extractor) {
      console.log("Loading local Xenova embedding model in vectorSearch...");
      const { pipeline } = await import('@xenova/transformers');
      extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  }

  const out = await extractor(query, { pooling: 'mean', normalize: true });
  const queryEmbedding = Array.from(out.data) as number[];

  // Calculate similarity scores for all docs
  const results: SearchResult[] = documents.map(doc => {
      // Validate embedding
      if (!Array.isArray(doc.embedding) || doc.embedding.length !== 384) {
          return { doc, score: 0 };
      }
      return {
        doc,
        score: cosineSimilarity(queryEmbedding, doc.embedding)
      };
  });

  // Sort by highest score first and take topK
  return results.sort((a, b) => b.score - a.score).slice(0, topK);
}
