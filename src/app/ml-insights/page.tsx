import { Activity, Brain, ShieldAlert, Target } from 'lucide-react';
import {
  mockAnomalyScores,
  mockFailurePredictions,
  mockRootCauses,
} from '@/lib/mock-data';
import type { RootCauseCandidate } from '@/lib/types';
import { cn, getRiskColor } from '@/lib/utils';

const categoryTone: Record<RootCauseCandidate['category'], string> = {
  certificate: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  network: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  configuration: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  capacity: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  external: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
};

export default function MlInsightsPage() {
  const anomalies = [...mockAnomalyScores].sort((a, b) => b.score - a.score);
  const rootCauses = [...mockRootCauses].sort((a, b) => b.score - a.score);

  return (
    <div className="px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          <Brain className="h-6 w-6 text-indigo-500" />
          ML Insights
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Anomaly detection, XGBoost failure predictions, and ranked root-cause analysis
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Anomaly detection */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <Activity className="h-4 w-4 text-indigo-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Anomaly Detection
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {anomalies.map((a, i) => (
              <li key={`${a.account}-${a.timestamp}-${i}`} className="px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {a.account}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      a.is_anomaly
                        ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                        : 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300'
                    )}
                  >
                    {a.is_anomaly ? 'anomaly' : 'normal'}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {a.node} · {a.metric.replace('_', ' ')}
                </p>
                {/* Score vs threshold bar */}
                <div className="relative mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      a.is_anomaly ? 'bg-red-500' : 'bg-green-500'
                    )}
                    style={{ width: `${Math.round(a.score * 100)}%` }}
                  />
                  <div
                    className="absolute top-[-2px] h-3 w-0.5 bg-gray-500 dark:bg-gray-400"
                    style={{ left: `${Math.round(a.threshold * 100)}%` }}
                    title={`threshold ${a.threshold}`}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  score {a.score.toFixed(2)} · threshold {a.threshold.toFixed(2)} · value{' '}
                  {a.value} vs baseline {a.baseline}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Failure predictions */}
        <section className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <ShieldAlert className="h-4 w-4 text-orange-500" />
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Failure Predictions
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {mockFailurePredictions.map((p) => (
              <li key={p.node} className="px-5 py-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-900 dark:text-white">{p.node}</span>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium capitalize text-white',
                      getRiskColor(p.risk_level)
                    )}
                  >
                    {p.risk_level}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  {Math.round(p.probability * 100)}% failure risk · within{' '}
                  {p.predicted_within_minutes}m
                </p>
                <ul className="mt-3 space-y-1.5">
                  {p.factors.map((f) => (
                    <li key={f.name} className="text-xs">
                      <div className="flex items-center justify-between text-gray-500 dark:text-gray-400">
                        <span>{f.name}</span>
                        <span className="tabular-nums">
                          {f.value} · w{f.weight}
                        </span>
                      </div>
                      <div className="mt-0.5 h-1 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-indigo-500"
                          style={{ width: `${Math.round(f.weight * 100)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Root cause analysis */}
      <section className="mt-6 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <Target className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Root Cause Candidates
          </h2>
        </div>
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {rootCauses.map((rc) => (
            <li key={rc.cause} className="px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    categoryTone[rc.category]
                  )}
                >
                  {rc.category}
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {rc.cause}
                </span>
                <span className="ml-auto text-sm font-semibold tabular-nums text-indigo-500">
                  {Math.round(rc.score * 100)}%
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${Math.round(rc.score * 100)}%` }}
                />
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-gray-500 dark:text-gray-400">
                {rc.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
