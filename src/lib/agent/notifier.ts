/**
 * Multi-channel notifications. Slack / Teams when configured, console otherwise.
 * Real integrations are stubbed behind the config flags so the platform runs
 * without any webhook URLs. Server-only module.
 */

import { config } from './config';
import type { Incident } from '../types';

const SEVERITY_EMOJI: Record<string, string> = {
  P1: '🔴',
  P2: '🟠',
  P3: '🟡',
  P4: '🔵',
};

export async function notifyIncident(incident: Incident, event: string): Promise<void> {
  const emoji = SEVERITY_EMOJI[incident.severity] ?? '⚪';
  const line = `${emoji} [${incident.severity}] ${event}: ${incident.title} (${incident.incident_number})`;

  if (config.slackEnabled) {
    try {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.slackBotToken}`,
        },
        body: JSON.stringify({ channel: config.slackAlertChannel, text: line }),
      });
    } catch (err) {
      console.error('Slack notification failed:', err);
    }
  }

  if (config.teamsEnabled) {
    try {
      await fetch(config.teamsWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          '@type': 'MessageCard',
          summary: incident.title,
          title: `${emoji} ${event}`,
          text: incident.title,
        }),
      });
    } catch (err) {
      console.error('Teams notification failed:', err);
    }
  }

  if (!config.slackEnabled && !config.teamsEnabled) {
    console.info(`[notify] ${line}`);
  }
}
