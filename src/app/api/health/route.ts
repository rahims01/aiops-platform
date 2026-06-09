import { NextResponse } from 'next/server';
import { getStats } from '@/lib/agent/store';
import { config } from '@/lib/agent/config';
import { getJvmMetrics, getDiskMetrics, listCertificates } from '@/lib/agent/mock-axway';

export const dynamic = 'force-dynamic';

/** GET /api/health — system health summary for the dashboard header. */
export async function GET() {
  const stats = await getStats();
  const [jvm, disk, certs] = await Promise.all([
    getJvmMetrics(),
    getDiskMetrics(),
    listCertificates(),
  ]);

  const expiringSoon = certs.filter(
    (c) => c.days_until_expiry <= config.certExpiryWarnDays,
  ).length;

  return NextResponse.json({
    status: stats.by_severity.P1 > 0 ? 'critical' : stats.open > 0 ? 'degraded' : 'healthy',
    open_incidents: stats.open,
    p1_count: stats.by_severity.P1,
    jvm_heap_pct: jvm.heap_pct,
    disk_used_pct: disk.used_pct,
    certs_expiring_soon: expiringSoon,
    mode: {
      axway: config.mockAxway ? 'mock' : 'real',
      llm: config.mockLlm ? 'mock' : 'real',
      model: config.anthropicModel,
    },
  });
}
