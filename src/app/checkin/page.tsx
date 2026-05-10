"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck, TrendingDown, TrendingUp, Minus,
  AlertTriangle, Flame, CheckCircle2, XCircle, Loader2,
  RefreshCw, History, Info, Zap,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import type { CheckInAnalysis, CheckInRec } from "@/lib/checkin";

interface CheckInRecord {
  id: string;
  recommendation: string;
  adjustment: number;
  reasoning: string;
  weeklyChange: number | null;
  status: string;
  caloriesBefore: number | null;
  caloriesAfter: number | null;
  createdAt: string;
}

interface CheckInData {
  analysis: CheckInAnalysis;
  history: CheckInRecord[];
  lastCheckInDate: string | null;
}

const REC_CONFIG: Record<CheckInRec | "insufficient_data", {
  icon: React.ReactNode;
  label: string;
  color: string;
  bg: string;
}> = {
  maintain:          { icon: <CheckCircle2 size={22} />, label: "On Track",          color: "var(--color-success)",       bg: "color-mix(in srgb, var(--color-success) 10%, transparent)" },
  cut:               { icon: <TrendingDown size={22} />, label: "Reduce Calories",   color: "var(--color-warning)",       bg: "color-mix(in srgb, var(--color-warning) 10%, transparent)" },
  add:               { icon: <TrendingUp size={22} />,   label: "Add Calories",      color: "var(--color-primary-light)", bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)" },
  water_weight:      { icon: <Info size={22} />,         label: "Water Weight Phase", color: "var(--color-primary-light)", bg: "color-mix(in srgb, var(--color-primary) 10%, transparent)" },
  refeed:            { icon: <Flame size={22} />,        label: "Refeed Day",        color: "var(--color-calories)",      bg: "color-mix(in srgb, var(--color-calories) 10%, transparent)" },
  insufficient_data: { icon: <Info size={22} />,         label: "Not Enough Data",   color: "var(--color-muted)",         bg: "color-mix(in srgb, var(--color-muted) 10%, transparent)" },
};

const STATUS_LABEL: Record<string, string> = {
  accepted: "Accepted",
  rejected:  "Rejected",
  pending:   "Pending",
};

const STATUS_COLOR: Record<string, string> = {
  accepted: "var(--color-success)",
  rejected:  "var(--color-danger)",
  pending:   "var(--color-muted)",
};

const REC_EMOJI: Record<string, string> = {
  maintain:          "✓",
  cut:               "↓",
  add:               "↑",
  water_weight:      "💧",
  refeed:            "🔥",
  insufficient_data: "—",
};

export default function CheckInPage() {
  const { status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<CheckInData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"adjust" | "refeed" | null>(null);
  const [done, setDone] = useState<{ type: "adjust" | "refeed"; status: "accepted" | "rejected" } | null>(null);
  const [newCalories, setNewCalories] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/checkin");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") load();
  }, [status, router, load]);

  async function respond(
    action: "adjust" | "refeed",
    accepted: boolean,
    analysis: CheckInAnalysis,
  ) {
    setActing(action);
    const res = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        status: accepted ? "accepted" : "rejected",
        recommendation: action === "refeed" ? "refeed" : analysis.recommendation,
        adjustment: action === "refeed" ? 0 : analysis.adjustment,
        reasoning: action === "refeed" ? "Refeed day scheduled" : analysis.reasoning,
        weeklyChange: analysis.weeklyChange,
        expectedChange: analysis.expectedWeeklyChange,
      }),
    });
    setActing(null);
    if (res.ok) {
      const json = await res.json();
      if (accepted && action === "adjust" && analysis.adjustment !== 0) {
        setNewCalories(json.caloriesAfter);
      }
      setDone({ type: action, status: accepted ? "accepted" : "rejected" });
      load(); // refresh history
    }
  }

  if (status === "loading" || loading) {
    return (
      <AppLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppLayout>
    );
  }

  if (!data) return null;

  const { analysis, history, lastCheckInDate } = data;
  const cfg = REC_CONFIG[analysis.recommendation as CheckInRec] ?? REC_CONFIG.insufficient_data;
  const hasAdjustment = analysis.recommendation === "cut" || analysis.recommendation === "add";
  const adjustDone = done?.type === "adjust";
  const refeedDone = done?.type === "refeed";

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "700px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", marginBottom: "0.2rem" }}>
              <ClipboardCheck size={22} color="var(--color-primary-light)" />
              <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Weekly Check-In</h1>
            </div>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              {lastCheckInDate
                ? `Last check-in: ${new Date(lastCheckInDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                : "First check-in"}
            </p>
          </div>
          <button
            onClick={() => { setDone(null); setNewCalories(null); load(); }}
            style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: "0.5rem", padding: "0.5rem 0.75rem", cursor: "pointer", color: "var(--color-muted)", display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.8rem" }}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {/* This week summary */}
        {analysis.thisWeekAvg !== null && analysis.lastWeekAvg !== null && (
          <div className="card">
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "1rem" }}>
              This Week's Summary
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
              {[
                { label: "Last Week Avg", value: `${analysis.lastWeekAvg.toFixed(1)} lbs`, color: "var(--color-foreground)" },
                { label: "This Week Avg", value: `${analysis.thisWeekAvg.toFixed(1)} lbs`, color: "var(--color-foreground)" },
                {
                  label: "Change",
                  value: analysis.weeklyChange !== null
                    ? `${analysis.weeklyChange >= 0 ? "+" : ""}${analysis.weeklyChange.toFixed(1)} lbs`
                    : "—",
                  color: analysis.weeklyChange === null ? "var(--color-muted)"
                    : analysis.weeklyChange < 0 && ["mild_loss","moderate_loss","aggressive_loss"].some(g => analysis.reasoning.includes(g))
                      ? "var(--color-success)"
                      : "var(--color-foreground)",
                },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: "center", padding: "0.875rem", backgroundColor: "var(--color-surface)", borderRadius: "0.75rem", border: "1px solid var(--color-border)" }}>
                  <p style={{ fontSize: "1.2rem", fontWeight: 800, color }}>{value}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "0.2rem", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
                </div>
              ))}
            </div>
            {analysis.expectedWeeklyChange !== 0 && analysis.weeklyChange !== null && (
              <div style={{ marginTop: "1rem", padding: "0.625rem 0.875rem", borderRadius: "0.5rem", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", fontSize: "0.8rem", color: "var(--color-muted)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <Minus size={14} style={{ flexShrink: 0 }} />
                Expected {analysis.expectedWeeklyChange > 0 ? "+" : ""}{analysis.expectedWeeklyChange} lbs/week · Logged {analysis.daysLogged.thisWeek} times this week, {analysis.daysLogged.lastWeek} times last week
              </div>
            )}
          </div>
        )}

        {/* New user water weight note */}
        {analysis.isNewUser && analysis.recommendation !== "insufficient_data" && (
          <div style={{ padding: "0.875rem 1rem", borderRadius: "0.75rem", backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <Info size={16} color="var(--color-primary-light)" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.82rem", color: "var(--color-muted)" }}>
              <strong style={{ color: "var(--color-primary-light)" }}>New user notice:</strong> You&apos;re {analysis.daysSinceFirstLog} days in. Early weight swings often include water weight changes — true fat loss trends take 3–4 weeks to emerge.
            </div>
          </div>
        )}

        {/* Main recommendation card */}
        <div className="card" style={{ borderColor: cfg.color, borderWidth: "1.5px", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: cfg.color }} />
          <div style={{ paddingTop: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <div style={{ width: 44, height: 44, borderRadius: "0.75rem", backgroundColor: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center", color: cfg.color, flexShrink: 0 }}>
                {cfg.icon}
              </div>
              <div>
                <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{cfg.label}</p>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: cfg.color }}>{analysis.reasoning}</h2>
              </div>
            </div>

            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "1.25rem" }}>
              {analysis.detail}
            </p>

            {/* Calorie change preview */}
            {hasAdjustment && !adjustDone && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", backgroundColor: "var(--color-surface)", borderRadius: "0.75rem", marginBottom: "1.25rem", border: "1px solid var(--color-border)" }}>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <p style={{ fontSize: "0.68rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Current</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 800 }}>{analysis.currentCalories.toLocaleString()}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>kcal/day</p>
                </div>
                <div style={{ color: cfg.color, fontSize: "1.25rem", fontWeight: 700 }}>
                  {analysis.adjustment > 0 ? "→ +" : "→ "}
                  {analysis.adjustment.toLocaleString()}
                </div>
                <div style={{ textAlign: "center", flex: 1 }}>
                  <p style={{ fontSize: "0.68rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>Proposed</p>
                  <p style={{ fontSize: "1.3rem", fontWeight: 800, color: cfg.color }}>{analysis.proposedCalories.toLocaleString()}</p>
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>kcal/day</p>
                </div>
              </div>
            )}

            {/* Accepted result */}
            {adjustDone && done?.status === "accepted" && newCalories && (
              <div style={{ padding: "0.875rem", backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)", borderRadius: "0.75rem", marginBottom: "1.25rem", border: "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <CheckCircle2 size={20} color="var(--color-success)" />
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-success)" }}>Adjustment applied</p>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Your new daily target is <strong style={{ color: "var(--color-foreground)" }}>{newCalories.toLocaleString()} kcal</strong></p>
                </div>
              </div>
            )}

            {/* Rejected result */}
            {adjustDone && done?.status === "rejected" && (
              <div style={{ padding: "0.875rem", backgroundColor: "color-mix(in srgb, var(--color-muted) 8%, transparent)", borderRadius: "0.75rem", marginBottom: "1.25rem", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <XCircle size={20} color="var(--color-muted)" />
                <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Adjustment skipped — keeping current target.</p>
              </div>
            )}

            {/* Action buttons */}
            {hasAdjustment && !adjustDone && (
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn-primary"
                  onClick={() => respond("adjust", true, analysis)}
                  disabled={acting !== null}
                  style={{ flex: 1, justifyContent: "center", padding: "0.75rem" }}
                >
                  {acting === "adjust" ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={16} />}
                  Accept Change
                </button>
                <button
                  onClick={() => respond("adjust", false, analysis)}
                  disabled={acting !== null}
                  style={{ flex: 1, justifyContent: "center", padding: "0.75rem", borderRadius: "0.625rem", border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-muted)", fontWeight: 600, fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <XCircle size={16} />
                  Reject
                </button>
              </div>
            )}

            {/* Dismiss for non-actionable */}
            {!hasAdjustment && !adjustDone && analysis.recommendation !== "insufficient_data" && (
              <button
                onClick={() => respond("adjust", true, analysis)}
                disabled={acting !== null}
                style={{ padding: "0.625rem 1.25rem", borderRadius: "0.625rem", border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-muted)", fontWeight: 600, fontSize: "0.8rem" }}
              >
                {acting ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Got it"}
              </button>
            )}
          </div>
        </div>

        {/* Refeed suggestion card */}
        {analysis.refeedSuggested && !refeedDone && (
          <div className="card" style={{ borderColor: "var(--color-calories)", borderWidth: "1.5px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", backgroundColor: "var(--color-calories)" }} />
            <div style={{ paddingTop: "0.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                <div style={{ width: 44, height: 44, borderRadius: "0.75rem", backgroundColor: "color-mix(in srgb, var(--color-calories) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Flame size={22} color="var(--color-calories)" />
                </div>
                <div>
                  <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Refeed Day Suggested</p>
                  <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--color-calories)" }}>Pick a day to eat at maintenance</h2>
                </div>
              </div>

              <p style={{ fontSize: "0.875rem", color: "var(--color-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
                You&apos;ve been in a consistent deficit for 2+ weeks and losing well. A <strong>refeed day</strong> — eating up to your TDEE — restores leptin, prevents metabolic slowdown, and keeps adherence strong. Prioritise carbs over fat for best effect.
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.875rem", backgroundColor: "var(--color-surface)", borderRadius: "0.75rem", marginBottom: "1.25rem", border: "1px solid var(--color-border)" }}>
                <Zap size={18} color="var(--color-calories)" />
                <div>
                  <p style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>Eat up to</p>
                  <p style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-calories)" }}>{analysis.refeedCalories.toLocaleString()} kcal</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>your TDEE · one day only · your normal target resumes after</p>
                </div>
              </div>

              {refeedDone && done?.status === "accepted" && (
                <div style={{ padding: "0.875rem", backgroundColor: "color-mix(in srgb, var(--color-success) 10%, transparent)", borderRadius: "0.75rem", marginBottom: "1rem", border: "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)", display: "flex", gap: "0.75rem" }}>
                  <CheckCircle2 size={18} color="var(--color-success)" />
                  <p style={{ fontSize: "0.875rem", color: "var(--color-success)", fontWeight: 600 }}>Refeed scheduled — enjoy it!</p>
                </div>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => respond("refeed", true, analysis)}
                  disabled={acting !== null}
                  style={{ flex: 1, justifyContent: "center", padding: "0.75rem", borderRadius: "0.625rem", border: "none", background: "color-mix(in srgb, var(--color-calories) 15%, transparent)", color: "var(--color-calories)", fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  {acting === "refeed" ? <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> : <Flame size={16} />}
                  Schedule Refeed
                </button>
                <button
                  onClick={() => respond("refeed", false, analysis)}
                  disabled={acting !== null}
                  style={{ padding: "0.75rem 1rem", borderRadius: "0.625rem", border: "1px solid var(--color-border)", background: "transparent", cursor: "pointer", color: "var(--color-muted)", fontWeight: 600, fontSize: "0.875rem" }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Refeed done callout */}
        {refeedDone && done?.status === "accepted" && (
          <div style={{ padding: "0.875rem 1rem", borderRadius: "0.75rem", backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--color-success) 20%, transparent)", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <CheckCircle2 size={18} color="var(--color-success)" />
            <p style={{ fontSize: "0.875rem", color: "var(--color-muted)" }}>Refeed logged — eat up to <strong style={{ color: "var(--color-foreground)" }}>{analysis.refeedCalories.toLocaleString()} kcal</strong> today, then resume your normal target tomorrow.</p>
          </div>
        )}

        {/* How this works */}
        <div className="card" style={{ backgroundColor: "var(--color-surface)" }}>
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, marginBottom: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={16} color="var(--color-muted)" />
            How adjustments work
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {[
              { icon: "↓", label: "Stalling", desc: "−125 kcal if losing less than 40% of expected rate for the week" },
              { icon: "↑", label: "Too fast", desc: "+150 kcal if losing more than 1.75× your target rate (protects muscle)" },
              { icon: "↑", label: "Scale going up", desc: "−150 kcal if you gained more than 0.3 lbs on a cut goal" },
              { icon: "🔥", label: "Refeed trigger", desc: "Suggested after 14+ days of consistent deficit with good progress — not on a fixed schedule" },
              { icon: "💧", label: "New user", desc: "No adjustments in first 2 weeks — early drops are mostly water weight" },
            ].map(({ icon, label, desc }) => (
              <div key={label} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", fontSize: "0.8rem" }}>
                <span style={{ fontWeight: 700, minWidth: "1.5rem", color: "var(--color-primary-light)" }}>{icon}</span>
                <span><strong>{label}:</strong> <span style={{ color: "var(--color-muted)" }}>{desc}</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <History size={15} />
              Past Check-Ins
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {history.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.75rem", borderRadius: "0.625rem", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: "1.1rem", minWidth: "1.5rem", textAlign: "center" }}>
                    {REC_EMOJI[c.recommendation] ?? "—"}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.82rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.reasoning}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>
                      {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {c.weeklyChange !== null && ` · ${c.weeklyChange >= 0 ? "+" : ""}${c.weeklyChange.toFixed(1)} lbs`}
                      {c.adjustment !== 0 && ` · ${c.adjustment > 0 ? "+" : ""}${c.adjustment} kcal`}
                    </p>
                  </div>
                  <span style={{ fontSize: "0.72rem", fontWeight: 600, color: STATUS_COLOR[c.status] ?? "var(--color-muted)", whiteSpace: "nowrap" }}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                  {c.caloriesAfter !== null && c.caloriesAfter !== c.caloriesBefore && (
                    <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                      → {c.caloriesAfter?.toLocaleString()} kcal
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Not enough data empty state */}
        {analysis.recommendation === "insufficient_data" && (
          <div className="card" style={{ textAlign: "center", padding: "2.5rem 2rem", color: "var(--color-muted)" }}>
            <AlertTriangle size={32} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{analysis.reasoning}</p>
            <p style={{ fontSize: "0.875rem" }}>{analysis.detail}</p>
          </div>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
