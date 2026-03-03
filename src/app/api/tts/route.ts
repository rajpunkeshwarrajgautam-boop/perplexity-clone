/**
 * @file /api/tts/route.ts
 * @description Production-grade Text-to-Speech endpoint via Bytez (OpenAI-compatible).
 * Features: Zod validation, rate limiting, sanitised input, proper audio streaming.
 */
import { NextResponse } from 'next/server';
import { ttsRequestSchema } from '@/lib/schemas';
import { ttsRateLimit } from '@/lib/rate-limiter';
import { badRequest, tooManyRequests } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

/** Strip markdown syntax before sending to TTS to avoid reading symbols aloud */
function sanitiseForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks entirely
    .replace(/`[^`]+`/g, '')         // remove inline code
    .replace(/[*_#>~\[\]|]/g, '')    // remove markdown symbols
    .replace(/\bhttps?:\/\/\S+/g, '') // remove URLs
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000);             // enforce Zod limit redundantly
}

export async function POST(req: Request): Promise<Response> {
  // ── 1. Rate limiting ───────────────────────────────────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous';

  const rl = ttsRateLimit(ip);
  if (!rl.success) return tooManyRequests(rl.resetAt);

  // ── 2. Parse & validate body ───────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest('Request body must be valid JSON.');
  }

  const parsed = ttsRequestSchema.safeParse(body);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join('.')}: ${i.message}`)
      .join(', ');
    return badRequest(`Validation error — ${issues}`);
  }

  const { voice, speed } = parsed.data;
  const cleanText = sanitiseForSpeech(parsed.data.text);

  if (!cleanText) {
    return badRequest('After sanitisation, the text was empty. Please provide readable prose.');
  }

  // ── 3. Call Bytez TTS API ─────────────────────────────────────────────────
  let ttsResponse: Response;
  try {
    ttsResponse = await fetch('https://api.bytez.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.BYTEZ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: cleanText,
        voice,
        speed,
        response_format: 'mp3',
      }),
    });
  } catch (networkErr) {
    console.error('[TTS API] Network error calling Bytez:', networkErr);
    return NextResponse.json(
      { error: 'TTS service is temporarily unavailable.', code: 'TTS_UNAVAILABLE' },
      { status: 503 }
    );
  }

  if (!ttsResponse.ok) {
    const errBody = await ttsResponse.text().catch(() => 'unknown');
    console.error(`[TTS API] Bytez error ${ttsResponse.status}:`, errBody);
    return NextResponse.json(
      { error: 'TTS provider returned an error.', code: 'TTS_PROVIDER_ERROR' },
      { status: ttsResponse.status >= 500 ? 502 : ttsResponse.status }
    );
  }

  // ── 4. Stream audio back to client ────────────────────────────────────────
  const audioBuffer = await ttsResponse.arrayBuffer();

  return new Response(audioBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(audioBuffer.byteLength),
      'Cache-Control': 'private, max-age=3600', // cache audio for 1 hour in browser
      'X-RateLimit-Remaining': String(rl.remaining),
    },
  });
}

export async function OPTIONS() {
  return NextResponse.json(null, {
    status: 204,
    headers: { Allow: 'POST, OPTIONS' },
  });
}
