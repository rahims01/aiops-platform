/**
 * Remediation actions (mutating). In mock mode each action is simulated and
 * logged; in real mode these would call the Axway Admin API. Every action
 * captures a "pre-state" snapshot before mutating so changes are reversible.
 *
 * Server-only module.
 */

import { config } from './config';
import type { Incident, RemediationResult } from '../types';

type ActionHandler = (incident: Incident) => Promise<RemediationResult>;

function simulated(action: string, message: string): RemediationResult {
  console.info(`[remediation:mock] ${action} — ${message}`);
  return { success: true, status: 'OK', action, message };
}

const HANDLERS: Record<string, ActionHandler> = {
  async UPDATE_KNOWN_HOSTS(incident) {
    // Real: capture current known_hosts, ssh-keyscan partner, PUT new fingerprint, synthetic test.
    return simulated(
      'UPDATE_KNOWN_HOSTS',
      `Captured pre-state and updated known_hosts for ${incident.partner_name}; synthetic SFTP test passed.`,
    );
  },
  async RENEW_CERTIFICATE(incident) {
    return simulated(
      'RENEW_CERTIFICATE',
      `Imported renewed certificate for ${incident.partner_name} and reassigned to partner profile.`,
    );
  },
  async RETRY_QUEUED_TRANSFERS(incident) {
    return simulated(
      'RETRY_QUEUED_TRANSFERS',
      `Retried queued transfers for ${incident.partner_name}; monitoring drain rate.`,
    );
  },
  async RESTART_TRANSFER_MANAGER() {
    return simulated(
      'RESTART_TRANSFER_MANAGER',
      'Captured queue snapshot and restarted Transfer Manager; queued transfers resumed.',
    );
  },
};

/** Dispatch a named action for an incident. */
export async function dispatchAction(action: string, incident: Incident): Promise<RemediationResult> {
  if (!config.mockAxway) {
    return {
      success: false,
      status: 'ERROR',
      action,
      message: `Real Axway remediation for "${action}" is not implemented yet — set MOCK_AXWAY=true.`,
    };
  }
  const handler = HANDLERS[action];
  if (!handler) {
    return { success: false, status: 'ERROR', action, message: `Unknown action: ${action}` };
  }
  try {
    return await handler(incident);
  } catch (err) {
    return { success: false, status: 'ERROR', action, message: (err as Error).message };
  }
}

export const KNOWN_ACTIONS = Object.keys(HANDLERS);
