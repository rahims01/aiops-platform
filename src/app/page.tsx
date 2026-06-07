import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle,
  Cpu,
  HardDrive,
  Layers,
  type LucideIcon,
  MemoryStick,
  Server,
  ShieldAlert,
} from 'lucide-react';
import { ThroughputChart } from '@/components/ThroughputChart';
import {
  mockAlerts,
  mockBaselineData,
  mockFailurePredictions,
  mockMetricCards,
  mockNodeHealth,
} from '@/lib/mock-data';
import type { MetricCard, NodeHealth } from '@/lib/types';
import {
  cn,
  getRiskColor,
  getSeverityColor,
  getStatusColor,
} from '@/lib/utils';

const metricIcons: Record<string, LucideIcon> = {
  'check-circle': CheckCircle,
  activity: Activity,
  'alert-triangle': AlertTriangle,
  server: Server,
};

const statusTone: Record<MetricCard['status'], string> = {
  good: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  critical: 'text-red-600 dark:text-red-400',
};

function MetricCardTile({ card }: { card: MetricCard }) {
  const Icon = metricIcons[card.icon] ?? Activity;
  const positive = (card.change ?? 0) >= 0;
  const Trend = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {card.title}
        </p>
        <Icon className={cn('h-5 w-5', statusTone[card.status])} />
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
        {card.value}
      </p>
      {card.change !== undefined && (
        <div className="mt-2 flex items-center gap-1 text-xs">
          <Trend
            className={cn(
              'h-3.5 w-3.5',
              positive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          />
          <span
            className={cn(
              'font-medium',
              positive
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {Math.abs(card.change)}
            {typeof card.value === 'string' && card.value.includes('%') ? '%' : ''}
          </span>
          <span className="text-gray-400">{card.changeLabel}</span>
        </div>
      )}
    </div>
  );
}

function NodeRow({ node }: { node: NodeHealth }) {
  const certCritical = node.cert_expiry_days <= 7;
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <span
        className={cn('h-2.5 w-2.5 shrink-0 rounded-full', getStatusColor(node.status))}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
          {node.node}
        </p>
        <p className="text-xs text-gray-400">{node.cluster}</p>
      </div>
      <div className="hidden items-center gap-5 text-xs text-gray-500 dark:text-gray-400 sm:flex">
        <span className="flex items-center gap-1" title="CPU">
          <Cpu className="h-3.5 w-3.5" /> {node.cpu_percent}%
        </span>
        <span className="flex items-center gap-1" title="Memory">
          <MemoryStick className="h-3.5 w-3.5" /> {node.memory_percent}%
        </span>
        <span className="flex items-center gap-1" title="Disk">
          <HardDrive className="h-3.5 w-3.5" /> {node.disk_percent}%
        </span>
        <span className="flex items-center gap-1" title="Queue depth">
          <Layers className="h-3.5 w-3.5" /> {node.queue_depth}
        </span>
      </div>
      <span
        className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
          certCritical
            ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        )}
        title="Certificate expiry"
      >
        cert {node.cert_expiry_days}d
      </span>
    </div>
  );
}

export default function Home() {
  const unacknowledged = mockAlerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="px-6 py-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
            Health Overview
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time SecureTransport file transfer monitoring · prod-us-east
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          Live
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockMetricCards.map((card) => (
          <MetricCardTile key={card.title} card={card} />
        ))}
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Throughput vs ML baseline */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Transfer Throughput
              </h2>
              <p className="text-xs text-gray-400">
                Actual vs ML-predicted baseline (transfers/hour, last 24h)
              </p>
            </div>
            <Brain className="h-5 w-5 text-indigo-500" />
          </div>
          <ThroughputChart data={mockBaselineData} />
        </div>

        {/* Failure predictions */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Failure Predictions
            </h2>
            <ShieldAlert className="h-5 w-5 text-orange-500" />
          </div>
          <ul className="space-y-4">
            {mockFailurePredictions.map((p) => (
              <li key={p.node}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {p.node}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white',
                      getRiskColor(p.risk_level)
                    )}
                  >
                    {p.risk_level}
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn('h-full rounded-full', getRiskColor(p.risk_level))}
                    style={{ width: `${Math.round(p.probability * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {Math.round(p.probability * 100)}% failure risk · within{' '}
                  {p.predicted_within_minutes}m
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Node health */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Node Health
            </h2>
            <span className="text-xs text-gray-400">{mockNodeHealth.length} nodes</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {mockNodeHealth.map((node) => (
              <NodeRow key={node.node} node={node} />
            ))}
          </div>
        </div>

        {/* Active alerts */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Active Alerts
            </h2>
            {unacknowledged > 0 && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-300">
                {unacknowledged} new
              </span>
            )}
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {mockAlerts.map((alert) => (
              <li key={alert.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                      getSeverityColor(alert.severity)
                    )}
                  >
                    {alert.severity}
                  </span>
                  {!alert.acknowledged && (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-gray-900 dark:text-white">
                  {alert.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                  {alert.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
