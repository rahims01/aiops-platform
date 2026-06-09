import { NextRequest, NextResponse } from 'next/server';
import { analyzeAndAttach } from '@/lib/agent/agent';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** POST /api/incidents/[id]/analyze — run LLM root-cause analysis. */
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const incident = await analyzeAndAttach(id);
  if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  return NextResponse.json(incident);
}
