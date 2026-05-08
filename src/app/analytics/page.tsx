"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ReferenceLine, ComposedChart,
} from "recharts";
import { AppLayout } from "@/components/layout/AppLayout";
import { TrendingDown, TrendingUp, BarChart3, Activity } from "lucide-react";

interface AnalyticsData {
  weightHistory: { date: string; weight: number; smoothed: number }[];
  calorieHistory: { date: string; calories: number; target: number }[];
  macroHistory: { date: string; protein: number; carbs: number; fat: number }[];
  deficitHistory: { date: string; deficit: number }[];
  weeklyAdherence: { week: string; score: number }[];
  projection: { week: number; weight: number }[];
}

const RANGE_OPTIONS = [
  { label: "30d", days: 30 },
  { label: "60d", days: 60 },
  { label: "90d", days: 90 },
];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "0.5rem", padding: "0.625rem 0.875rem", fontSize: "0.8rem" }}>
      <p style={{ color: "var(--color-muted)", marginBottom: "0.35rem", fontWeight: 600 }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, fontWeight: 700 }}>
          {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
          {p.unit ?? ""}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div style={{ marginBottom: "1.25rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-muted)", fontSize: "0.875rem", flexDirection: "column", gap: "0.5rem" }}>
      <BarChart3 size={28} opacity={0.3} />
      {message}
    </div>
  );
}

export default function AnalyticsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState(60);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    setLoading(true);
    fetch(`/api/analytics?days=${range}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [status, range]);

  if (loading || !data) {
    return (
      <AppLayout>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div style={{ height: 40, width: "50%", borderRadius: "0.5rem", backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          {[240, 240, 200, 220].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: "1rem", backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      </AppLayout>
    );
  }

  const avgDeficit = data.deficitHistory.length > 0
    ? Math.round(data.deficitHistory.reduce((s, d) => s + d.deficit, 0) / data.deficitHistory.length)
    : 0;

  const weightTrend = data.weightHistory.length >= 2
    ? data.weightHistory[data.weightHistory.length - 1].weight - data.weightHistory[0].weight
    : 0;

  const avgAdherence = data.weeklyAdherence.length > 0
    ? Math.round(data.weeklyAdherence.reduce((s, w) => s + w.score, 0) / data.weeklyAdherence.length)
    : 0;

  const adherenceColor = avgAdherence >= 80 ? "var(--color-success)" : avgAdherence >= 60 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Analytics</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>Deep-dive into your progress</p>
          </div>
          <div style={{ display: "flex", gap: "0.375rem", backgroundColor: "var(--color-surface)", padding: "0.25rem", borderRadius: "0.625rem", border: "1px solid var(--color-border)" }}>
            {RANGE_OPTIONS.map(({ label, days }) => (
              <button
                key={days}
                onClick={() => setRange(days)}
                style={{
                  padding: "0.375rem 0.875rem", borderRadius: "0.5rem", border: "none", cursor: "pointer",
                  fontSize: "0.8rem", fontWeight: 600,
                  backgroundColor: range === days ? "var(--color-primary)" : "transparent",
                  color: range === days ? "white" : "var(--color-muted)",
                  transition: "all 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
          {[
            {
              label: "Weight Change",
              value: `${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)} lbs`,
              sub: `over ${range} days`,
              color: weightTrend <= 0 ? "var(--color-success)" : "var(--color-danger)",
              icon: weightTrend <= 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />,
            },
            {
              label: "Avg Daily Deficit",
              value: `${avgDeficit > 0 ? "−" : "+"}${Math.abs(avgDeficit)} kcal`,
              sub: avgDeficit > 0 ? "~" + (avgDeficit * range / 3500).toFixed(1) + " lbs projected" : "surplus",
              color: avgDeficit > 0 ? "var(--color-success)" : "var(--color-warning)",
              icon: <Activity size={16} />,
            },
            {
              label: "Avg Adherence",
              value: data.weeklyAdherence.length > 0 ? `${avgAdherence}%` : "—",
              sub: "weekly score",
              color: adherenceColor,
              icon: <BarChart3 size={16} />,
            },
            {
              label: "Days Tracked",
              value: data.calorieHistory.length,
              sub: `of ${range} days`,
              color: "var(--color-primary-light)",
              icon: <Activity size={16} />,
            },
          ].map(({ label, value, sub, color, icon }) => (
            <div key={label} className="card-sm" style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
                <span style={{ color }}>{icon}</span>
              </div>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</span>
              <span style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>{sub}</span>
            </div>
          ))}
        </div>

        {/* Weight history */}
        <ChartCard title="Weight History" subtitle="Raw (solid) · Smoothed trend (dashed)">
          {data.weightHistory.length < 2 ? (
            <EmptyChart message="Log your weight daily to see trends here." />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={data.weightHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="weight" name="Weight" stroke="#8b5cf6" strokeWidth={2} fill="url(#wGrad)" dot={false} unit=" lbs" />
                <Line type="monotone" dataKey="smoothed" name="Trend" stroke="#a78bfa" strokeWidth={1.5} strokeDasharray="5 5" dot={false} unit=" lbs" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Calorie vs target */}
        <ChartCard title="Calories vs Target" subtitle="Daily intake compared to your goal">
          {data.calorieHistory.length === 0 ? (
            <EmptyChart message="Start logging food to see calorie history." />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <ComposedChart data={data.calorieHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                {data.calorieHistory[0]?.target && (
                  <ReferenceLine y={data.calorieHistory[0].target} stroke="var(--color-primary)" strokeDasharray="5 5" label={{ value: "Target", fill: "var(--color-primary)", fontSize: 11 }} />
                )}
                <Bar dataKey="calories" name="Calories" fill="#8b5cf6" radius={[3, 3, 0, 0]} opacity={0.8} unit=" kcal" />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Macro breakdown stacked */}
        <ChartCard title="Daily Macro Breakdown" subtitle="Protein · Carbs · Fat trends">
          {data.macroHistory.length === 0 ? (
            <EmptyChart message="Start logging food to see macro history." />
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={data.macroHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: "0.78rem" }} />
                <Bar dataKey="protein" name="Protein" stackId="a" fill="var(--color-protein)" unit="g" />
                <Bar dataKey="carbs" name="Carbs" stackId="a" fill="var(--color-carbs)" unit="g" />
                <Bar dataKey="fat" name="Fat" stackId="a" fill="var(--color-fat)" radius={[3, 3, 0, 0]} unit="g" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Deficit / Surplus */}
        <ChartCard title="Daily Deficit / Surplus" subtitle="Positive = deficit (good for loss). Negative = surplus.">
          {data.deficitHistory.length === 0 ? (
            <EmptyChart message="Start logging food to see deficit trends." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={data.deficitHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="var(--color-border)" strokeWidth={2} />
                <Bar
                  dataKey="deficit"
                  name="Deficit"
                  fill="var(--color-success)"
                  radius={[3, 3, 0, 0]}
                  unit=" kcal"
                  // colour negative bars differently via cell
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Weekly adherence */}
        <ChartCard title="Weekly Adherence Score" subtitle="How closely you hit your calorie target each week">
          {data.weeklyAdherence.length === 0 ? (
            <EmptyChart message="Need at least one week of data." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.weeklyAdherence} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={80} stroke="var(--color-success)" strokeDasharray="4 4" label={{ value: "Great", fill: "var(--color-success)", fontSize: 10 }} />
                <Bar dataKey="score" name="Score" fill="var(--color-primary)" radius={[4, 4, 0, 0]} unit="%" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Weight projection */}
        <ChartCard title="12-Week Weight Projection" subtitle="Based on your current goal and rate of change">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.projection} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10d9a0" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10d9a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="week" tickFormatter={(v) => `Wk ${v}`} tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="weight" name="Projected" stroke="var(--color-protein)" strokeWidth={2} fill="url(#projGrad)" dot={{ r: 3, fill: "var(--color-protein)" }} unit=" lbs" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </AppLayout>
  );
}
