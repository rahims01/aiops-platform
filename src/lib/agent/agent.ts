/**
 * Reactive agent: analyze an incident with the LLM and attach RCA, then
 * (optionally) attempt a confidence-gated automated fix.
 *
 * Server-only module.
 */

import { config } from './config';
import { analyzeIncident } from './llm';
import { dispatchAction } from './actions';
import { notifyIncident } from './notifier';
import { getIncident, updateIncident } from './store';
import type { Incident, RemediationResult } from '../types';

/** Run LLM root-cause analysis on an incident and persist the result. */
export async function analyzeAndAttach(id: string): Promise<Incident | null> {
  const incident = await getIncident(id);
  if (!incident) return null;

  updateIncident(id, { status: 'ANALYZING' });

  const analysis = await analyzeIncident({
    category: incident.category,
    title: incident.title,
    description: incident.description,
    partner_name: incident.partner_name,
  });

  // Back to NEW — awaiting an action decision — with RCA attached.
  return updateIncident(id, {
    status: 'NEW',
    root_cause: analysis.root_cause,
    evidence: analysis.evidence,
    confidence: analysis.confidence,
    severity: analysis.severity,
    fix_steps: analysis.fix_steps,
    auto_fixable: analysis.auto_fixable,
    auto_fix_action: analysis.auto_fix_action,
    estimated_fix_minutes: analysis.estimated_fix_minutes,
    safety_notes: analysis.safety_notes,
    escalate_if: analysis.escalate_if,
  });
}

export interface AutoFixOutcome extends RemediationResult {
  incident: Incident | null;
}

/**
 * Attempt an automated fix. Runs ONLY when the incident is auto-fixable, has a
 * defined action, and confidence ≥ the configured threshold. Otherwise escalates.
 */
export async function attemptAutoFix(id: string): Promise<AutoFixOutcome> {
  const incident = await getIncident(id);
  if (!incident) return { success: false, status: 'ERROR', message: 'Incident not found', incident: null };

  if (!incident.root_cause) {
    return { success: false, status: 'SKIPPED', message: 'Incident has not been analyzed yet', incident };
  }
  if (!incident.auto_fixable || !incident.auto_fix_action) {
    return { success: false, status: 'SKIPPED', message: 'Incident is not marked as auto-fixable', incident };
  }

  const confidence = incident.confidence ?? 0;
  if (confidence < config.autoFixConfidenceThreshold) {
    const escalated = updateIncident(id, {
      status: 'ESCALATED',
      resolution_notes: `Auto-fix withheld: confidence ${confidence}% is below the ${config.autoFixConfidenceThreshold}% threshold. Escalated for human review.`,
    });
    if (escalated) await notifyIncident(escalated, 'ESCALATED (low confidence)');
    return {
      success: false,
      status: 'ESCALATED',
      message: `Confidence ${confidence}% below threshold ${config.autoFixConfidenceThreshold}% — escalated.`,
      incident: escalated,
    };
  }

  updateIncident(id, { status: 'REMEDIATING' });
  const result = await dispatchAction(incident.auto_fix_action, incident);

  const updated = result.success
    ? updateIncident(id, {
        status: 'RESOLVED',
        resolved_at: new Date().toISOString(),
        resolution_notes: result.message,
      })
    : updateIncident(id, {
        status: 'ESCALATED',
        resolution_notes: `Auto-fix failed: ${result.message}`,
      });

  if (updated) await notifyIncident(updated, result.success ? 'RESOLVED (auto-fix)' : 'ESCALATED (fix failed)');
  return { ...result, incident: updated };
}
