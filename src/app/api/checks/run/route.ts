import { NextResponse } from 'next/server';
import { runChecksAndCreateIncidents } from '@/lib/agent/store';

export const dynamic = 'force-dynamic';

/** POST /api/checks/run — run all proactive checks, create/dedup incidents. */
export async function POST() {
  const { findings, created } = await runChecksAndCreateIncidents();
  return NextResponse.json({
    findings,
    created: created.length,
    incidents: created,
  });
}
