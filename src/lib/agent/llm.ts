/**
 * LLM client for root-cause analysis and chat, with a mock fallback.
 *
 * If ANTHROPIC_API_KEY is set, calls the real Claude API (via the
 * @anthropic-ai/sdk, dynamically imported so it isn't required in mock mode).
 * Otherwise returns realistic, deterministic mock responses so the platform is
 * fully functional without any API keys. Server-only module.
 */

import { config } from './config';
import { INCIDENT_ANALYSIS_SYSTEM, CHAT_SYSTEM } from './prompts';
import type { Category, ChatResponse, IncidentAnalysis } from '../types';

// ── Mock analyses keyed by incident category ─────────────────────────────────

const MOCK_ANALYSES: Partial<Record<Category, IncidentAnalysis>> = {
  SFTP_KEY: {
    root_cause:
      'SSH host key fingerprint mismatch — the partner rotated their SFTP server key without notifying operations. Axway known_hosts still holds the old fingerprint.',
    evidence:
      "Error code HOST_KEY_VERIFICATION_FAILED in sshd.log: 'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED'",
    confidence: 94,
    severity: 'P2',
    fix_steps: [
      'Run ssh-keyscan -t rsa <partner_host> 22 to capture the current fingerprint',
      'Update Axway partner known_hosts via Admin API: PUT /api/v1.4/accounts/{partner_id}/sshKnownHosts',
      'Confirm the new fingerprint with the partner out-of-band',
      'Run a synthetic SFTP test (list remote directory) to validate the fix',
      'Retry any queued failed transfers',
    ],
    auto_fixable: true,
    auto_fix_action: 'UPDATE_KNOWN_HOSTS',
    estimated_fix_minutes: 5,
    safety_notes: 'Low risk — updating known_hosts is reversible. Pre-state is captured before change.',
    escalate_if:
      'Fix fails after 2 attempts, or partner confirms they did not rotate the key (may indicate MITM attack).',
  },
  TLS_CERT: {
    root_cause:
      "SSL/TLS certificate has expired or will expire within the warning threshold. The partner's HTTPS or FTPS endpoint is rejecting connections.",
    evidence: 'Error: certificate_expired (alert code 45) during TLS ClientHello/ServerHello handshake',
    confidence: 97,
    severity: 'P2',
    fix_steps: [
      'Confirm certificate expiry: openssl s_client -connect <host>:<port> | openssl x509 -noout -dates',
      "Request new certificate from CA (or issue via internal PKI / Let's Encrypt)",
      'Import new certificate into Axway: POST /api/v1.4/certificates/import',
      'Assign renewed certificate to partner profile',
      'Run synthetic HTTPS connectivity test to validate TLS handshake',
    ],
    auto_fixable: true,
    auto_fix_action: 'RENEW_CERTIFICATE',
    estimated_fix_minutes: 15,
    safety_notes:
      'Medium risk — importing certificate is reversible (old cert can be restored). Coordinate with partner if it is their certificate.',
    escalate_if: 'Certificate is partner-owned (not managed by ops). Escalate to partner to renew on their side.',
  },
  AS2_MDN: {
    root_cause:
      "AS2 MDN (Message Disposition Notification) not received within the configured timeout. Partner's MDN endpoint is unreachable or returning errors.",
    evidence: 'AS2 log: MDN-Status=pending after 300s timeout; HTTP probe to partner MDN URL returns connection refused',
    confidence: 88,
    severity: 'P2',
    fix_steps: [
      'Probe partner MDN endpoint: curl -I <partner_as2_mdn_url>',
      'If endpoint is down: notify partner that their MDN listener is unreachable',
      'Switch transfer to async MDN mode as a temporary workaround',
      'Retry the failed transfer once partner confirms endpoint is restored',
      'Create ServiceNow task for partner to fix their MDN endpoint',
    ],
    auto_fixable: false,
    auto_fix_action: null,
    estimated_fix_minutes: 30,
    safety_notes: 'No Axway-side changes required — issue is on partner side. Safe to retry with async MDN.',
    escalate_if: 'Partner does not respond within SLA window. Escalate to account manager.',
  },
  JVM: {
    root_cause:
      'Axway Transfer Manager JVM heap is critically high, causing frequent GC pauses that delay transfer processing and will eventually cause OutOfMemoryError.',
    evidence: 'JVM heap at 85%+ with full GC running frequently, elevated average pause. Thread count elevated.',
    confidence: 91,
    severity: 'P2',
    fix_steps: [
      'Capture thread dump immediately for post-mortem analysis: kill -3 <TM_PID>',
      'Identify top memory consumers in JVM (check for transfer log accumulation in memory)',
      'If heap > 90%: restart Transfer Manager with approval — it will resume queued transfers',
      'After restart: increase -Xmx from current value by 50% in start-tm.sh',
      'Schedule maintenance window to tune GC settings (G1GC recommended for ST 5.x)',
    ],
    auto_fixable: true,
    auto_fix_action: 'RESTART_TRANSFER_MANAGER',
    estimated_fix_minutes: 10,
    safety_notes:
      'Restart causes ~2-5 minute transfer processing pause. Queued transfers resume automatically. Pre-state (queue snapshot) captured before action.',
    escalate_if: 'Heap reaches 95% before approval — emergency restart is justified without waiting for approval.',
  },
  DISK: {
    root_cause:
      'Axway data partition is filling up. Once full, Axway stops accepting inbound transfers and queues back up across all partners.',
    evidence: 'Data partition usage above warn threshold; transfer payload and log retention not being purged.',
    confidence: 90,
    severity: 'P2',
    fix_steps: [
      'Identify largest consumers: du -sh /opt/axway/SecureTransport/var/* | sort -h',
      'Purge completed transfer payloads older than retention policy',
      'Rotate and compress old log files',
      'Verify free space recovered and inbound transfers resume',
    ],
    auto_fixable: false,
    auto_fix_action: null,
    estimated_fix_minutes: 20,
    safety_notes: 'Verify retention policy before deleting payloads — some partners require longer retention for audit.',
    escalate_if: 'Disk reaches 95% — risk of full outage; page on-call storage engineer.',
  },
  PARTNER_SILENCE: {
    root_cause:
      "Partner has not sent any file transfers within their expected interval. This may indicate a problem on the partner's side, a firewall change, or a schedule change.",
    evidence: 'Last successful inbound transfer from partner was well beyond the expected interval.',
    confidence: 72,
    severity: 'P3',
    fix_steps: [
      'Check if partner has any open incidents or scheduled maintenance on their end',
      "Attempt outbound connectivity test to partner's SFTP/AS2 endpoint",
      'Review firewall change logs for the past 48 hours',
      'Contact partner operations team via SLA contact to confirm they are aware',
      'If no response: escalate to account manager',
    ],
    auto_fixable: false,
    auto_fix_action: null,
    estimated_fix_minutes: 45,
    safety_notes: 'No Axway-side changes. This is a monitoring/communication issue.',
    escalate_if: 'Partner silence extends beyond 2× the SLA window, or partner cannot be reached.',
  },
  QUEUE: {
    root_cause:
      'Transfer queue depth is elevated, likely due to repeated transfer failures creating a backlog. Queued items will age and may breach SLA.',
    evidence: 'Queue depth elevated with an aging oldest item. Correlates with recent failures for the same partner.',
    confidence: 85,
    severity: 'P3',
    fix_steps: [
      'Identify root cause of the backlog (likely a separate SFTP/AS2 failure incident)',
      'Resolve the underlying failure first — do not clear the queue until the cause is fixed',
      'Once underlying issue is resolved, retry queued transfers via Admin API',
      'Monitor queue drain rate for 15 minutes to confirm recovery',
    ],
    auto_fixable: true,
    auto_fix_action: 'RETRY_QUEUED_TRANSFERS',
    estimated_fix_minutes: 8,
    safety_notes: 'Retrying transfers is safe. Do not clear the queue (that would discard transfers).',
    escalate_if: 'Queue continues growing after underlying issue is resolved. May indicate a secondary problem.',
  },
  COMPLIANCE: {
    root_cause:
      'A partner credential (SSH key) does not meet current security standards — deprecated algorithm, weak key size, or overdue for rotation.',
    evidence: 'SSH key audit flagged a deprecated/weak/aged key for this partner.',
    confidence: 80,
    severity: 'P3',
    fix_steps: [
      'Generate a new key pair meeting standards (RSA-4096 or ED25519)',
      'Coordinate key rotation window with the partner',
      'Install the new public key and update the partner profile in Axway',
      'Run a synthetic transfer to validate, then revoke the old key',
    ],
    auto_fixable: false,
    auto_fix_action: null,
    estimated_fix_minutes: 60,
    safety_notes: 'Key rotation requires partner coordination — do not revoke the old key until the new one is validated.',
    escalate_if: 'Partner cannot rotate within the compliance deadline. Escalate to security/compliance owner.',
  },
};

const DEFAULT_MOCK: IncidentAnalysis = {
  root_cause: 'Unknown failure pattern — insufficient log data to determine root cause with high confidence.',
  evidence: 'Multiple transfer failures detected without a clear error pattern.',
  confidence: 45,
  severity: 'P3',
  fix_steps: [
    'Collect detailed logs: enable DEBUG logging on Axway for 15 minutes',
    'Review Axway admin.log and tm.log for the failure window',
    'Check Axway service health: all adapters running?',
    'Escalate to Axway MFT operations team with log bundle',
  ],
  auto_fixable: false,
  auto_fix_action: null,
  estimated_fix_minutes: 60,
  safety_notes: 'Do not take automated action when root cause is unclear.',
  escalate_if: 'Immediately — confidence is too low for autonomous remediation.',
};

// JSON schema mirroring IncidentAnalysis, used to force structured output.
const ANALYSIS_TOOL = {
  name: 'submit_analysis',
  description: 'Submit the structured root-cause analysis for the incident.',
  input_schema: {
    type: 'object' as const,
    properties: {
      root_cause: { type: 'string' },
      evidence: { type: 'string' },
      confidence: { type: 'integer', minimum: 0, maximum: 100 },
      severity: { type: 'string', enum: ['P1', 'P2', 'P3', 'P4'] },
      fix_steps: { type: 'array', items: { type: 'string' } },
      auto_fixable: { type: 'boolean' },
      auto_fix_action: { type: ['string', 'null'] },
      estimated_fix_minutes: { type: 'integer' },
      safety_notes: { type: 'string' },
      escalate_if: { type: 'string' },
    },
    required: [
      'root_cause',
      'evidence',
      'confidence',
      'severity',
      'fix_steps',
      'auto_fixable',
      'estimated_fix_minutes',
      'safety_notes',
      'escalate_if',
    ],
  },
};

/**
 * Load the Anthropic SDK lazily. Uses a variable specifier so the build/typecheck
 * does not require the package to be installed in mock mode; it is only imported
 * when a real API key is configured. Declared in package.json for real mode.
 */
async function loadAnthropic(): Promise<new (opts: { apiKey: string }) => AnthropicLike> {
  // turbopackIgnore keeps the bundler from resolving the package at build time,
  // so it isn't required in mock mode. Install `@anthropic-ai/sdk` to use real mode.
  const pkg: string = '@anthropic-ai/sdk';
  const mod = (await import(/* turbopackIgnore: true */ pkg)) as {
    default: new (opts: { apiKey: string }) => AnthropicLike;
  };
  return mod.default;
}

interface AnthropicContentBlock {
  type: string;
  text?: string;
  input?: unknown;
}
interface AnthropicMessage {
  content: AnthropicContentBlock[];
}
interface AnthropicLike {
  messages: {
    create(args: Record<string, unknown>): Promise<AnthropicMessage>;
  };
}

export interface AnalyzeInput {
  category: Category;
  title: string;
  description: string;
  partner_name?: string;
  log_excerpt?: string;
}

export async function analyzeIncident(input: AnalyzeInput): Promise<IncidentAnalysis> {
  if (config.mockLlm) {
    return { ...(MOCK_ANALYSES[input.category] ?? DEFAULT_MOCK) };
  }

  try {
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const userContent =
      `Incident Category: ${input.category}\n` +
      `Title: ${input.title}\n` +
      `Partner: ${input.partner_name ?? 'unknown'}\n` +
      `Description: ${input.description}\n` +
      `Log excerpt:\n${input.log_excerpt || 'No logs available'}`;

    const resp = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 1500,
      temperature: 0.1,
      system: INCIDENT_ANALYSIS_SYSTEM,
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_analysis' },
      messages: [{ role: 'user', content: userContent }],
    });

    const toolUse = resp.content.find((b) => b.type === 'tool_use');
    if (toolUse?.input) {
      return toolUse.input as IncidentAnalysis;
    }
    return { ...DEFAULT_MOCK };
  } catch (err) {
    console.error('Claude analysis failed, falling back to default:', err);
    return { ...DEFAULT_MOCK };
  }
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function chat(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[] = [],
): Promise<ChatResponse> {
  if (config.mockLlm) {
    return {
      answer:
        `(Mock AI) You asked: "${message}". In live mode with an Anthropic API key configured, ` +
        'I would analyze your Axway environment and give specific guidance. For now, check the ' +
        'Incident Console for active issues, or click "Run Checks" to trigger the proactive engine.',
      sources: ['mock-mode'],
      follow_up_suggestions: [
        'Show me all certificates expiring this month',
        'Why is Partner Bank Inc failing?',
        'What does HOST_KEY_VERIFICATION_FAILED mean?',
      ],
    };
  }

  try {
    const Anthropic = await loadAnthropic();
    const client = new Anthropic({ apiKey: config.anthropicApiKey });
    const resp = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 1024,
      temperature: 0.3,
      system: CHAT_SYSTEM,
      messages: [...history, { role: 'user', content: message }],
    });
    const text = resp.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text ?? '')
      .join('\n');
    return { answer: text, sources: [], follow_up_suggestions: [] };
  } catch (err) {
    console.error('Claude chat failed:', err);
    return {
      answer: `Error contacting the AI: ${(err as Error).message}. Check your ANTHROPIC_API_KEY configuration.`,
      sources: [],
      follow_up_suggestions: [],
    };
  }
}
