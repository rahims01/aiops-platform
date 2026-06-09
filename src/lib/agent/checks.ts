/**
 * Proactive health checks for Axway SecureTransport.
 *
 * Each check reads Axway state (mock or real) and returns a list of Findings.
 * An empty list means the check passed. A Finding becomes an incident if it is
 * not already tracked (deduplicated by fingerprint). Server-only module.
 */

import { createHash } from 'crypto';
import { config } from './config';
import * as axway from './mock-axway';
import type { Category, Finding, Severity } from '../types';

/** Stable fingerprint: same check + category + partner ⇒ same incident. */
function fingerprintFor(checkName: string, category: Category, partnerId?: string): string {
  const key = `${checkName}:${category}:${partnerId ?? 'global'}`;
  return createHash('md5').update(key).digest('hex').slice(0, 16);
}

function makeFinding(
  f: Omit<Finding, 'fingerprint'> & { fingerprint?: string },
): Finding {
  return {
    ...f,
    fingerprint: f.fingerprint ?? fingerprintFor(f.check_name, f.category, f.partner_id),
  };
}

function errorToCategory(errorCode: string): Category {
  const mapping: Record<string, Category> = {
    HOST_KEY_VERIFICATION_FAILED: 'SFTP_KEY',
    AUTH_FAILED: 'SFTP_AUTH',
    CERT_EXPIRED: 'TLS_CERT',
    CIPHER_MISMATCH: 'TLS_HANDSHAKE',
    AS2_MDN_TIMEOUT: 'AS2_MDN',
    AS2_ENCRYPT_ERROR: 'AS2_ENCRYPT',
  };
  return mapping[errorCode] ?? 'UNKNOWN';
}

// ── Check 1: Certificate expiry ──────────────────────────────────────────────

export async function checkCertExpiry(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const warnDays = config.certExpiryWarnDays;
  const certs = await axway.listCertificates();
  for (const cert of certs) {
    const days = cert.days_until_expiry ?? 999;
    if (days > warnDays) continue;

    let sev: Severity;
    let label: string;
    if (days <= 1) [sev, label] = ['P1', 'CRITICAL'];
    else if (days <= 7) [sev, label] = ['P2', 'URGENT'];
    else if (days <= 15) [sev, label] = ['P3', 'WARNING'];
    else [sev, label] = ['P4', 'NOTICE'];

    findings.push(
      makeFinding({
        check_name: 'cert_expiry',
        category: 'TLS_CERT',
        severity: sev,
        title: `[${label}] Certificate expiring in ${days} day(s): ${cert.common_name}`,
        description:
          `Certificate '${cert.common_name}' for partner ${cert.partner_name ?? 'unknown'} ` +
          `expires in ${days} day(s). Issuer: ${cert.issuer}. ` +
          `Algorithm: ${cert.algorithm}, Key size: ${cert.key_size} bits. ` +
          'Immediate renewal required to avoid transfer failures.',
        partner_id: cert.partner_id,
        partner_name: cert.partner_name,
        raw_data: { ...cert },
      }),
    );
  }
  return findings;
}

// ── Check 2: Transfer failure rate ───────────────────────────────────────────

export async function checkTransferFailures(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const threshold = config.failureRateThreshold;
  const transfers = await axway.listTransfers();

  const failuresByPartner = new Map<string, typeof transfers>();
  for (const t of transfers) {
    if (t.status !== 'FAILED') continue;
    const list = failuresByPartner.get(t.partner_id) ?? [];
    list.push(t);
    failuresByPartner.set(t.partner_id, list);
  }

  for (const [pid, failures] of failuresByPartner) {
    if (failures.length < threshold) continue;
    const sample = failures[0];
    const count = failures.length;
    const errorCode = sample.error_code ?? 'UNKNOWN';

    let sev: Severity;
    if (count >= 10) sev = 'P1';
    else if (count >= 5) sev = 'P2';
    else sev = 'P3';

    findings.push(
      makeFinding({
        check_name: 'transfer_failures',
        category: errorToCategory(errorCode),
        severity: sev,
        title: `${count} transfer failure(s) in 5 min — ${sample.partner_name} (${sample.protocol})`,
        description:
          `Partner ${sample.partner_name} has ${count} failed ${sample.protocol} transfers ` +
          `in the last 5 minutes. Error: ${errorCode} — ${sample.error_message ?? ''}. ` +
          'Automatic root cause analysis recommended.',
        partner_id: pid,
        partner_name: sample.partner_name,
        protocol: sample.protocol,
        raw_data: { failure_count: count, sample_transfer: sample, error_code: errorCode },
      }),
    );
  }
  return findings;
}

// ── Check 3: Partner silence ─────────────────────────────────────────────────

export async function checkPartnerSilence(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const partners = await axway.listPartners();
  for (const partner of partners) {
    if (!partner.active) continue;
    const expectedHours = partner.expected_transfer_interval_hours;
    if (!expectedHours) continue;

    const silenceHours = partner.hours_since_last_transfer ?? expectedHours * 3;
    if (silenceHours <= expectedHours) continue;

    const overdueFactor = silenceHours / expectedHours;
    const sev: Severity = overdueFactor >= 3 ? 'P2' : 'P3';

    findings.push(
      makeFinding({
        check_name: 'partner_silence',
        category: 'PARTNER_SILENCE',
        severity: sev,
        title: `No transfers from ${partner.name} for ${silenceHours.toFixed(1)}h (expected every ${expectedHours}h)`,
        description:
          `Partner ${partner.name} (${partner.protocol}) has not sent any successful transfers ` +
          `for ${silenceHours.toFixed(1)} hours. Expected transfer interval: every ${expectedHours} hours. ` +
          'Possible causes: partner system down, firewall change, schedule change, or silent failure.',
        partner_id: partner.id,
        partner_name: partner.name,
        protocol: partner.protocol,
        raw_data: { silence_hours: silenceHours, expected_hours: expectedHours },
      }),
    );
  }
  return findings;
}

// ── Check 4: SSH key health ──────────────────────────────────────────────────

export async function checkSshKeys(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const keys = await axway.listSshKeys();
  for (const key of keys) {
    const issues: string[] = [];
    let sev: Severity = 'P4';

    if (key.key_type === 'DSA') {
      issues.push('DSA keys are deprecated and should be replaced with RSA-4096 or ECDSA');
      sev = 'P2';
    }
    if (key.key_type === 'RSA' && key.key_size < 2048) {
      issues.push(`RSA key size ${key.key_size} bits is below minimum 2048 bits`);
      sev = 'P2';
    }
    if (key.weak) {
      issues.push('Key flagged as weak by algorithm audit');
      sev = 'P2';
    }
    if (key.age_days > 365) {
      issues.push(`Key is ${key.age_days} days old — consider rotation (recommended annually)`);
    }

    if (issues.length === 0) continue;

    findings.push(
      makeFinding({
        check_name: 'ssh_key_audit',
        category: 'COMPLIANCE',
        severity: sev,
        title: `SSH key issue — ${key.partner_name ?? key.partner_id}: ${issues[0]}`,
        description:
          `SSH key for partner ${key.partner_name} (fingerprint: ${key.fingerprint}) ` +
          `has the following issues: ${issues.join('; ')}. ` +
          'Coordinate with partner to rotate the key to meet current security standards.',
        partner_id: key.partner_id,
        partner_name: key.partner_name,
        raw_data: { ...key },
      }),
    );
  }
  return findings;
}

// ── Check 5: Queue depth ─────────────────────────────────────────────────────

export async function checkQueueDepth(): Promise<Finding[]> {
  const findings: Finding[] = [];
  const warnDepth = config.queueDepthWarn;
  const queues = await axway.listQueues();
  for (const q of queues) {
    const depth = q.depth ?? 0;
    if (depth < Math.max(Math.floor(warnDepth / 10), 20)) continue;

    const oldest = q.oldest_item_minutes ?? 0;
    let sev: Severity;
    if (depth >= warnDepth) sev = 'P2';
    else if (depth >= warnDepth / 2) sev = 'P3';
    else sev = 'P4';

    if (oldest < 10 && depth < 100) continue; // small, recent — not worth an incident

    findings.push(
      makeFinding({
        check_name: 'queue_depth',
        category: 'QUEUE',
        severity: sev,
        title: `Elevated queue depth for ${q.partner_name}: ${depth} items (${oldest} min old)`,
        description:
          `Transfer queue for partner ${q.partner_name} has ${depth} items, ` +
          `oldest item waiting ${oldest} minutes. ` +
          'This is likely caused by repeated transfer failures creating a backlog. ' +
          'Resolve the underlying failure first, then retry queued items.',
        partner_id: q.partner_id,
        partner_name: q.partner_name,
        raw_data: { ...q },
      }),
    );
  }
  return findings;
}

// ── Check 6: JVM & disk health ───────────────────────────────────────────────

export async function checkJvmHealth(): Promise<Finding[]> {
  const findings: Finding[] = [];

  const jvm = await axway.getJvmMetrics();
  if (jvm.heap_pct >= config.jvmHeapWarnPct) {
    const sev: Severity = jvm.heap_pct >= 95 ? 'P1' : 'P2';
    findings.push(
      makeFinding({
        check_name: 'jvm_health',
        category: 'JVM',
        severity: sev,
        title: `Axway JVM heap at ${jvm.heap_pct}% — Transfer Manager performance degraded`,
        description:
          `JVM heap usage is ${jvm.heap_pct}% (${jvm.heap_used_mb}MB / ${jvm.heap_max_mb}MB). ` +
          `GC running ${jvm.gc_collections_per_hour} times/hour with ${jvm.gc_pause_avg_ms}ms average pause. ` +
          'Transfer processing is slowing down. Action required before OutOfMemoryError.',
        raw_data: { ...jvm },
      }),
    );
  }

  const disk = await axway.getDiskMetrics();
  if (disk.used_pct >= config.diskWarnPct) {
    const sev: Severity = disk.used_pct >= 95 ? 'P1' : 'P2';
    findings.push(
      makeFinding({
        check_name: 'disk_health',
        category: 'DISK',
        severity: sev,
        title: `Axway disk usage at ${disk.used_pct}% on ${disk.path}`,
        description:
          `Axway data partition ${disk.path} is ${disk.used_pct}% full ` +
          `(${disk.used_gb}GB / ${disk.total_gb}GB). ` +
          'If disk fills completely, Axway will stop accepting inbound transfers. ' +
          'Clean up old log files and completed transfer payloads immediately.',
        raw_data: { ...disk },
      }),
    );
  }

  return findings;
}

// ── Registry ─────────────────────────────────────────────────────────────────

export const ALL_CHECKS: Array<{ name: string; run: () => Promise<Finding[]> }> = [
  { name: 'cert_expiry', run: checkCertExpiry },
  { name: 'transfer_failures', run: checkTransferFailures },
  { name: 'partner_silence', run: checkPartnerSilence },
  { name: 'ssh_key_audit', run: checkSshKeys },
  { name: 'queue_depth', run: checkQueueDepth },
  { name: 'jvm_health', run: checkJvmHealth },
];

/** Run every check, swallowing per-check errors so one failure doesn't block others. */
export async function runAllChecks(): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const check of ALL_CHECKS) {
    try {
      findings.push(...(await check.run()));
    } catch (err) {
      console.error(`Check ${check.name} raised an exception:`, err);
    }
  }
  return findings;
}
