"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";

type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

interface Food {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

interface AddFoodModalProps {
  food: Food;
  meal: Meal;
  date: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddFoodModal({ food, meal, date, onClose, onAdded }: AddFoodModalProps) {
  const [servings, setServings] = useState("1");
  const [selectedMeal, setSelectedMeal] = useState<Meal>(meal);
  const [loading, setLoading] = useState(false);
  const { optimisticAddCalories, fetch: refetch } = useDashboard();

  const servingsNum = parseFloat(servings) || 1;
  const ratio = servingsNum / (food.servingSize / 100);

  const computed = {
    calories: Math.round(food.calories * ratio),
    protein: Math.round(food.protein * ratio * 10) / 10,
    carbs: Math.round(food.carbs * ratio * 10) / 10,
    fat: Math.round(food.fat * ratio * 10) / 10,
  };

  async function handleAdd() {
    if (isNaN(servingsNum) || servingsNum <= 0) return;
    setLoading(true);
    optimisticAddCalories(computed.calories, computed.protein, computed.carbs, computed.fat);
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodId: food.id, meal: selectedMeal, servings: servingsNum, date }),
    });
    setLoading(false);
    onAdded();
    onClose();
    // Background refresh to sync server state
    setTimeout(() => refetch(), 500);
  }

  const meals: Meal[] = ["breakfast", "lunch", "dinner", "snacks"];
  const mealEmoji: Record<Meal, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snacks: "🍎" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: "420px", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{food.name}</h3>
            {food.brand && <p style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>{food.brand}</p>}
            <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>
              Per {food.servingSize}{food.servingUnit}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {/* Servings */}
        <div style={{ marginBottom: "1rem" }}>
          <label className="label">Servings</label>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button
              onClick={() => setServings(String(Math.max(0.25, servingsNum - 0.25)))}
              className="btn-ghost"
              style={{ padding: "0.5rem 0.75rem", fontSize: "1rem" }}
            >−</button>
            <input
              className="input"
              type="number"
              step="0.25"
              min="0.1"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              style={{ textAlign: "center", flex: 1 }}
            />
            <button
              onClick={() => setServings(String(servingsNum + 0.25))}
              className="btn-ghost"
              style={{ padding: "0.5rem 0.75rem", fontSize: "1rem" }}
            >+</button>
          </div>
        </div>

        {/* Meal selector */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label className="label">Meal</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
            {meals.map((m) => (
              <button
                key={m}
                onClick={() => setSelectedMeal(m)}
                style={{
                  padding: "0.5rem 0.25rem", borderRadius: "0.5rem", border: "1px solid",
                  borderColor: selectedMeal === m ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: selectedMeal === m ? "color-mix(in srgb, var(--color-primary) 15%, transparent)" : "transparent",
                  cursor: "pointer", fontSize: "0.72rem", fontWeight: 600,
                  color: selectedMeal === m ? "var(--color-primary-light)" : "var(--color-muted)",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem",
                  transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: "1rem" }}>{mealEmoji[m]}</span>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Macro preview */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem", marginBottom: "1.25rem",
          padding: "0.875rem", borderRadius: "0.75rem",
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
        }}>
          {[
            { label: "Calories", value: computed.calories, unit: "kcal", color: "var(--color-calories)" },
            { label: "Protein", value: computed.protein, unit: "g", color: "var(--color-protein)" },
            { label: "Carbs", value: computed.carbs, unit: "g", color: "var(--color-carbs)" },
            { label: "Fat", value: computed.fat, unit: "g", color: "var(--color-fat)" },
          ].map(({ label, value, unit, color }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <p style={{ fontSize: "1rem", fontWeight: 800, color }}>{value}</p>
              <p style={{ fontSize: "0.68rem", color: "var(--color-muted)" }}>{unit}</p>
              <p style={{ fontSize: "0.65rem", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="btn-primary"
          onClick={handleAdd}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
        >
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {loading ? "Adding…" : `Add to ${selectedMeal.charAt(0).toUpperCase() + selectedMeal.slice(1)}`}
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
