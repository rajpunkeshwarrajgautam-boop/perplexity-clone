/**
 * @file /api/chat/route.ts
 * @description Production-grade RAG chat streaming endpoint.
 * Features: Zod validation, rate limiting, Firebase persistence, vector search.
 */
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { vectorSearch } from '@/lib/vector-store';
import { db } from '@/lib/firebase-admin';
import { chatRateLimit } from '@/lib/rate-limiter';
import { badRequest, tooManyRequests } from '@/lib/api-handler';
import { chatRequestSchema, type FirestoreMessage, type FirestoreSource } from '@/lib/schemas';
import * as admin from 'firebase-admin';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

type CoreMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function POST(req: Request): Promise<Response> {
  // ── 1. Rate limiting ────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous';

  const rl = chatRateLimit(ip);
  if (!rl.success) return tooManyRequests(rl.resetAt);

  // ── 2. Parse & validate body ─────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    return badRequest(`Validation error — ${issues}`);
  }

  const { messages, chatId, focusMode } = parsed.data;
  const latestMessage = messages[messages.length - 1];

  // ── 3. Initialise OpenAI-compatible provider ──────────────────────────────
  const bytezProvider = createOpenAI({
    apiKey: process.env.BYTEZ_API_KEY,
    baseURL: 'https://api.bytez.com/v1',
  });

  // ── 4. Persist / retrieve chat in Firestore ───────────────────────────────
  let currentChatId = chatId;

  try {
    if (!currentChatId) {
      const chatRef = await db.collection('chats').add({
        title: latestMessage.content.substring(0, 60),
        focusMode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      currentChatId = chatRef.id;
    } else {
      await db.collection('chats').doc(currentChatId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    const userMsg: FirestoreMessage = {
      role: 'user',
      content: latestMessage.content,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    };
    await db
      .collection('chats')
      .doc(currentChatId)
      .collection('messages')
      .add(userMsg);
  } catch (dbErr) {
    console.error('[Chat API] Firestore write error:', dbErr);
  }

  // ── 5. Vector search ──────────────────────────────────────────────────────
  const sourcesData: FirestoreSource[] = [];
  let contextString = '';

  try {
    const searchResults = await vectorSearch(latestMessage.content, 4);
    searchResults.forEach((res, index) => {
      const title =
        res.doc.filename?.replace('.pdf', '') ??
        (res.doc.metadata?.['source'] as string | undefined) ??
        'Source';
      sourcesData.push({ id: index + 1, title, relevance: (res.score * 100).toFixed(0) });
      contextString += `[Source ${index + 1}: ${title}]\n${res.doc.content}\n\n`;
    });
  } catch (vsErr) {
    console.error('[Chat API] Vector search error:', vsErr);
  }

  // ── 6. Build prompt ───────────────────────────────────────────────────────
  const systemContent =
    'You are a highly accurate, concise AI research assistant similar to Perplexity. ' +
    'Always prioritise the provided context when answering. ' +
    'If the context is insufficient, say so clearly, then answer from general knowledge. ' +
    'Format all responses with Markdown (headings, bold, bullet points) for readability.\n\n' +
    (contextString ? `--- Retrieved Context ---\n${contextString}` : '');

  const coreMessages: CoreMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // ── 7. Stream response ────────────────────────────────────────────────────
  const result = streamText({
    model: bytezProvider('gpt-4o-mini'),
    messages: coreMessages as NonNullable<Parameters<typeof streamText>[0]['messages']>,
    temperature: 0.4,
    onFinish: async ({ text }) => {
      if (!currentChatId) return;
      try {
        const aiMsg: FirestoreMessage = {
          role: 'assistant',
          content: text,
          sources: sourcesData,
          createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
        };
        await db.collection('chats').doc(currentChatId).collection('messages').add(aiMsg);
      } catch (dbErr) {
        console.error('[Chat API] Firestore assistant write error:', dbErr);
      }
    },
  });

  const textStream = result.toTextStreamResponse();
  const reader = textStream.body?.getReader();
  if (!reader) return textStream;

  // ── 8. Inject metadata then pipe the LLM stream ──────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(`e:${JSON.stringify({ chatId: currentChatId })}\n`));

      if (sourcesData.length > 0) {
        controller.enqueue(encoder.encode(`s:${JSON.stringify(sourcesData)}\n`));
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        controller.enqueue(value);
      }
      controller.close();
    },
    cancel() { reader.cancel(); },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-RateLimit-Remaining': String(rl.remaining),
      'Cache-Control': 'no-store',
    },
  });
}

export async function OPTIONS(): Promise<Response> {
  return NextResponse.json(null, { status: 204, headers: { Allow: 'POST, OPTIONS' } });
}
