import { AlertOctagon, BarChart3, Clock, TrendingUp } from 'lucide-react';
import {
  ErrorCodeChart,
  MttrChart,
  VolumeChart,
} from '@/components/SlaTrendCharts';
import {
  mockAccountHealth,
  mockErrorCodes,
  mockMTTRData,
  mockVolumeTrend,
} from '@/lib/mock-data';
import { cn, formatDuration, formatNumber, getStatusColor } from '@/lib/utils';

export default function SlaTrendsPage() {
  const latestMttr = mockMTTRData[mockMTTRData.length - 1].mttr_minutes;
  const firstMttr = mockMTTRData[0].mttr_minutes;
  const mttrDelta = Math.round(((latestMttr - firstMttr) / firstMttr) * 100);
  const totalVolume = mockVolumeTrend[mockVolumeTrend.length - 1].volume;

  return (
    <div className="px-6 py-6 lg:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
          <TrendingUp className="h-6 w-6 text-indigo-500" />
          SLA &amp; Trends
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Mean time to resolve, transfer volume, and error-code trends
        </p>
      </header>

      {/* Summary stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Current MTTR
            </p>
            <Clock className="h-5 w-5 text-indigo-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {latestMttr}m
          </p>
          <p
            className={cn(
              'mt-1 text-xs font-medium',
              mttrDelta <= 0
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            )}
          >
            {mttrDelta > 0 ? '+' : ''}
            {mttrDelta}% vs 8 weeks ago
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Weekly Volume
            </p>
            <BarChart3 className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {formatNumber(totalVolume)}
          </p>
          <p className="mt-1 text-xs text-gray-400">transfers in the last week</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Top Error
            </p>
            <AlertOctagon className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-3 font-mono text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
            {mockErrorCodes[0].code}
          </p>
          <p className="mt-1 text-xs text-gray-400">{mockErrorCodes[0].description}</p>
        </div>
      </section>

      {/* Charts */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
            MTTR Trend
          </h2>
          <p className="mb-4 text-xs text-gray-400">Mean time to resolve (minutes/week)</p>
          <MttrChart data={mockMTTRData} />
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
            Transfer Volume
          </h2>
          <p className="mb-4 text-xs text-gray-400">Weekly transfer count</p>
          <VolumeChart data={mockVolumeTrend} />
        </div>
      </section>

      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-1 text-base font-semibold text-gray-900 dark:text-white">
            Error Code Distribution
          </h2>
          <p className="mb-4 text-xs text-gray-400">Failures by error code (last 24h)</p>
          <ErrorCodeChart data={mockErrorCodes} />
        </div>

        {/* Account health table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Account Health (SLA)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 dark:border-gray-800">
                  <th className="px-5 py-2.5 font-medium">Account</th>
                  <th className="px-3 py-2.5 text-right font-medium">Success</th>
                  <th className="px-3 py-2.5 text-right font-medium">Avg latency</th>
                  <th className="px-5 py-2.5 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mockAccountHealth.map((acc) => (
                  <tr key={acc.account}>
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                      {acc.account}
                      <span className="block text-xs font-normal text-gray-400">
                        {formatNumber(acc.total_transfers)} transfers
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                      {(acc.success_rate * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-gray-600 dark:text-gray-300">
                      {formatDuration(acc.avg_latency_ms)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            getStatusColor(acc.status)
                          )}
                        />
                        <span className="text-xs capitalize text-gray-500 dark:text-gray-400">
                          {acc.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
