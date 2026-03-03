/**
 * @file vector-store.ts
 * @description Production vector search backed by Firebase Firestore.
 * Embeddings are generated locally with Xenova/all-MiniLM-L6-v2 (384-dim).
 */
import { db } from '@/lib/firebase-admin';
import type { FirestoreEmbedding } from '@/lib/schemas';

export type VectorDoc = {
  id: string;
  filename?: string;
  content: string;
  embedding: number[];
  metadata?: Record<string, string | number | boolean>;
};

export type SearchResult = {
  doc: VectorDoc;
  score: number;
};

/** Cosine similarity between two equal-length vectors */
function cosineSimilarity(A: number[], B: number[]): number {
  if (A.length !== B.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < A.length; i++) {
    dot += A[i] * B[i];
    normA += A[i] * A[i];
    normB += B[i] * B[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Singleton: reuse the extractor pipeline across requests
type Extractor = (text: string, opts: Record<string, unknown>) => Promise<{ data: Float32Array }>;
let extractor: Extractor | null = null;

async function getExtractor(): Promise<Extractor> {
  if (extractor) return extractor;
  console.log('[VectorStore] Loading Xenova/all-MiniLM-L6-v2 embedding model…');
  const { pipeline } = await import('@xenova/transformers');
  extractor = (await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true })) as unknown as Extractor;
  return extractor;
}

/**
 * Perform nearest-neighbour vector search against the Firestore embeddings collection.
 *
 * @param query - Natural language query string
 * @param topK - Number of results to return (default 3)
 * @param limit - Max Firestore docs to load for comparison (default 200)
 */
export async function vectorSearch(
  query: string,
  topK = 3,
  limit = 200
): Promise<SearchResult[]> {
  // ── 1. Fetch documents from Firestore ──────────────────────────────────────
  const documents: VectorDoc[] = [];
  try {
    const snapshot = await db.collection('embeddings').limit(limit).get();
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as FirestoreEmbedding;
      documents.push({
        id: docSnap.id,
        filename: data.filename,
        content: data.content,
        embedding: data.embedding,
        metadata: data.metadata,
      });
    });
  } catch (err) {
    console.error('[VectorStore] Firestore read error:', err);
    return [];
  }

  if (documents.length === 0) return [];

  // ── 2. Generate query embedding ────────────────────────────────────────────
  let queryEmbedding: number[];
  try {
    const embed = await getExtractor();
    const out = await embed(query, { pooling: 'mean', normalize: true });
    queryEmbedding = Array.from(out.data);
  } catch (err) {
    console.error('[VectorStore] Embedding generation error:', err);
    return [];
  }

  // ── 3. Score & rank ────────────────────────────────────────────────────────
  const results: SearchResult[] = documents
    .map((doc) => {
      if (!Array.isArray(doc.embedding) || doc.embedding.length !== 384) {
        return { doc, score: 0 };
      }
      return { doc, score: cosineSimilarity(queryEmbedding, doc.embedding) };
    })
    .filter((r) => r.score > 0.1) // discard irrelevant docs below threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return results;
}
