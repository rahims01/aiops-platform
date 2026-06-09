import { NextRequest, NextResponse } from 'next/server';
import { getIncident, updateIncident, deleteIncident } from '@/lib/agent/store';
import type { Incident } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ id: string }> };

/** GET /api/incidents/[id] — incident detail. */
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  return NextResponse.json(incident);
}

/** PATCH /api/incidents/[id] — update status / resolution_notes. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getIncident(id);
  if (!existing) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });

  const body = (await req.json()) as Partial<Incident>;
  const patch: Partial<Incident> = {};
  if (body.status) patch.status = body.status;
  if (body.resolution_notes !== undefined) patch.resolution_notes = body.resolution_notes;
  if (body.severity) patch.severity = body.severity;
  if (body.status === 'RESOLVED' && !existing.resolved_at) {
    patch.resolved_at = new Date().toISOString();
  }

  const updated = updateIncident(id, patch);
  return NextResponse.json(updated);
}

/** DELETE /api/incidents/[id] — mark resolved (soft) and remove from the store. */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const existing = await getIncident(id);
  if (!existing) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
  deleteIncident(id);
  return NextResponse.json({ deleted: true, id });
}
