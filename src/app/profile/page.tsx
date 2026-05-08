"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, Info } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  calculateBMR,
  calculateTDEE,
  calculateCalorieTarget,
  calculateMacroTargets,
  calculateTimeline,
} from "@/lib/calculations";
import { getGoalLabel, getActivityLabel, formatDate } from "@/lib/utils";
import { useDashboard } from "@/store/useDashboard";

type Gender = "male" | "female" | "other";
type Activity = "sedentary" | "light" | "moderate" | "active" | "very_active";
type Goal = "maintain" | "lean_bulk" | "mild_loss" | "moderate_loss" | "aggressive_loss";

interface FormState {
  age: string;
  gender: Gender;
  heightFt: string;
  heightIn: string;
  currentWeight: string;
  goalWeight: string;
  activityLevel: Activity;
  goal: Goal;
}

const GOALS: { value: Goal; label: string; desc: string; color: string }[] = [
  { value: "aggressive_loss", label: "Aggressive Loss", desc: "~2 lbs/week · Large deficit", color: "var(--color-danger)" },
  { value: "moderate_loss", label: "Moderate Loss", desc: "~1 lb/week · Recommended", color: "var(--color-warning)" },
  { value: "mild_loss", label: "Mild Loss", desc: "~0.5 lb/week · Sustainable", color: "var(--color-success)" },
  { value: "maintain", label: "Maintain", desc: "No weight change", color: "var(--color-primary-light)" },
  { value: "lean_bulk", label: "Lean Bulk", desc: "~0.25 lb/week · Slow build", color: "var(--color-protein)" },
];

const ACTIVITIES: { value: Activity; label: string; sub: string }[] = [
  { value: "sedentary", label: "Sedentary", sub: "Desk job or minimal daily movement, no structured exercise" },
  { value: "light", label: "Exercise", sub: "15–30 minutes of elevated heart rate activity" },
  { value: "moderate", label: "Intense Exercise", sub: "45–120 minutes of elevated heart rate activity" },
  { value: "active", label: "Very Intense Exercise", sub: "2+ hours of elevated heart rate activity" },
  { value: "very_active", label: "Very Intense Exercise (Daily)", sub: "2+ hours daily, or physically demanding job + training" },
];

export default function ProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const { fetch: refetchDashboard } = useDashboard();

  const [form, setForm] = useState<FormState>({
    age: "", gender: "male",
    heightFt: "", heightIn: "",
    currentWeight: "", goalWeight: "",
    activityLevel: "moderate",
    goal: "moderate_loss",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => {
        if (!p) { setLoading(false); return; }
        const htCm = p.heightCm ?? 0;
        const totalIn = htCm / 2.54;
        setForm({
          age: p.age ? String(p.age) : "",
          gender: (p.gender as Gender) ?? "male",
          heightFt: htCm > 0 ? String(Math.floor(totalIn / 12)) : "",
          heightIn: htCm > 0 ? String(Math.round(totalIn % 12)) : "",
          currentWeight: p.currentWeight ? String(p.currentWeight) : "",
          goalWeight: p.goalWeight ? String(p.goalWeight) : "",
          activityLevel: (p.activityLevel as Activity) ?? "moderate",
          goal: (p.goal as Goal) ?? "moderate_loss",
        });
        setLoading(false);
      });
  }, [status]);

  // Live TDEE preview
  const weight = parseFloat(form.currentWeight) || 0;
  const gw = parseFloat(form.goalWeight) || 0;
  const age = parseInt(form.age) || 0;
  const ft = parseInt(form.heightFt) || 0;
  const inch = parseInt(form.heightIn) || 0;
  const heightCm = (ft * 12 + inch) * 2.54;
  const weightKg = weight * 0.453592;
  const hasEnough = weight > 0 && age > 0 && heightCm > 0;

  let preview: { bmr: number; tdee: number; calories: number; protein: number; carbs: number; fat: number } | null = null;
  if (hasEnough) {
    const bmr = calculateBMR(weightKg, heightCm, age, form.gender);
    const tdee = calculateTDEE(bmr, form.activityLevel);
    const calories = calculateCalorieTarget(tdee, form.goal);
    const macros = calculateMacroTargets(calories, weightKg, form.goal);
    preview = { bmr: Math.round(bmr), tdee, calories, ...macros };
  }

  const weeksToGoal =
    preview && weight && gw
      ? calculateTimeline(weight, gw, form.goal)
      : null;

  const targetDate = weeksToGoal
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + weeksToGoal * 7);
        return formatDate(d);
      })()
    : null;

  function setField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    const body: Record<string, unknown> = {
      gender: form.gender,
      activityLevel: form.activityLevel,
      goal: form.goal,
    };
    if (age > 0) body.age = age;
    if (heightCm > 0) body.heightCm = heightCm;
    if (weight > 0) body.currentWeight = weight;
    if (gw > 0) body.goalWeight = gw;

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setSaveError(typeof err.error === "string" ? err.error : "Failed to save. Please check your inputs.");
        setSaving(false);
        return;
      }

      setSaving(false);
      setSaved(true);
      refetchDashboard();
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaveError("Network error — please try again.");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
          <Loader2 size={28} style={{ animation: "spin 1s linear infinite", color: "var(--color-primary)" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "680px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Profile & TDEE</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>Set your stats to calculate personalised targets</p>
          </div>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
          >
            {saving && <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />}
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : saving ? "Saving…" : "Save Profile"}
          </button>
        </div>

        {/* Personal info */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem" }}>Personal Information</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
            <div>
              <label className="label">Age</label>
              <input className="input" type="number" min="10" max="120" value={form.age} onChange={(e) => setField("age", e.target.value)} placeholder="25" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender} onChange={(e) => setField("gender", e.target.value as Gender)}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Height</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input className="input" type="number" min="3" max="8" value={form.heightFt} onChange={(e) => setField("heightFt", e.target.value)} placeholder="5" />
                  <span style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--color-muted)" }}>ft</span>
                </div>
                <div style={{ position: "relative", flex: 1 }}>
                  <input className="input" type="number" min="0" max="11" value={form.heightIn} onChange={(e) => setField("heightIn", e.target.value)} placeholder="9" />
                  <span style={{ position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)", fontSize: "0.75rem", color: "var(--color-muted)" }}>in</span>
                </div>
              </div>
            </div>
            <div>
              <label className="label">Current Weight (lbs)</label>
              <input className="input" type="number" step="0.1" value={form.currentWeight} onChange={(e) => setField("currentWeight", e.target.value)} placeholder="170" />
            </div>
            <div>
              <label className="label">Goal Weight (lbs)</label>
              <input className="input" type="number" step="0.1" value={form.goalWeight} onChange={(e) => setField("goalWeight", e.target.value)} placeholder="155" />
            </div>
          </div>
        </div>

        {/* Activity level */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Activity Level</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {ACTIVITIES.map(({ value, label, sub }) => (
              <button
                key={value}
                onClick={() => setField("activityLevel", value)}
                style={{
                  padding: "0.75rem 1rem", borderRadius: "0.625rem", border: "1px solid",
                  borderColor: form.activityLevel === value ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: form.activityLevel === value ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
                  textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: form.activityLevel === value ? "var(--color-primary-light)" : "var(--color-foreground)" }}>{label}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Goal */}
        <div className="card">
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>Goal</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {GOALS.map(({ value, label, desc, color }) => (
              <button
                key={value}
                onClick={() => setField("goal", value)}
                style={{
                  padding: "0.875rem 1rem", borderRadius: "0.625rem", border: "1px solid",
                  borderColor: form.goal === value ? color : "var(--color-border)",
                  backgroundColor: form.goal === value ? `color-mix(in srgb, ${color} 10%, transparent)` : "transparent",
                  textAlign: "left", cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: form.goal === value ? color : "var(--color-foreground)" }}>{label}</p>
                  <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{desc}</p>
                </div>
                {form.goal === value && <CheckCircle2 size={18} color={color} />}
              </button>
            ))}
          </div>
        </div>

        {/* TDEE Preview */}
        {preview ? (
          <div className="card" style={{ background: "linear-gradient(135deg, var(--color-card), color-mix(in srgb, var(--color-primary) 8%, var(--color-card)))", borderColor: "color-mix(in srgb, var(--color-primary) 25%, var(--color-border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Your Calculated Targets</h3>
              <span style={{ fontSize: "0.7rem", color: "var(--color-primary-light)", backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)", padding: "2px 8px", borderRadius: "99px", fontWeight: 600 }}>
                LIVE PREVIEW
              </span>
            </div>

            {/* Main numbers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
              {[
                { label: "BMR", value: preview.bmr.toLocaleString(), unit: "kcal/day", desc: "Base metabolic rate" },
                { label: "TDEE", value: preview.tdee.toLocaleString(), unit: "kcal/day", desc: "Total daily expenditure" },
                { label: "Target", value: preview.calories.toLocaleString(), unit: "kcal/day", desc: getGoalLabel(form.goal) },
              ].map(({ label, value, unit, desc }) => (
                <div key={label} style={{ textAlign: "center", padding: "0.875rem", backgroundColor: "var(--color-surface)", borderRadius: "0.75rem", border: "1px solid var(--color-border)" }}>
                  <p style={{ fontSize: "1.5rem", fontWeight: 800, color: label === "Target" ? "var(--color-primary-light)" : "var(--color-foreground)" }}>{value}</p>
                  <p style={{ fontSize: "0.68rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{unit}</p>
                  <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "0.3rem" }}>{label}</p>
                  <p style={{ fontSize: "0.68rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>{desc}</p>
                </div>
              ))}
            </div>

            {/* Macro targets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
              {[
                { label: "Protein", value: preview.protein, color: "var(--color-protein)" },
                { label: "Carbs", value: preview.carbs, color: "var(--color-carbs)" },
                { label: "Fat", value: preview.fat, color: "var(--color-fat)" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "0.75rem", backgroundColor: `color-mix(in srgb, ${color} 8%, var(--color-surface))`, borderRadius: "0.75rem", border: `1px solid color-mix(in srgb, ${color} 20%, var(--color-border))` }}>
                  <span style={{ fontSize: "1.25rem", fontWeight: 800, color }}>{value}g</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: "0.2rem" }}>{label}</span>
                  <span style={{ fontSize: "0.68rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{Math.round(value * (label === "Fat" ? 9 : 4))} kcal</span>
                </div>
              ))}
            </div>

            {/* Timeline */}
            {weeksToGoal && targetDate && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", padding: "0.875rem", backgroundColor: "color-mix(in srgb, var(--color-success) 8%, transparent)", borderRadius: "0.75rem", border: "1px solid color-mix(in srgb, var(--color-success) 20%, transparent)" }}>
                <Info size={15} color="var(--color-success)" style={{ flexShrink: 0, marginTop: "1px" }} />
                <div>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    Estimated to reach {gw} lbs by <span style={{ color: "var(--color-success)" }}>{targetDate}</span>
                  </p>
                  <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.2rem" }}>
                    {weeksToGoal} weeks · {GOALS.find((g) => g.value === form.goal)?.desc}
                  </p>
                </div>
              </div>
            )}

            {/* Safety note */}
            {form.goal === "aggressive_loss" && (
              <div style={{ marginTop: "0.75rem", padding: "0.75rem", backgroundColor: "color-mix(in srgb, var(--color-danger) 10%, transparent)", borderRadius: "0.5rem", border: "1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)", fontSize: "0.78rem", color: "var(--color-muted)" }}>
                ⚠️ Aggressive deficits can lead to muscle loss. Ensure adequate protein and consider consulting a professional.
              </div>
            )}
          </div>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)" }}>
            <Info size={24} style={{ margin: "0 auto 0.75rem", opacity: 0.4 }} />
            <p style={{ fontSize: "0.875rem" }}>Fill in your age, height, and weight to see your personalised targets.</p>
          </div>
        )}

        {saveError && (
          <div style={{
            padding: "0.875rem 1rem", borderRadius: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
            color: "#fca5a5", fontSize: "0.875rem",
          }}>
            ⚠️ {saveError}
          </div>
        )}

        <button
          className="btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ justifyContent: "center", padding: "0.875rem" }}
        >
          {saving && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {saved ? <><CheckCircle2 size={16} /> Profile Saved!</> : saving ? "Saving…" : "Save Profile"}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
