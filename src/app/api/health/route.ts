/**
 * @file /api/health/route.ts
 * @description Health check endpoint for monitoring, uptime robots, and deployment verification.
 * Returns service status for each subsystem (Firebase, environment, rate limiter).
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    firestore: 'ok' | 'error';
    env: 'ok' | 'error';
    llm: 'configured' | 'missing';
  };
}

const startTime = Date.now();

export async function GET(): Promise<Response> {
  const checks = {
    firestore: 'error' as 'ok' | 'error',
    env: 'error' as 'ok' | 'error',
    llm: 'missing' as 'configured' | 'missing',
  };

  // Check Firestore connectivity
  try {
    await db.collection('_health').doc('ping').set({
      ts: new Date().toISOString(),
    });
    checks.firestore = 'ok';
  } catch {
    checks.firestore = 'error';
  }

  // Check required env vars
  checks.env =
    !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !!process.env.CLERK_SECRET_KEY
      ? 'ok'
      : 'error';

  // Check LLM provider key
  checks.llm = process.env.BYTEZ_API_KEY ? 'configured' : 'missing';

  const allOk = checks.firestore === 'ok' && checks.env === 'ok';
  const degraded = !allOk && checks.firestore === 'ok';

  const body: HealthStatus = {
    status: allOk ? 'ok' : degraded ? 'degraded' : 'down',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? '0.1.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    services: checks,
  };

  return NextResponse.json(body, {
    status: allOk ? 200 : degraded ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
