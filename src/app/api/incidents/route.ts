import { NextRequest, NextResponse } from 'next/server';
import { listIncidents, type IncidentFilter } from '@/lib/agent/store';
import type { Category, IncidentStatus, Severity } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** GET /api/incidents?status=&severity=&category= — list incidents. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const filter: IncidentFilter = {};
  const status = searchParams.get('status');
  const severity = searchParams.get('severity');
  const category = searchParams.get('category');
  if (status) filter.status = status as IncidentStatus;
  if (severity) filter.severity = severity as Severity;
  if (category) filter.category = category as Category;

  const incidents = await listIncidents(filter);
  return NextResponse.json({ count: incidents.length, incidents });
}
