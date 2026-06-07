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