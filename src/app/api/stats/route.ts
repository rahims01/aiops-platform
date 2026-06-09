import { NextResponse } from 'next/server';
import { getStats } from '@/lib/agent/store';

export const dynamic = 'force-dynamic';

/** GET /api/stats — incident counts by severity / category / status. */
export async function GET() {
  const stats = await getStats();
  return NextResponse.json(stats);
}
