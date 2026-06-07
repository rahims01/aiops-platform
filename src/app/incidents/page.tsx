import {
  AlertTriangle,
  CircleDot,
  Clock,
  GitGraph,
  User,
  Users,
} from 'lucide-react';
import { mockAlerts, mockIncidents } from '@/lib/mock-data';
import type { CorrelatedIncident } from '@/lib/types';
import { cn, getSeverityColor } from '@/lib/utils';

const stateTone: Record<CorrelatedIncident['state'], string> = {
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
  on_hold: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  closed: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function IncidentsPage() {
  // Newest first.
  const incidents = [...mockIncidents].sort(
    (a, b) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime()
  );
  const openCount = incidents.filter(
    (i) => i.state !== 'resolved' && i.state !== 'closed'
  ).length;

  return (
    <div className="px-6 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            <GitGraph className="h-6 w-6 text-indigo-500" />
            Incident Timeline
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            ServiceNow incidents correlated with SecureTransport failures
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          {openCount} open
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="lg:col-span-2">
          <ol className="relative space-y-4 border-l border-gray-200 pl-6 dark:border-gray-800">
            {incidents.map((inc) => (
              <li key={inc.incident_id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[1.9rem] mt-1.5 h-3 w-3 rounded-full ring-4 ring-gray-50 dark:ring-gray-950',
                    getSeverityColor(inc.severity).split(' ')[0]
                  )}
                  aria-hidden="true"
                />
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                      {inc.incident_id}
                    </span>
                    <span
                      className={cn(
                        'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        getSeverityColor(inc.severity)
                      )}
                    >
                      {inc.severity}
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium capitalize',
                        stateTone[inc.state]
                      )}
                    >
                      {inc.state.replace('_', ' ')}
                    </span>
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" />
                      {timeAgo(inc.opened_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                    {inc.category}
                  </p>
                  <p className="text-xs text-gray-400">
                    CI: {inc.ci_name} · opened {formatTimestamp(inc.opened_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" /> {inc.assigned_to}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {inc.assignment_group}
                    </span>
                    <span>
                      Impact {inc.impact} · Urgency {inc.urgency}
                    </span>
                  </div>
                  {inc.related_transfers.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3 dark:border-gray-800">
                      <span className="text-xs text-gray-400">Related transfers:</span>
                      {inc.related_transfers.map((t) => (
                        <span
                          key={t}
                          className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Alert feed */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <CircleDot className="h-4 w-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Correlated Alerts
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {mockAlerts.map((alert) => (
              <li key={alert.id} className="px-5 py-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      getSeverityColor(alert.severity)
                    )}
                  >
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-400">{timeAgo(alert.timestamp)}</span>
                </div>
                <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
                  {alert.title}
                </p>
                {alert.incident_id && (
                  <p className="mt-0.5 font-mono text-xs text-indigo-500">
                    {alert.incident_id}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
