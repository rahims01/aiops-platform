import { NextRequest, NextResponse } from 'next/server';
import { attemptAutoFix } from '@/lib/agent/agent';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** POST /api/incidents/[id]/fix — confidence-gated automated remediation. */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const outcome = await attemptAutoFix(id);
  if (outcome.status === 'ERROR' && outcome.message === 'Incident not found') {
    return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  }
  return NextResponse.json(outcome);
}
