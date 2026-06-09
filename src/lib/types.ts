export interface TransferEvent {
  event_id: string;
  source: string;
  timestamp: string;
  transfer_id: string;
  status: 'success' | 'failed' | 'in_progress' | 'pending';
  file_name: string;
  file_size_bytes: number;
  duration_ms: number;
  protocol: 'SFTP' | 'FTPS' | 'HTTPS' | 'AS2';
  source_host: string;
  target_folder: string;
  account: string;
  error_code?: string;
  error_message?: string;
  node: string;
  cluster: string;
}

export interface CorrelatedIncident {
  incident_id: string;
  opened_at: string;
  state: 'new' | 'in_progress' | 'resolved' | 'closed' | 'on_hold';
  assigned_to: string;
  assignment_group: string;
  category: string;
  impact: 1 | 2 | 3;
  urgency: 1 | 2 | 3;
  related_transfers: string[];
  ci_name: string;
  severity: 'critical' | 'warning' | 'info' | 'maintenance';
}

export interface NodeHealth {
  node: string;
  cluster: string;
  status: 'healthy' | 'degraded' | 'critical' | 'maintenance';
  cpu_percent: number;
  memory_percent: number;
  disk_percent: number;
  queue_depth: number;
  cert_expiry_days: number;
  last_seen: string;
}

export interface AnomalyScore {
  account: string;
  node: string;
  timestamp: string;
  score: number;
  threshold: number;
  is_anomaly: boolean;
  metric: 'failure_rate' | 'latency_p99' | 'error_distribution';
  value: number;
  baseline: number;
}

export interface FailurePrediction {
  node: string;
  cluster: string;
  timestamp: string;
  probability: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    value: number;
    weight: number;
  }[];
  predicted_within_minutes: number;
}

export interface BaselineData {
  timestamp: string;
  actual_throughput: number;
  predicted_lower: number;
  predicted_upper: number;
  expected_throughput: number;
}

export interface RootCauseCandidate {
  cause: string;
  score: number;
  evidence: string[];
  category: 'certificate' | 'network' | 'configuration' | 'capacity' | 'external';
}

export interface Alert {
  id: string;
  timestamp: string;
  severity: 'critical' | 'warning' | 'info' | 'maintenance';
  title: string;
  description: string;
  source: 'axway_st' | 'servicenow' | 'ml_model' | 'runbook';
  acknowledged: boolean;
  related_transfers?: string[];
  incident_id?: string;
}

export interface MetricCard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  status: 'good' | 'warning' | 'critical';
  icon: string;
}

export interface ErrorCodeDistribution {
  code: string;
  count: number;
  description: string;
}

export interface AccountHealth {
  account: string;
  total_transfers: number;
  success_rate: number;
  avg_latency_ms: number;
  anomaly_score: number;
  status: 'healthy' | 'degraded' | 'critical';
}

// ── Agentic incident engine ────────────────────────────────────────────────

/** P1 (highest) → P4 (lowest). */
export type Severity = 'P1' | 'P2' | 'P3' | 'P4';

/** Incident category taxonomy — maps Axway error domains to RCA mock keys. */
export type Category =
  | 'SFTP_KEY'
  | 'SFTP_AUTH'
  | 'TLS_CERT'
  | 'TLS_HANDSHAKE'
  | 'AS2_MDN'
  | 'AS2_ENCRYPT'
  | 'NETWORK'
  | 'JVM'
  | 'DISK'
  | 'QUEUE'
  | 'PARTNER_SILENCE'
  | 'COMPLIANCE'
  | 'UNKNOWN';

export type IncidentStatus =
  | 'NEW'
  | 'ANALYZING'
  | 'REMEDIATING'
  | 'RESOLVED'
  | 'ESCALATED';

/** A single output of a proactive check. Becomes an Incident if not deduped. */
export interface Finding {
  check_name: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  partner_id?: string;
  partner_name?: string;
  protocol?: string;
  raw_data: Record<string, unknown>;
  /** Stable dedup key: md5(check:category:partner)[:16]. */
  fingerprint: string;
}

/** Structured root-cause analysis returned by the LLM (or its mock). */
export interface IncidentAnalysis {
  root_cause: string;
  evidence: string;
  confidence: number; // 0-100
  severity: Severity;
  fix_steps: string[];
  auto_fixable: boolean;
  auto_fix_action: string | null;
  estimated_fix_minutes: number;
  safety_notes: string;
  escalate_if: string;
}

/** A tracked incident with lifecycle state and optional attached RCA. */
export interface Incident {
  id: string;
  incident_number: string;
  category: Category;
  severity: Severity;
  status: IncidentStatus;
  partner_id?: string;
  partner_name?: string;
  protocol?: string;
  title: string;
  description: string;
  source_check: string;
  fingerprint: string;
  created_at: string;
  resolved_at?: string;
  // Attached after analysis:
  root_cause?: string;
  evidence?: string;
  confidence?: number;
  fix_steps?: string[];
  auto_fixable?: boolean;
  auto_fix_action?: string | null;
  estimated_fix_minutes?: number;
  safety_notes?: string;
  escalate_if?: string;
  resolution_notes?: string;
  raw_data?: Record<string, unknown>;
}

export interface RemediationResult {
  success: boolean;
  status: 'OK' | 'SKIPPED' | 'ERROR' | 'ESCALATED';
  action?: string;
  message: string;
}

export interface ChatResponse {
  answer: string;
  sources: string[];
  follow_up_suggestions: string[];
}

// ── Mock Axway data providers (inputs to the checks) ────────────────────────

export interface AxwayCertificate {
  partner_id?: string;
  partner_name?: string;
  common_name: string;
  issuer: string;
  algorithm: string;
  key_size: number;
  days_until_expiry: number;
}

export interface AxwaySshKey {
  partner_id?: string;
  partner_name?: string;
  fingerprint: string;
  key_type: 'RSA' | 'DSA' | 'ECDSA' | 'ED25519';
  key_size: number;
  weak?: boolean;
  age_days: number;
}

export interface AxwayQueue {
  partner_id?: string;
  partner_name?: string;
  depth: number;
  oldest_item_minutes: number;
}

export interface AxwayPartner {
  id: string;
  name: string;
  protocol: string;
  active: boolean;
  expected_transfer_interval_hours?: number;
  /** Hours since last successful transfer; undefined ⇒ unknown. */
  hours_since_last_transfer?: number;
}

export interface JvmMetrics {
  heap_pct: number;
  heap_used_mb: number;
  heap_max_mb: number;
  gc_collections_per_hour: number;
  gc_pause_avg_ms: number;
}

export interface DiskMetrics {
  path: string;
  used_pct: number;
  used_gb: number;
  total_gb: number;
}

export interface AxwayTransfer {
  transfer_id: string;
  partner_id: string;
  partner_name: string;
  protocol: string;
  status: 'SUCCESS' | 'FAILED' | 'IN_PROGRESS';
  error_code?: string;
  error_message?: string;
}