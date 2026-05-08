"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Flame, Target, TrendingDown, Trophy, Zap,
  Plus, ArrowRight, Activity, Droplets,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MacroRing } from "@/components/dashboard/MacroRing";
import { MacroBar } from "@/components/dashboard/MacroBar";
import { CarbFatBudget } from "@/components/dashboard/CarbFatBudget";
import { WeightChart } from "@/components/dashboard/WeightChart";
import { StatCard } from "@/components/dashboard/StatCard";
import { SuggestionBanner } from "@/components/dashboard/SuggestionBanner";
import { WeightLogModal } from "@/components/dashboard/WeightLogModal";
import { WaterTracker } from "@/components/dashboard/WaterTracker";
import { useDashboard } from "@/store/useDashboard";
import { formatDate, getGoalLabel } from "@/lib/utils";
import { calculateTimeline, calculateWaterGoal } from "@/lib/calculations";

export default function DashboardPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data, loading, fetch } = useDashboard();
  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") fetch();
  }, [status, router, fetch]);

  if (status === "loading" || loading) return <AppLayout><DashboardSkeleton /></AppLayout>;
  if (!data) return null;

  const { todayMacros, profile, weeklyStats, streak, adherenceScore, suggestions, recentWeights, todayWaterMl } = data;

  const waterGoalMl = profile?.waterGoal
    ?? (profile?.currentWeight && profile?.gender && profile?.activityLevel && profile?.goal
      ? calculateWaterGoal(profile.currentWeight, profile.gender, profile.activityLevel, profile.goal)
      : 2500);
  const isAutoWaterGoal = !profile?.waterGoal;

  const calorieTarget = profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;
  const proteinTarget = profile?.proteinTarget ?? 150;
  const carbTarget = profile?.carbTarget ?? 200;
  const fatTarget = profile?.fatTarget ?? 65;
  const deficit = calorieTarget - todayMacros.calories;
  const weeklyAvgDeficit = calorieTarget - weeklyStats.avgCalories;

  const weeksToGoal = profile?.currentWeight && profile?.goalWeight && profile?.goal
    ? calculateTimeline(profile.currentWeight, profile.goalWeight, profile.goal as "maintain" | "lean_bulk" | "mild_loss" | "moderate_loss" | "aggressive_loss")
    : null;

  const targetDate = weeksToGoal
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + weeksToGoal * 7);
        return formatDate(d);
      })()
    : null;

  const streakColor = streak.current >= 7 ? "var(--color-success)" : streak.current >= 3 ? "var(--color-warning)" : "var(--color-muted)";
  const adherenceColor = adherenceScore >= 80 ? "var(--color-success)" : adherenceScore >= 60 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.2rem" }}>Dashboard</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              {profile?.goal && (
                <span style={{ marginLeft: "0.75rem", color: "var(--color-primary-light)" }}>
                  · {getGoalLabel(profile.goal)}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <WeightLogModal />
            <Link href="/log" className="btn-primary" style={{ textDecoration: "none" }}>
              <Plus size={16} />
              Log Food
            </Link>
          </div>
        </div>

        {/* Smart Suggestions */}
        {suggestions.length > 0 && <SuggestionBanner suggestions={suggestions} />}

        {/* No profile warning */}
        {!profile?.calorieTarget && (
          <div style={{
            padding: "1rem 1.25rem",
            borderRadius: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <Target size={18} color="var(--color-warning)" />
              <p style={{ fontSize: "0.875rem" }}>
                <strong>Set up your profile</strong> to get personalised calorie and macro targets.
              </p>
            </div>
            <Link href="/profile" style={{ fontSize: "0.8rem", color: "var(--color-warning)", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "0.25rem" }}>
              Set up <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Main calorie + macro row */}
        <div className="layout-main-grid">
          {/* Calorie ring */}
          <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem", padding: "1.75rem" }}>
            <MacroRing calories={todayMacros.calories} target={calorieTarget} size={190} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                Target
              </p>
              <p style={{ fontSize: "1.1rem", fontWeight: 700 }}>{calorieTarget.toLocaleString()} kcal</p>
              {profile?.adaptiveCalories && profile.calorieTarget && profile.adaptiveCalories !== profile.calorieTarget && (
                <p style={{ fontSize: "0.7rem", color: "var(--color-primary-light)", marginTop: "0.25rem" }}>
                  ✦ Adaptively adjusted
                </p>
              )}
            </div>
          </div>

          {/* Macro bars */}
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Macros
            </h3>
            <MacroBar label="Protein" value={todayMacros.protein} target={proteinTarget} color="var(--color-protein)" />
            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <CarbFatBudget
                carbs={todayMacros.carbs}
                fat={todayMacros.fat}
                carbTarget={carbTarget}
                fatTarget={fatTarget}
                calorieTarget={calorieTarget}
                proteinTarget={proteinTarget}
              />
            </div>

            {/* Micro info */}
            {(todayMacros.fiber > 0 || todayMacros.sodium > 0) && (
              <div style={{ display: "flex", gap: "1rem", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)" }}>
                {todayMacros.fiber > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
                    🌾 Fiber: <strong style={{ color: "var(--color-foreground)" }}>{Math.round(todayMacros.fiber)}g</strong>
                  </span>
                )}
                {todayMacros.sodium > 0 && (
                  <span style={{ fontSize: "0.78rem", color: "var(--color-muted)" }}>
                    🧂 Sodium: <strong style={{ color: "var(--color-foreground)" }}>{Math.round(todayMacros.sodium)}mg</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stat cards row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem" }}>
          <StatCard
            label="Today's Deficit"
            value={deficit > 0 ? `−${Math.round(deficit)}` : `+${Math.round(Math.abs(deficit))}`}
            sub="kcal"
            accent={deficit > 0 ? "var(--color-success)" : "var(--color-danger)"}
            icon={<TrendingDown size={16} />}
          />
          <StatCard
            label="Weekly Avg"
            value={weeklyStats.avgCalories > 0 ? weeklyStats.avgCalories.toLocaleString() : "—"}
            sub={`${weeklyStats.daysLogged}/7 days logged`}
            icon={<Flame size={16} />}
          />
          <StatCard
            label="Avg Deficit"
            value={weeklyStats.avgCalories > 0 ? `${weeklyAvgDeficit > 0 ? "−" : "+"}${Math.abs(Math.round(weeklyAvgDeficit))}` : "—"}
            sub="kcal / day this week"
            accent={weeklyAvgDeficit > 0 ? "var(--color-success)" : "var(--color-danger)"}
            icon={<Activity size={16} />}
          />
          <StatCard
            label="Streak"
            value={streak.current > 0 ? `${streak.current} days` : "—"}
            sub={`Best: ${streak.longest} days`}
            accent={streakColor}
            icon={<Zap size={16} />}
          />
          <StatCard
            label="Adherence"
            value={weeklyStats.daysLogged > 0 ? `${adherenceScore}%` : "—"}
            sub="7-day score"
            accent={weeklyStats.daysLogged > 0 ? adherenceColor : "var(--color-muted)"}
            icon={<Trophy size={16} />}
          />
          {targetDate && (
            <StatCard
              label="Target Date"
              value={targetDate}
              sub={`${weeksToGoal} weeks away`}
              icon={<Target size={16} />}
            />
          )}
        </div>

        {/* Water tracker */}
        <div className="card">
          <WaterTracker
            initialMl={todayWaterMl}
            goalMl={waterGoalMl}
            date={todayStr}
            isAutoGoal={isAutoWaterGoal}
          />
        </div>

        {/* Weight trend chart */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Weight Trend</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>
                Last 30 days · Dashed = smoothed trend
              </p>
            </div>
            {recentWeights.length > 0 && (
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "1.25rem", fontWeight: 800 }}>
                  {recentWeights[recentWeights.length - 1].weight.toFixed(1)} lbs
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>Latest</p>
              </div>
            )}
          </div>
          <WeightChart data={recentWeights} goalWeight={profile?.goalWeight ?? undefined} />
        </div>

        {/* Weekly macro breakdown */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Weekly Average Macros</h3>
          <div className="layout-weekly-grid">
            {[
              { label: "Calories", value: weeklyStats.avgCalories, unit: "kcal", color: "var(--color-calories)" },
              { label: "Protein", value: weeklyStats.avgProtein, unit: "g", color: "var(--color-protein)" },
              { label: "Carbs", value: weeklyStats.avgCarbs, unit: "g", color: "var(--color-carbs)" },
              { label: "Fat", value: weeklyStats.avgFat, unit: "g", color: "var(--color-fat)" },
            ].map(({ label, value, unit, color }) => (
              <div key={label} style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "1rem", borderRadius: "0.75rem",
                backgroundColor: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: color, marginBottom: "0.5rem" }} />
                <span style={{ fontSize: "1.4rem", fontWeight: 800, color }}>
                  {value > 0 ? value.toLocaleString() : "—"}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{unit}</span>
                <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.3rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick nav to analytics */}
        <Link href="/analytics" style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
          padding: "0.875rem", borderRadius: "0.75rem",
          backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)",
          textDecoration: "none", color: "var(--color-muted)", fontSize: "0.875rem", fontWeight: 500,
          transition: "all 0.2s",
        }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-primary)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-primary-light)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)";
            (e.currentTarget as HTMLElement).style.color = "var(--color-muted)";
          }}
        >
          View Full Analytics <ArrowRight size={16} />
        </Link>

      </div>
    </AppLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {[280, 100, 200, 120].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: "1rem",
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          animation: "pulse 1.5s ease-in-out infinite",
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
    </div>
  );
}
