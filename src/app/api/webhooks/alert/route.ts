import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ingestFinding } from '@/lib/agent/store';
import { analyzeAndAttach } from '@/lib/agent/agent';
import type { Category, Finding, Severity } from '@/lib/types';

export const dynamic = 'force-dynamic';

interface AlertWebhook {
  source?: string; // datadog | pagerduty | splunk | ...
  severity?: Severity;
  category?: Category;
  title: string;
  description?: string;
  partner_id?: string;
  partner_name?: string;
  protocol?: string;
  auto_analyze?: boolean;
}

/** POST /api/webhooks/alert — ingest an external alert as a deduped incident. */
export async function POST(req: NextRequest) {
  const body = (await req.json()) as AlertWebhook;
  if (!body?.title) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const checkName = `webhook:${body.source ?? 'external'}`;
  const category: Category = body.category ?? 'UNKNOWN';
  const key = `${checkName}:${category}:${body.partner_id ?? 'global'}`;
  const fingerprint = createHash('md5').update(key).digest('hex').slice(0, 16);

  const finding: Finding = {
    check_name: checkName,
    category,
    severity: body.severity ?? 'P3',
    title: body.title,
    description: body.description ?? `External alert from ${body.source ?? 'unknown source'}.`,
    partner_id: body.partner_id,
    partner_name: body.partner_name,
    protocol: body.protocol,
    raw_data: { ...body },
    fingerprint,
  };

  const incident = ingestFinding(finding);
  if (!incident) {
    return NextResponse.json({ deduplicated: true, message: 'An open incident with this fingerprint already exists.' });
  }

  // Optionally kick off analysis immediately (default on).
  if (body.auto_analyze !== false) {
    await analyzeAndAttach(incident.id);
  }

  return NextResponse.json({ created: true, incident_id: incident.id, incident_number: incident.incident_number });
}
