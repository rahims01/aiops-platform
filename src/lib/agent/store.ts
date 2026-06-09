/**
 * In-memory incident store with fingerprint deduplication and lifecycle.
 *
 * This is a prototype persistence layer: a module-level singleton kept on
 * globalThis so it survives Next.js dev HMR reloads. In production this would be
 * backed by a database (the original reference service used SQLAlchemy/SQLite).
 *
 * Server-only module.
 */

import { runAllChecks } from './checks';
import type {
  Category,
  Finding,
  Incident,
  IncidentStatus,
  Severity,
} from '../types';

interface StoreState {
  incidents: Map<string, Incident>;
  seeded: boolean;
  seq: number;
}

const OPEN_STATUSES: IncidentStatus[] = ['NEW', 'ANALYZING', 'REMEDIATING'];

// Persist across HMR in dev.
const globalForStore = globalThis as unknown as { __incidentStore?: StoreState };

function getState(): StoreState {
  if (!globalForStore.__incidentStore) {
    globalForStore.__incidentStore = { incidents: new Map(), seeded: false, seq: 0 };
  }
  return globalForStore.__incidentStore;
}

function nextIncidentNumber(state: StoreState): string {
  state.seq += 1;
  const now = new Date();
  const stamp =
    now.getUTCFullYear().toString() +
    String(now.getUTCMonth() + 1).padStart(2, '0') +
    String(now.getUTCDate()).padStart(2, '0');
  return `INC-${stamp}-${String(state.seq).padStart(4, '0')}`;
}

function newId(): string {
  return 'inc_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Create an incident from a finding unless an open one with the same fingerprint exists. */
function createFromFinding(state: StoreState, finding: Finding): Incident | null {
  for (const existing of state.incidents.values()) {
    if (existing.fingerprint === finding.fingerprint && OPEN_STATUSES.includes(existing.status)) {
      return null; // duplicate of an already-open incident
    }
  }

  const incident: Incident = {
    id: newId(),
    incident_number: nextIncidentNumber(state),
    category: finding.category,
    severity: finding.severity,
    status: 'NEW',
    partner_id: finding.partner_id,
    partner_name: finding.partner_name,
    protocol: finding.protocol,
    title: finding.title,
    description: finding.description,
    source_check: finding.check_name,
    fingerprint: finding.fingerprint,
    created_at: new Date().toISOString(),
    raw_data: finding.raw_data,
  };
  state.incidents.set(incident.id, incident);
  return incident;
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Run all proactive checks and persist new findings as incidents (deduped). */
export async function runChecksAndCreateIncidents(): Promise<{
  findings: number;
  created: Incident[];
}> {
  const state = getState();
  const findings = await runAllChecks();
  const created: Incident[] = [];
  for (const finding of findings) {
    const incident = createFromFinding(state, finding);
    if (incident) created.push(incident);
  }
  return { findings: findings.length, created };
}

/** Seed the store on first use so the dashboard has data without a manual run. */
export async function ensureSeeded(): Promise<void> {
  const state = getState();
  if (state.seeded) return;
  state.seeded = true;
  await runChecksAndCreateIncidents();
}

export interface IncidentFilter {
  status?: IncidentStatus;
  severity?: Severity;
  category?: Category;
}

export async function listIncidents(filter: IncidentFilter = {}): Promise<Incident[]> {
  await ensureSeeded();
  const state = getState();
  let items = [...state.incidents.values()];
  if (filter.status) items = items.filter((i) => i.status === filter.status);
  if (filter.severity) items = items.filter((i) => i.severity === filter.severity);
  if (filter.category) items = items.filter((i) => i.category === filter.category);
  // Newest first.
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getIncident(id: string): Promise<Incident | null> {
  await ensureSeeded();
  return getState().incidents.get(id) ?? null;
}

export function updateIncident(id: string, patch: Partial<Incident>): Incident | null {
  const state = getState();
  const incident = state.incidents.get(id);
  if (!incident) return null;
  const updated = { ...incident, ...patch, id: incident.id };
  state.incidents.set(id, updated);
  return updated;
}

export function deleteIncident(id: string): boolean {
  return getState().incidents.delete(id);
}

/** Insert an incident directly (e.g. from a webhook), deduped by fingerprint. */
export function ingestFinding(finding: Finding): Incident | null {
  return createFromFinding(getState(), finding);
}

export interface IncidentStats {
  total: number;
  open: number;
  resolved: number;
  by_severity: Record<Severity, number>;
  by_category: Partial<Record<Category, number>>;
  by_status: Record<IncidentStatus, number>;
}

export async function getStats(): Promise<IncidentStats> {
  const items = await listIncidents();
  const bySeverity: Record<Severity, number> = { P1: 0, P2: 0, P3: 0, P4: 0 };
  const byStatus: Record<IncidentStatus, number> = {
    NEW: 0,
    ANALYZING: 0,
    REMEDIATING: 0,
    RESOLVED: 0,
    ESCALATED: 0,
  };
  const byCategory: Partial<Record<Category, number>> = {};
  let open = 0;
  let resolved = 0;

  for (const i of items) {
    bySeverity[i.severity] += 1;
    byStatus[i.status] += 1;
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
    if (OPEN_STATUSES.includes(i.status)) open += 1;
    if (i.status === 'RESOLVED') resolved += 1;
  }

  return {
    total: items.length,
    open,
    resolved,
    by_severity: bySeverity,
    by_category: byCategory,
    by_status: byStatus,
  };
}
