'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface YieldChartProps {
  data: { date: string; yield: number }[];
}

export default function YieldChart({ data }: YieldChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No yield data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis
          dataKey="date"
          stroke="#525252"
          tick={{ fill: '#737373', fontSize: 12 }}
        />
        <YAxis
          stroke="#525252"
          tick={{ fill: '#737373', fontSize: 12 }}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#141414',
            border: '1px solid #262626',
            borderRadius: '8px',
            color: '#fff',
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Yield']}
        />
        <Line
          type="monotone"
          dataKey="yield"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
