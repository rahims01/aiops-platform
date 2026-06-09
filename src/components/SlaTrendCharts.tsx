'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ErrorCodeDistribution } from '@/lib/types';

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 8,
  fontSize: 12,
  color: '#f9fafb',
} as const;

const axisTick = { fontSize: 11, fill: '#9ca3af' } as const;

export function MttrChart({ data }: { data: { week: string; mttr_minutes: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb33" vertical={false} />
        <XAxis dataKey="week" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis tick={axisTick} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#9ca3af' }}
          cursor={{ fill: '#6366f111' }}
          formatter={(v) => [`${v} min`, 'MTTR']}
        />
        <Bar dataKey="mttr_minutes" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function VolumeChart({ data }: { data: { date: string; volume: number }[] }) {
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    volume: d.volume,
  }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb33" vertical={false} />
        <XAxis dataKey="date" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          tick={axisTick}
          axisLine={false}
          tickLine={false}
          width={52}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={{ color: '#9ca3af' }}
          formatter={(v) => [Number(v).toLocaleString(), 'Transfers']}
        />
        <Area
          type="monotone"
          dataKey="volume"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#volumeFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ErrorCodeChart({ data }: { data: ErrorCodeDistribution[] }) {
  const palette = ['#ef4444', '#f97316', '#f59e0b', '#6366f1', '#8b5cf6'];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 0, left: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb33" horizontal={false} />
        <XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="code"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={92}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          cursor={{ fill: '#6366f111' }}
          formatter={(v, _name, item) => [
            `${v} occurrences`,
            (item?.payload as ErrorCodeDistribution)?.description,
          ]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
