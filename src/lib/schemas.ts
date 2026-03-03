/**
 * @file schemas.ts
 * @description Zod schemas for all API request/response payloads.
 * Single source of truth for validation across all routes.
 */
import { z } from 'zod';

// ─── Shared ────────────────────────────────────────────────────────────────

export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1, 'Message content cannot be empty').max(32_000),
});

export type MessageInput = z.infer<typeof messageSchema>;

// ─── /api/chat ─────────────────────────────────────────────────────────────

export const chatRequestSchema = z.object({
  messages: z
    .array(messageSchema)
    .min(1, 'At least one message is required')
    .max(100, 'Too many messages in context'),
  chatId: z.string().optional(),
  focusMode: z.enum(['All', 'Academic', 'Writing', 'Web']).default('All'),
  isProSearch: z.boolean().default(false),
  modelConfig: z.object({
    temperature: z.number().min(0).max(1).default(0.4),
    modelName: z.enum(['sonar', 'gpt-4o', 'claude-3-5-sonnet', 'grok-2']).default('sonar'),
  }).optional(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

// ─── /api/tts ──────────────────────────────────────────────────────────────

export const ttsRequestSchema = z.object({
  text: z
    .string()
    .min(1, 'Text is required')
    .max(4_000, 'Text is too long for TTS (max 4000 characters)'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  speed: z.number().min(0.25).max(4.0).default(1.0),
});

export type TtsRequest = z.infer<typeof ttsRequestSchema>;

// ─── Firestore Document Types ───────────────────────────────────────────────

/** Shape of a chat document in Firestore */
export interface FirestoreChat {
  id?: string;
  title: string;
  userId?: string;
  focusMode?: string;
  createdAt: FirebaseFirestore.Timestamp | null;
  updatedAt: FirebaseFirestore.Timestamp | null;
}

/** Shape of a message document in Firestore */
export interface FirestoreMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources?: FirestoreSource[];
  createdAt: FirebaseFirestore.Timestamp | null;
}

/** Shape of a source reference embedded in a message */
export interface FirestoreSource {
  id: number;
  title: string;
  relevance: string;
  domain?: string;
  url?: string;
  favicon?: string;
  snippet?: string;
  isWeb?: boolean;
}

/** Shape of an embedding document in Firestore */
export interface FirestoreEmbedding {
  id?: string;
  content: string;
  embedding: number[];
  filename?: string;
  metadata?: Record<string, string | number | boolean>;
}
