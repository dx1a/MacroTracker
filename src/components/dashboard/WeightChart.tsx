"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface WeightPoint {
  date: string;
  weight: number;
  smoothed: number;
}

interface WeightChartProps {
  data: WeightPoint[];
  goalWeight?: number;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "0.5rem",
      padding: "0.625rem 0.875rem",
      fontSize: "0.8rem",
    }}>
      <p style={{ color: "var(--color-muted)", marginBottom: "0.25rem" }}>{label}</p>
      <p style={{ color: "var(--color-foreground)", fontWeight: 700 }}>
        {payload[0]?.value?.toFixed(1)} lbs
      </p>
      {payload[1] && (
        <p style={{ color: "var(--color-primary-light)", fontSize: "0.75rem" }}>
          Trend: {payload[1]?.value?.toFixed(1)} lbs
        </p>
      )}
    </div>
  );
}

export function WeightChart({ data, goalWeight }: WeightChartProps) {
  if (data.length === 0) {
    return (
      <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
        No weight data yet. Log your weight to see trends.
      </div>
    );
  }

  const weights = data.map((d) => d.weight);
  const min = Math.min(...weights) - 3;
  const max = Math.max(...weights) + 3;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--color-muted)" }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min, max]}
          tick={{ fontSize: 11, fill: "var(--color-muted)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        {goalWeight && (
          <ReferenceLine
            y={goalWeight}
            stroke="var(--color-success)"
            strokeDasharray="4 4"
            label={{ value: "Goal", fill: "var(--color-success)", fontSize: 11 }}
          />
        )}
        <Area
          type="monotone"
          dataKey="weight"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#weightGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#8b5cf6" }}
        />
        <Area
          type="monotone"
          dataKey="smoothed"
          stroke="#a78bfa"
          strokeWidth={1.5}
          strokeDasharray="4 4"
          fill="none"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
