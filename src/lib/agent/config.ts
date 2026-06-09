/**
 * Dual-mode configuration for the agentic incident engine.
 *
 * Everything is environment-driven with safe defaults so the platform runs
 * fully in mock mode with zero external dependencies. Set the relevant env
 * vars (ANTHROPIC_API_KEY, MOCK_AXWAY=false, …) to switch to real APIs.
 *
 * Server-only module — do not import from client components.
 */

const num = (v: string | undefined, fallback: number): number => {
  const n = v != null ? Number(v) : NaN;
  return Number.isFinite(n) ? n : fallback;
};

const bool = (v: string | undefined, fallback: boolean): boolean => {
  if (v == null) return fallback;
  return v === 'true' || v === '1' || v === 'yes';
};

export const config = {
  // ── Axway SecureTransport ──────────────────────────────────────────────
  mockAxway: bool(process.env.MOCK_AXWAY, true),
  axwayAdminUrl: process.env.AXWAY_ADMIN_URL ?? 'https://axway-host:444',
  axwayAdminUser: process.env.AXWAY_ADMIN_USER ?? 'admin',
  axwayAdminPassword: process.env.AXWAY_ADMIN_PASSWORD ?? '',

  // ── LLM (Claude) — empty key ⇒ mock LLM ────────────────────────────────
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
  anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-opus-4-8',

  // ── Notifications ──────────────────────────────────────────────────────
  slackBotToken: process.env.SLACK_BOT_TOKEN ?? '',
  slackAlertChannel: process.env.SLACK_ALERT_CHANNEL ?? '#mft-alerts',
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL ?? '',

  // ── Thresholds ─────────────────────────────────────────────────────────
  certExpiryWarnDays: num(process.env.CERT_EXPIRY_WARN_DAYS, 30),
  failureRateThreshold: num(process.env.FAILURE_RATE_THRESHOLD, 3),
  queueDepthWarn: num(process.env.QUEUE_DEPTH_WARN, 500),
  jvmHeapWarnPct: num(process.env.JVM_HEAP_WARN_PCT, 85),
  diskWarnPct: num(process.env.DISK_WARN_PCT, 80),
  autoFixConfidenceThreshold: num(process.env.AUTO_FIX_CONFIDENCE_THRESHOLD, 85),

  /** Empty Anthropic key ⇒ run the LLM in mock mode. */
  get mockLlm(): boolean {
    return !this.anthropicApiKey;
  },
  get slackEnabled(): boolean {
    return !!this.slackBotToken;
  },
  get teamsEnabled(): boolean {
    return !!this.teamsWebhookUrl;
  },
} as const;

export type AppConfig = typeof config;
