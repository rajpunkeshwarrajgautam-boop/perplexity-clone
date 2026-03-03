/**
 * @file env-validation.ts
 * @description Validates critical environment variables at startup using Zod.
 * Throws a descriptive error immediately if any required var is missing.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(10, 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required'),
  CLERK_SECRET_KEY: z.string().min(10, 'CLERK_SECRET_KEY is required'),

  // Bytez / OpenAI-compatible
  BYTEZ_API_KEY: z.string().min(5, 'BYTEZ_API_KEY is required'),

  // Firebase — optional during build, required at runtime for DB operations
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().email().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),

  // Node
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Returns validated environment variables.
 * Safe to call multiple times — result is cached.
 * Throws with a clear message if validation fails.
 */
export function getValidatedEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`❌ Missing / invalid environment variables:\n${issues}`);
  }

  cachedEnv = result.data;
  return cachedEnv;
}
