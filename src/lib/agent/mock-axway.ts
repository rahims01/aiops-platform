/**
 * Mock Axway SecureTransport data providers — the inputs the proactive checks
 * read. In real mode these would call the Axway Admin REST API; here they return
 * deterministic, realistic fixtures consistent with the dashboard narrative
 * (partner_bank_inc SSH-key failures, st-node-04 in distress, a silent partner).
 *
 * Every provider is async so swapping in the real Admin API client is a drop-in
 * change. Server-only module.
 */

import { config } from './config';
import type {
  AxwayCertificate,
  AxwaySshKey,
  AxwayQueue,
  AxwayPartner,
  AxwayTransfer,
  JvmMetrics,
  DiskMetrics,
} from '../types';

// ── Mock fixtures ────────────────────────────────────────────────────────────

const CERTIFICATES: AxwayCertificate[] = [
  {
    partner_id: 'external_auditors',
    partner_name: 'External Auditors',
    common_name: 'as2.external-auditors.com',
    issuer: 'DigiCert Global G2',
    algorithm: 'SHA256-RSA',
    key_size: 2048,
    days_until_expiry: 2,
  },
  {
    partner_id: 'partner_bank_inc',
    partner_name: 'Partner Bank Inc',
    common_name: 'sftp.partner-bank-01.external.com',
    issuer: "Let's Encrypt R3",
    algorithm: 'SHA256-RSA',
    key_size: 2048,
    days_until_expiry: 7,
  },
  {
    partner_id: 'insurance_partners_llc',
    partner_name: 'Insurance Partners LLC',
    common_name: 'insurance-partner-api.com',
    issuer: 'DigiCert Global G2',
    algorithm: 'SHA256-RSA',
    key_size: 4096,
    days_until_expiry: 14,
  },
  {
    partner_id: 'internal_finance',
    partner_name: 'Internal Finance',
    common_name: 'st-node-01.prod.internal',
    issuer: 'Internal PKI',
    algorithm: 'SHA256-RSA',
    key_size: 4096,
    days_until_expiry: 120,
  },
];

const SSH_KEYS: AxwaySshKey[] = [
  {
    partner_id: 'partner_bank_inc',
    partner_name: 'Partner Bank Inc',
    fingerprint: 'SHA256:0xR3vPq9k2mZ8...legacy',
    key_type: 'DSA',
    key_size: 1024,
    age_days: 880,
  },
  {
    partner_id: 'fintech_partners',
    partner_name: 'Fintech Partners',
    fingerprint: 'SHA256:7yT4nLm1aB6...',
    key_type: 'RSA',
    key_size: 4096,
    age_days: 410,
  },
  {
    partner_id: 'insurance_partners_llc',
    partner_name: 'Insurance Partners LLC',
    fingerprint: 'SHA256:9wQ2bN5cD8...',
    key_type: 'ED25519',
    key_size: 256,
    age_days: 90,
  },
];

const QUEUES: AxwayQueue[] = [
  {
    partner_id: 'external_auditors',
    partner_name: 'External Auditors',
    depth: 312,
    oldest_item_minutes: 45,
  },
  {
    partner_id: 'partner_bank_inc',
    partner_name: 'Partner Bank Inc',
    depth: 145,
    oldest_item_minutes: 22,
  },
  {
    partner_id: 'internal_finance',
    partner_name: 'Internal Finance',
    depth: 8,
    oldest_item_minutes: 2,
  },
];

const PARTNERS: AxwayPartner[] = [
  {
    id: 'partner_bank_inc',
    name: 'Partner Bank Inc',
    protocol: 'SFTP',
    active: true,
    expected_transfer_interval_hours: 4,
    hours_since_last_transfer: 0.2,
  },
  {
    id: 'insurance_partners_llc',
    name: 'Insurance Partners LLC',
    protocol: 'HTTPS',
    active: true,
    expected_transfer_interval_hours: 6,
    hours_since_last_transfer: 26,
  },
  {
    id: 'fintech_partners',
    name: 'Fintech Partners',
    protocol: 'SFTP',
    active: true,
    expected_transfer_interval_hours: 2,
    hours_since_last_transfer: 0.7,
  },
  {
    id: 'external_auditors',
    name: 'External Auditors',
    protocol: 'AS2',
    active: true,
    expected_transfer_interval_hours: 24,
    hours_since_last_transfer: 1.0,
  },
];

/** Failed transfers in the last 5 minutes, grouped (by check) per partner. */
const RECENT_TRANSFERS: AxwayTransfer[] = [
  ...Array.from({ length: 6 }, (_, i): AxwayTransfer => ({
    transfer_id: `tr-987${65 - i}`,
    partner_id: 'partner_bank_inc',
    partner_name: 'Partner Bank Inc',
    protocol: 'SFTP',
    status: 'FAILED',
    error_code: 'HOST_KEY_VERIFICATION_FAILED',
    error_message: 'REMOTE HOST IDENTIFICATION HAS CHANGED — SSH key verification failed',
  })),
  ...Array.from({ length: 3 }, (_, i): AxwayTransfer => ({
    transfer_id: `tr-986${10 - i}`,
    partner_id: 'external_auditors',
    partner_name: 'External Auditors',
    protocol: 'AS2',
    status: 'FAILED',
    error_code: 'AS2_MDN_TIMEOUT',
    error_message: 'MDN not received within 300s timeout',
  })),
  {
    transfer_id: 'tr-98700',
    partner_id: 'fintech_partners',
    partner_name: 'Fintech Partners',
    protocol: 'SFTP',
    status: 'SUCCESS',
  },
];

const JVM: JvmMetrics = {
  heap_pct: 88,
  heap_used_mb: 7040,
  heap_max_mb: 8000,
  gc_collections_per_hour: 120,
  gc_pause_avg_ms: 180,
};

const DISK: DiskMetrics = {
  path: '/opt/axway/SecureTransport/var',
  used_pct: 82,
  used_gb: 820,
  total_gb: 1000,
};

// ── Provider API (mock-mode implementations) ─────────────────────────────────

function ensureMock(resource: string): void {
  if (!config.mockAxway) {
    // Real Axway Admin API integration goes here (httpx-equivalent fetch with
    // OAuth2 + retry). Until implemented, fail loudly rather than silently
    // returning mock data in a "real" deployment.
    throw new Error(
      `Real Axway integration for "${resource}" is not implemented yet — set MOCK_AXWAY=true.`,
    );
  }
}

export async function listCertificates(): Promise<AxwayCertificate[]> {
  ensureMock('certificates');
  return CERTIFICATES;
}

export async function listSshKeys(): Promise<AxwaySshKey[]> {
  ensureMock('ssh-keys');
  return SSH_KEYS;
}

export async function listQueues(): Promise<AxwayQueue[]> {
  ensureMock('queues');
  return QUEUES;
}

export async function listPartners(): Promise<AxwayPartner[]> {
  ensureMock('partners');
  return PARTNERS;
}

export async function listTransfers(): Promise<AxwayTransfer[]> {
  ensureMock('transfers');
  return RECENT_TRANSFERS;
}

export async function getJvmMetrics(): Promise<JvmMetrics> {
  ensureMock('jvm');
  return JVM;
}

export async function getDiskMetrics(): Promise<DiskMetrics> {
  ensureMock('disk');
  return DISK;
}
