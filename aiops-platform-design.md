# AIOps Platform for Axway SecureTransport

## Overview

Design an AIOps platform that monitors Axway SecureTransport (ST) file transfer infrastructure, correlates events with ServiceNow incidents, and uses ML-driven analytics to predict failures, reduce MTTR, and automate remediation.

---

## Data Sources

### Axway ST API

| Endpoint | Purpose | Polling |
|---|---|---|
| `/api/v1.0/transfers` | File transfer records (status, size, duration, source/target) | Every 60s |
| `/api/v1.0/steams` | Server/application logs and metrics | Every 60s |
| `/api/v1.0/accounts` | User and partner account state | Every 5min |
| `/api/v1.0/health` | Node health, disk, queue depth, certificates | Every 30s |
| `/api/v1.0/performance` | Throughput, latency, error rates | Every 60s |

Authentication: Basic Auth or OAuth2 (bearer token). Prefer OAuth2 with short-lived tokens.

### ServiceNow API

| Table | Purpose | Polling |
|---|---|---|
| `incident` | Active and resolved incidents | Every 2min |
| `change_request` | Planned maintenance / changes | Every 5min |
| `problem` | Root-cause problem records | Every 5min |
| `cmdb_ci` | Axway ST CI configuration items | Daily sync |

Authentication: Basic Auth (user/password) or OAuth2 with `X-UserToken`.

---

## Architecture

```
┌──────────────┐    ┌──────────────┐
│  Axway ST    │    │  ServiceNow  │
│  API Layer   │    │  API Layer   │
└──────┬───────┘    └──────┬───────┘
       │                   │
       ▼                   ▼
┌──────────────────────────────────────┐
│         Data Ingestion Layer         │
│  - Collectors (ST metrics, events)   │
│  - Webhooks (real-time alerts)       │
│  - ServiceNow poller                 │
│  - Message queue (Kafka / RabbitMQ)  │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Processing / Enrichment      │
│  - Normalize & dedup events          │
│  - Correlate ST failures ↔ SNOW     │
│  - Enrich with CMDB context          │
│  - Windowed aggregations             │
└──────────────┬───────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────────────┐
│   Storage    │ │   ML / Analytics     │
│ - TSDB       │ │ - Anomaly detection  │
│ - ES / OP    │ │ - Failure prediction │
│ - RDBMS      │ │ - Root-cause score   │
│ - S3/blob    │ │ - Baseline modeling  │
└──────┬───────┘ └──────────┬───────────┘
       │                    │
       ▼                    ▼
┌──────────────────────────────────────┐
│         AIOps Engine                 │
│  - Policy engine (alert rules)       │
│  - Incident auto-creation (SNOW)     │
│  - Runbook automation                │
│  - Pager / Slack / Teams routing     │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│         Visualization / UI           │
│  - Grafana dashboards                │
│  - ST health overview                │
│  - Incident timeline                 │
│  - ML model insights                 │
│  - SLO / SLA tracking                │
└──────────────────────────────────────┘
```

### Component Stack (recommended)

| Layer | Tool | Reason |
|---|---|---|
| Message queue | Kafka | Durability, replay, partitioning |
| Stream processing | Flink or Kafka Streams | Windowed joins, enrichment |
| TSDB | VictoriaMetrics or Prometheus | Lightweight, PromQL, long-term |
| Search / log analytics | OpenSearch | Free-text log search, aggregations |
| ML engine | MLflow + custom Python | Model training, serving, drift monitoring |
| Alerting | Grafana Alerting + Alertmanager | Multi-channel, silences, dedup |
| Automation | Custom Python workers + webhooks | Runbook execution, SNOW auto-update |
| Dashboard | Grafana | Rich visualization, PromQL, alerting |

---

## Data Model

### Normalized Transfer Event (canonical JSON)

```json
{
  "event_id": "st-ev-20260606-abc123",
  "source": "axway_securetransport",
  "timestamp": "2026-06-06T14:30:00Z",
  "transfer_id": "tr-98765",
  "status": "failed",
  "file_name": "inbound/payments_20260606.csv",
  "file_size_bytes": 1458203,
  "duration_ms": 34000,
  "protocol": "SFTP",
  "source_host": "partner-bank-01.external.com",
  "target_folder": "/inbound/payments/",
  "account": "partner_bank_inc",
  "error_code": "ST-ERR-4032",
  "error_message": "SSH key authentication failed",
  "node": "st-node-03.prod",
  "cluster": "prod-us-east"
}
```

### Correlated Incident (after SNOW enrichment)

```json
{
  "incident_id": "INC0012345",
  "opened_at": "2026-06-06T14:31:00Z",
  "state": "in_progress",
  "assigned_to": "jane.doe",
  "assignment_group": "MFT Support",
  "category": "File Transfer Failure",
  "impact": 2,
  "urgency": 2,
  "related_transfers": ["tr-98765", "tr-98764"],
  "ci_name": "axway-st-prod-eus-03"
}
```

---

## AI/ML Use Cases

### 1. Anomaly Detection — Transfer Failures

- **Input**: Transfer success rate, error code distribution, latency p99
- **Method**: Isolation Forest + Seasonal Decompose (STL)
- **Granularity**: Per-account, per-protocol, per-node
- **Output**: Alert on score > threshold, tag as `anomaly`
- **Example**: Partner account normally has 0.1% failure rate; sudden jump to 5% in 5-min window triggers anomaly alert before ST queue backs up.

### 2. Failure Prediction — Proactive Alerting

- **Input**: Disk usage, queue depth, cert expiry, error rate trend, CPU/mem
- **Method**: XGBoost classifier trained on 90d window
- **Output**: Probability of node degradation within next 60min
- **Example**: Cert on `st-node-03` expires in 7 days + queue depth growing + error rate rising. Model predicts 72% chance of transfer failures in next hour → pre-emptive SNOW ticket created.

### 3. Root Cause Scoring

- **Input**: Current incident + recent events (last 30min) + change records
- **Method**: BFS over event graph + weighted similarity
- **Output**: Ranked list of likely root causes
- **Example**: Transfer failures spike → system checks: (a) cert expiry, (b) recent change to firewall rules, (c) partner host unreachable → scores each and surfaces top candidate in dashboard.

### 4. Baseline Modeling

- **Input**: 30 days of transfer metrics, hourly/daily seasonality
- **Method**: Prophet or TBATS
- **Output**: Expected throughput envelope (upper/lower bounds)
- **Example**: Black Friday expected 8x volume; model shows actual throughput is only 3x → alerts on capacity shortfall.

---

## Alerting & Incident Auto-Creation

### Severity Mapping

| Severity | Condition | Action |
|---|---|---|
| Critical | Anomaly score > 0.95 or transfer failure spike > 10% in 5min | Create SNOW incident (priority 1), page on-call, Slack alert |
| Warning | Anomaly score 0.8–0.95 or trend exceeding baseline by 2σ | Create SNOW incident (priority 2), Slack alert |
| Info | Single transfer failure (non-anomalous) | Log only; no SNOW action |
| Maintenance | CI in change window | Suppress alerts unless critical |

### Auto-Closure

- If a correlated Incident SNOW ticket is resolved and all related alerts clear within 30min, auto-close the SNOW incident with resolution notes.

---

## Dashboard Structure (Grafana)

### Page 1: Service Health Overview
- Global success rate gauge (99.9% target)
- Active & anomalous transfers by account (table)
- Node health grid (green/amber/red per node)
- Throughput & latency sparklines
- Top 5 error codes (bar chart)

### Page 2: Incident Timeline
- SNOW incidents overlaid on transfer failure timeline
- Each incident shows duration, response time, resolution
- ML anomaly markers on the same timeline
- Drill-down to raw transfer logs

### Page 3: ML Insights
- Anomaly score trend (per account/node)
- Failure prediction probability (next 60min)
- Baseline vs actual throughput (overlay chart)
- Model drift / accuracy metrics

### Page 4: SLA & Trends
- Weekly/monthly transfer volume
- MTTR trend
- Top failure-prone accounts
- Cert expiry calendar

---

## Implementation Phases

### Phase 1 — Foundation (2–3 weeks)

1. Implement Axway ST API collectors (transfer + health + performance)
2. Implement ServiceNow incident poller
3. Set up Kafka topic structure and schema
4. Build normalization pipeline → OpenSearch + VictoriaMetrics
5. Create Grafana dashboards (Health Overview, Incident Timeline)
6. Define basic static alert rules

### Phase 2 — Correlation (2 weeks)

1. Correlate ST failure events → SNOW incidents (by timestamp, account, CI)
2. Webhook from Axway ST (direct alert forwarding)
3. Incident enrichment: add transfer context to SNOW ticket
4. Auto-create SNOW tickets for critical alerts
5. MTTR tracking dashboard

### Phase 3 — ML (3–4 weeks)

1. Train anomaly detection model (Isolation Forest) on 30d+ historical data
2. Train failure prediction model (XGBoost) on 90d+ data
3. Deploy ML pipeline on weekly retrain schedule
4. Model serving API for real-time scoring
5. ML Insights dashboard

### Phase 4 — Automation (2 weeks)

1. Auto-remediation runbooks (retry failed transfer, restart node, etc.)
2. SNOW auto-closure for cleared alerts
3. Change window integration (suppress false positives during maintenance)
4. PagerDuty / Slack / Teams routing

---

## Operational Considerations

- **Rate limits**: Axway ST API may throttle at > 60 req/min. Batch transfer queries in pages of 100.
- **Token rotation**: OAuth2 tokens expire. Implement automatic refresh with retry logic.
- **SNOW attachment size**: When attaching logs to incidents, keep payload under 5 MB; link to log store for larger.
- **Data retention**: Raw events → 30d in TSDB, 90d in OpenSearch, > 90d archived to S3/Blob. Aggregations kept 2y.
- **Cost monitoring**: Track API call volume + storage growth. Set budget alerts.
- **Failover**: If ST API is unreachable, buffer events in Kafka (retention = 7d) and replay on recovery.
- **Model retraining**: Retrain weekly; if accuracy drops below threshold on validation set, fall back to previous model.

---

## Appendix: Quick Start

### Axway ST API — Test Connection

```bash
curl -u username:password \
  https://st-host:444/api/v1.0/health \
  -k
```

### ServiceNow — Test Connection

```bash
curl -u user:pass \
  'https://instance.service-now.com/api/now/table/incident?sysparm_limit=1'
```

### Docker Compose — Local Dev Setup

See `infra/docker-compose.yml` for Kafka + VictoriaMetrics + Grafana + OpenSearch local development environment.
