'use client';

import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BaselineData } from '@/lib/types';

interface ThroughputChartProps {
  data: BaselineData[];
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  const chartData = data.map((d) => ({
    time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit' }),
    actual: d.actual_throughput,
    expected: d.expected_throughput,
    band: [d.predicted_lower, d.predicted_upper] as [number, number],
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="time"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          interval={3}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: 8,
            fontSize: 12,
            color: '#f9fafb',
          }}
          labelStyle={{ color: '#9ca3af' }}
        />
        <Area
          type="monotone"
          dataKey="band"
          stroke="none"
          fill="#9ca3af"
          fillOpacity={0.12}
          name="Predicted range"
        />
        <Line
          type="monotone"
          dataKey="expected"
          stroke="#9ca3af"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          dot={false}
          name="Expected"
        />
        <Area
          type="monotone"
          dataKey="actual"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#actualFill)"
          dot={false}
          name="Actual"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
