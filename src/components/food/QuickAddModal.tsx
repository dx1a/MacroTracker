"use client";

import { useState } from "react";
import { X, Loader2, Zap } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";

type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

interface QuickAddModalProps {
  meal: Meal;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}

const MEALS: { key: Meal; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snacks", label: "Snacks", emoji: "🍎" },
];

export function QuickAddModal({ meal, date, onClose, onAdded }: QuickAddModalProps) {
  const [selectedMeal, setSelectedMeal] = useState<Meal>(meal);
  const [label, setLabel] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { optimisticAddCalories, fetch: refetch } = useDashboard();

  const cal = parseFloat(calories) || 0;
  const pro = parseFloat(protein) || 0;
  const carb = parseFloat(carbs) || 0;
  const f = parseFloat(fat) || 0;

  // Warn if entered macros' calories deviate >10% from stated calories
  const macroCals = pro * 4 + carb * 4 + f * 9;
  const calMismatch = cal > 0 && macroCals > 0 && Math.abs(macroCals - cal) / cal > 0.1;

  async function handleAdd() {
    if (cal <= 0) { setError("Calories are required."); return; }
    setError("");
    setLoading(true);

    optimisticAddCalories(cal, pro, carb, f);

    const res = await fetch("/api/logs/quick", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        meal: selectedMeal,
        name: label.trim() || "Quick Add",
        calories: cal,
        protein: pro,
        carbs: carb,
        fat: f,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Something went wrong. Please try again.");
      return;
    }

    onAdded();
    onClose();
    setTimeout(() => refetch(), 500);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)",
      padding: "1rem",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: "440px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Zap size={18} color="var(--color-primary-light)" />
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Quick Add</h3>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-primary-light)", backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)", padding: "1px 6px", borderRadius: "99px" }}>
              NO FOOD ITEM NEEDED
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Optional label */}
        <div style={{ marginBottom: "1rem" }}>
          <label className="label">Label <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
          <input
            className="input"
            type="text"
            placeholder="e.g. Homemade pasta, Restaurant meal…"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {/* Macro inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label className="label" style={{ color: "var(--color-calories)" }}>Calories <span style={{ color: "var(--color-danger)" }}>*</span></label>
            <input
              className="input"
              type="number"
              min="0"
              placeholder="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label" style={{ color: "var(--color-protein)" }}>Protein (g)</label>
            <input className="input" type="number" min="0" placeholder="0" value={protein} onChange={(e) => setProtein(e.target.value)} />
          </div>
          <div>
            <label className="label" style={{ color: "var(--color-carbs)" }}>Carbs (g)</label>
            <input className="input" type="number" min="0" placeholder="0" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          </div>
          <div>
            <label className="label" style={{ color: "var(--color-fat)" }}>Fat (g)</label>
            <input className="input" type="number" min="0" placeholder="0" value={fat} onChange={(e) => setFat(e.target.value)} />
          </div>

          {/* Live macro-calorie check */}
          {macroCals > 0 && (
            <div style={{
              gridColumn: "1 / -1",
              padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
              backgroundColor: calMismatch
                ? "color-mix(in srgb, var(--color-warning) 12%, transparent)"
                : "color-mix(in srgb, var(--color-success) 10%, transparent)",
              border: `1px solid color-mix(in srgb, ${calMismatch ? "var(--color-warning)" : "var(--color-success)"} 25%, transparent)`,
              fontSize: "0.75rem",
              color: calMismatch ? "var(--color-warning)" : "var(--color-success)",
            }}>
              {calMismatch
                ? `⚠ Macros add up to ~${Math.round(macroCals)} kcal — double-check your numbers`
                : `✓ Macros add up to ~${Math.round(macroCals)} kcal`}
            </div>
          )}
        </div>

        {/* Meal selector */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label className="label">Meal</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {MEALS.map(({ key, label: mLabel, emoji }) => (
              <button
                key={key}
                onClick={() => setSelectedMeal(key)}
                style={{
                  padding: "0.5rem 0.25rem", borderRadius: "0.5rem", border: "1px solid",
                  borderColor: selectedMeal === key ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: selectedMeal === key ? "color-mix(in srgb, var(--color-primary) 15%, transparent)" : "transparent",
                  cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  color: selectedMeal === key ? "var(--color-primary-light)" : "var(--color-muted)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{emoji}</span>
                {mLabel}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p style={{ fontSize: "0.8rem", color: "var(--color-danger)", marginBottom: "0.75rem" }}>{error}</p>
        )}

        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={loading || cal <= 0}
          style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
        >
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Adding…" : `Add to ${MEALS.find(m => m.key === selectedMeal)?.label}`}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
