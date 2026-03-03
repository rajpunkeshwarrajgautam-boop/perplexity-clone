/**
 * @file api-handler.ts
 * @description Centralized async API route wrapper.
 * Catches unhandled errors, logs them server-side, and returns structured JSON errors.
 */
import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export interface ApiError {
  error: string;
  code: string;
  details?: unknown;
}

/**
 * Wraps a Next.js API route handler with:
 * - Automatic error catching & logging
 * - Structured JSON error responses
 * - Zod validation error formatting
 *
 * @example
 * export const POST = apiHandler(async (req) => {
 *   const body = await req.json();
 *   return NextResponse.json({ ok: true });
 * });
 */
export function apiHandler(
  fn: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await fn(req);
    } catch (err) {
      // Structured Zod validation errors
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          field: i.path.join('.'),
          message: i.message,
        }));
        return NextResponse.json<ApiError>(
          { error: 'Validation failed', code: 'VALIDATION_ERROR', details },
          { status: 422 }
        );
      }

      // Known application errors (thrown with a message)
      if (err instanceof Error) {
        console.error(`[API Error] ${req.method} ${req.url}:`, err.message);
        // Don't expose internal details in production
        const message =
          process.env.NODE_ENV === 'development'
            ? err.message
            : 'An internal server error occurred.';
        return NextResponse.json<ApiError>(
          { error: message, code: 'INTERNAL_ERROR' },
          { status: 500 }
        );
      }

      // Unknown throw
      console.error('[API Error] Unknown error:', err);
      return NextResponse.json<ApiError>(
        { error: 'An unexpected error occurred.', code: 'UNKNOWN_ERROR' },
        { status: 500 }
      );
    }
  };
}

/** Helper: return a 400 Bad Request response */
export const badRequest = (message: string) =>
  NextResponse.json<ApiError>({ error: message, code: 'BAD_REQUEST' }, { status: 400 });

/** Helper: return a 401 Unauthorized response */
export const unauthorized = (message = 'Unauthorized') =>
  NextResponse.json<ApiError>({ error: message, code: 'UNAUTHORIZED' }, { status: 401 });

/** Helper: return a 429 Too Many Requests response */
export const tooManyRequests = (resetAt: number) =>
  NextResponse.json<ApiError>(
    { error: 'Rate limit exceeded. Please wait before retrying.', code: 'RATE_LIMITED' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(resetAt),
      },
    }
  );
