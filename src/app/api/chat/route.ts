/**
 * @file /api/chat/route.ts
 * @description Architecture Upgrade: Perplexity-style Answer Engine.
 * Integrates Hybrid Search (Tavily live web + Firestore Vector DB).
 * Enforces citation mapping, Pro searches, and model orchestration.
 */
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/hybrid-search';
import { db } from '@/lib/firebase-admin';
import { chatRateLimit } from '@/lib/rate-limiter';
import { badRequest, tooManyRequests } from '@/lib/api-handler';
import { chatRequestSchema } from '@/lib/schemas';
import * as admin from 'firebase-admin';

export const maxDuration = 45; // Increased for Pro web searches
export const dynamic = 'force-dynamic';

type CoreMessage = { role: 'user' | 'assistant' | 'system'; content: string };

export async function POST(req: Request): Promise<Response> {
  // ── 1. Rate limiting ────────────────────────────────────────────────────
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
             req.headers.get('x-real-ip') ?? 'anonymous';

  const rl = chatRateLimit(ip);
  if (!rl.success) return tooManyRequests(rl.resetAt);

  // ── 2. Parse & validate body ─────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch { return badRequest('JSON parse failed'); }

  const parsed = chatRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
    return badRequest(`Validation failed: ${issues}`);
  }

  const { messages, chatId, focusMode, isProSearch, modelConfig } = parsed.data;
  const latestMessage = messages[messages.length - 1];

  // ── 3. Map selected model (Model Agnostic / ROSE abstraction) ───────────
  // Here we use Groq to simulate the ROSE inference engine, offering ultra-fast LPU inference.
  const groqProvider = createOpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  const modelMap: Record<string, string> = {
    'llama-3.1-8b': 'llama-3.1-8b-instant',
    'llama-3.3-70b': 'llama-3.3-70b-versatile',
    'mixtral-8x7b': 'mixtral-8x7b-32768',
    'deepseek-r1': 'deepseek-r1-distill-llama-70b',
  };
  const activeModel = modelMap[modelConfig?.modelName ?? 'llama-3.1-8b'] ?? 'llama-3.1-8b-instant';

  // ── 4. Persist Chat State ──────────────────────────────────────────────────
  let currentChatId = chatId;
  try {
    if (!currentChatId) {
      const chatRef = await db.collection('chats').add({
        title: latestMessage.content.substring(0, 50),
        focusMode,
        isProSearch,
        modelName: modelConfig?.modelName ?? 'llama-3.1-8b',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      currentChatId = chatRef.id;
    } else {
      await db.collection('chats').doc(currentChatId).update({
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await db.collection('chats').doc(currentChatId).collection('messages').add({
      role: 'user',
      content: latestMessage.content,
      createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
    });
  } catch (dbErr) {
    console.warn('[Chat API] Firestore write warning:', dbErr);
  }

  // ── 5. Hybrid Retrieval (Web + Vector DB) ────────────────────────────────
  const { sources, contextString } = await hybridSearch(
    latestMessage.content,
    focusMode,
    isProSearch
  );

  // ── 6. Build the Answer Prompt ───────────────────────────────────────────
  let systemContent = `You are a highly capable answering engine operating as a "digital worker".
You must synthesise information to create a concise, verifiable, and conversational answer.
CRITICAL RULES:
1. You are NOT supposed to say anything that you didn't retrieve.
2. Every claim MUST be backed by an inline citation using the source ID, formatted exactly like: [1] or [1][3].
3. Do not just list links, weave the citations naturally into your prose.
4. If the retrieved context does not contain the answer, explicitly state that you cannot find the information based on the retrieved sources, before attempting to answer from general knowledge (if applicable).
5. If the user asks for a simple conversational task (e.g., "hello"), reply normally.

--- RETRIEVED SOURCES ---
${contextString || 'No context found for this query.'}
-------------------------
End of sources. Now answer the user's latest message comprehensively using ONLY the sources above.`;

  // Writing mode bypasses strict RAG rules for creative freedom
  if (focusMode === 'Writing') {
    systemContent = `You are an expert copywriter, author, and prose editor.
Assist the user with creative writing. Do not use inline citations unless explicitly requested.
Base your style on the best literature and copywriting practices.`;
  }

  const coreMessages: CoreMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  // ── 7. Stream LLM Response ───────────────────────────────────────────────
  const result = streamText({
    model: groqProvider(activeModel),
    messages: coreMessages as NonNullable<Parameters<typeof streamText>[0]['messages']>,
    temperature: modelConfig?.temperature ?? 0.3, // Lower temp for factual RAG
    onFinish: async ({ text }) => {
      if (!currentChatId) return;
      try {
        await db.collection('chats').doc(currentChatId).collection('messages').add({
          role: 'assistant',
          content: text,
          sources,
          createdAt: admin.firestore.FieldValue.serverTimestamp() as FirebaseFirestore.Timestamp,
        });
      } catch (e) {
        console.warn('Failed to save assistant reply:', e);
      }
    },
  });

  const textStream = result.toTextStreamResponse();
  const reader = textStream.body?.getReader();
  if (!reader) return textStream;

  // ── 8. Multiplex Streaming Context ───────────────────────────────────────
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      if (currentChatId) controller.enqueue(encoder.encode(`e:${JSON.stringify({ chatId: currentChatId })}\n`));
      if (sources.length > 0) controller.enqueue(encoder.encode(`s:${JSON.stringify(sources)}\n`));
      
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
