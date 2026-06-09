'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Bot,
  CheckCircle2,
  Loader2,
  Play,
  Send,
  ShieldAlert,
  Sparkles,
  Wrench,
} from 'lucide-react';
import { cn, getPriorityColor, getIncidentStatusColor } from '@/lib/utils';
import type { ChatResponse, Incident } from '@/lib/types';

interface HealthSummary {
  status: string;
  open_incidents: number;
  p1_count: number;
  jvm_heap_pct: number;
  disk_used_pct: number;
  certs_expiring_soon: number;
  mode: { axway: string; llm: string; model: string };
}

export default function IncidentConsolePage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [health, setHealth] = useState<HealthSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const selected = incidents.find((i) => i.id === selectedId) ?? null;

  const refresh = useCallback(async () => {
    const [incRes, healthRes] = await Promise.all([
      fetch('/api/incidents').then((r) => r.json()),
      fetch('/api/health').then((r) => r.json()),
    ]);
    setIncidents(incRes.incidents ?? []);
    setHealth(healthRes);
    setSelectedId((cur) => cur ?? incRes.incidents?.[0]?.id ?? null);
  }, []);

  useEffect(() => {
    // Initial data fetch on mount; state updates happen after the awaited
    // network calls resolve (not synchronously within the effect body).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const runChecks = async () => {
    setRunning(true);
    try {
      await fetch('/api/checks/run', { method: 'POST' });
      await refresh();
    } finally {
      setRunning(false);
    }
  };

  const analyze = async (id: string) => {
    setBusyAction('analyze');
    try {
      const updated = (await fetch(`/api/incidents/${id}/analyze`, { method: 'POST' }).then((r) =>
        r.json(),
      )) as Incident;
      setIncidents((cur) => cur.map((i) => (i.id === id ? updated : i)));
    } finally {
      setBusyAction(null);
    }
  };

  const autoFix = async (id: string) => {
    setBusyAction('fix');
    try {
      const res = await fetch(`/api/incidents/${id}/fix`, { method: 'POST' }).then((r) => r.json());
      if (res.incident) setIncidents((cur) => cur.map((i) => (i.id === id ? res.incident : i)));
      await refresh();
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Incident Console</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Detect → Diagnose → Remediate, powered by the agentic engine
            </p>
          </div>
        </div>
        <button
          onClick={runChecks}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? 'Running checks…' : 'Run Checks'}
        </button>
      </div>

      {/* Health strip */}
      {health && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <HealthStat label="Open" value={health.open_incidents} icon={<AlertTriangle className="h-4 w-4" />} />
          <HealthStat label="P1" value={health.p1_count} danger={health.p1_count > 0} icon={<ShieldAlert className="h-4 w-4" />} />
          <HealthStat label="JVM heap" value={`${health.jvm_heap_pct}%`} danger={health.jvm_heap_pct >= 85} icon={<Activity className="h-4 w-4" />} />
          <HealthStat label="Disk" value={`${health.disk_used_pct}%`} danger={health.disk_used_pct >= 80} icon={<Activity className="h-4 w-4" />} />
          <HealthStat label="Certs ≤30d" value={health.certs_expiring_soon} icon={<AlertTriangle className="h-4 w-4" />} />
          <HealthStat label="LLM" value={health.mode.llm === 'real' ? health.mode.model : 'mock'} icon={<Bot className="h-4 w-4" />} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {/* Incident list */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Incidents ({incidents.length})
            </h2>
          </div>
          <ul className="max-h-[640px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
            {incidents.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                No incidents. Click <span className="font-medium">Run Checks</span> to detect issues.
              </li>
            )}
            {incidents.map((inc) => (
              <li key={inc.id}>
                <button
                  onClick={() => setSelectedId(inc.id)}
                  className={cn(
                    'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                    inc.id === selectedId
                      ? 'bg-indigo-50 dark:bg-indigo-950/40'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                  )}
                >
                  <span className={cn('mt-0.5 rounded px-1.5 py-0.5 text-xs font-bold', getPriorityColor(inc.severity))}>
                    {inc.severity}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900 dark:text-white">
                      {inc.title}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', getIncidentStatusColor(inc.status))}>
                        {inc.status}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{inc.category}</span>
                      {inc.confidence != null && (
                        <span className="text-xs text-gray-400">· {inc.confidence}% conf</span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          {selected ? (
            <IncidentDetail
              incident={selected}
              busyAction={busyAction}
              onAnalyze={() => analyze(selected.id)}
              onAutoFix={() => autoFix(selected.id)}
            />
          ) : (
            <div className="flex h-full min-h-[300px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              Select an incident to view details.
            </div>
          )}
        </div>
      </div>

      <ChatAssistant />
    </div>
  );
}

function HealthStat({
  label,
  value,
  icon,
  danger,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
        {icon}
        {label}
      </div>
      <div className={cn('mt-1 text-lg font-bold', danger ? 'text-red-500' : 'text-gray-900 dark:text-white')}>
        {value}
      </div>
    </div>
  );
}

function IncidentDetail({
  incident,
  busyAction,
  onAnalyze,
  onAutoFix,
}: {
  incident: Incident;
  busyAction: string | null;
  onAnalyze: () => void;
  onAutoFix: () => void;
}) {
  const analyzed = !!incident.root_cause;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('rounded px-2 py-0.5 text-xs font-bold', getPriorityColor(incident.severity))}>
              {incident.severity}
            </span>
            <span className={cn('rounded px-2 py-0.5 text-xs font-semibold', getIncidentStatusColor(incident.status))}>
              {incident.status}
            </span>
            <span className="text-xs text-gray-400">{incident.incident_number}</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{incident.title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{incident.description}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <Meta label="Category" value={incident.category} />
        <Meta label="Partner" value={incident.partner_name ?? '—'} />
        <Meta label="Protocol" value={incident.protocol ?? '—'} />
        <Meta label="Source check" value={incident.source_check} />
      </dl>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={onAnalyze}
          disabled={busyAction != null}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-500 disabled:opacity-60"
        >
          {busyAction === 'analyze' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {analyzed ? 'Re-analyze' : 'Analyze (RCA)'}
        </button>
        <button
          onClick={onAutoFix}
          disabled={busyAction != null || !incident.auto_fixable}
          title={incident.auto_fixable ? undefined : 'Not auto-fixable — requires human action'}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {busyAction === 'fix' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
          Auto-Fix
        </button>
      </div>

      {/* RCA */}
      {analyzed && (
        <div className="mt-6 space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
              <Bot className="h-4 w-4 text-purple-500" /> Root Cause Analysis
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Confidence</span>
              <span
                className={cn(
                  'rounded px-2 py-0.5 font-bold',
                  (incident.confidence ?? 0) >= 85
                    ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
                )}
              >
                {incident.confidence}%
              </span>
            </div>
          </div>
          <Field label="Root cause" value={incident.root_cause} />
          <Field label="Evidence" value={incident.evidence} mono />
          {incident.fix_steps && incident.fix_steps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fix steps</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-gray-700 dark:text-gray-300">
                {incident.fix_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Safety notes" value={incident.safety_notes} />
            <Field label="Escalate if" value={incident.escalate_if} />
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>
              Auto-fixable:{' '}
              <span className={incident.auto_fixable ? 'text-green-500' : 'text-gray-400'}>
                {incident.auto_fixable ? 'yes' : 'no'}
              </span>
            </span>
            {incident.auto_fix_action && <span>Action: {incident.auto_fix_action}</span>}
            {incident.estimated_fix_minutes != null && <span>ETA: ~{incident.estimated_fix_minutes} min</span>}
          </div>
        </div>
      )}

      {incident.resolution_notes && (
        <div className="mt-4 flex items-start gap-2 rounded-lg bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{incident.resolution_notes}</span>
        </div>
      )}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="font-medium text-gray-800 dark:text-gray-200">{value}</dd>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={cn('mt-1 text-sm text-gray-700 dark:text-gray-300', mono && 'font-mono text-xs')}>{value}</p>
    </div>
  );
}

function ChatAssistant() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: message }]);
    setSending(true);
    try {
      const res = (await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
      }).then((r) => r.json())) as ChatResponse;
      setMessages((m) => [...m, { role: 'assistant', content: res.answer }]);
      setSuggestions(res.follow_up_suggestions ?? []);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <Bot className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Ask the Axway Assistant</h2>
      </div>
      <div className="space-y-3 px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Ask about partners, certificates, error codes, or remediation steps.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex items-center gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-800"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Why is Partner Bank Inc failing?"
          className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
