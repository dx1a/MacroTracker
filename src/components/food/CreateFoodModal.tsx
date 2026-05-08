"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface CreateFoodModalProps {
  onClose: () => void;
  onCreated: (food: { id: string; name: string; calories: number; protein: number; carbs: number; fat: number; servingSize: number; servingUnit: string }) => void;
}

export function CreateFoodModal({ onClose, onCreated }: CreateFoodModalProps) {
  const [form, setForm] = useState({
    name: "", brand: "",
    calories: "", protein: "", carbs: "", fat: "",
    fiber: "", sodium: "",
    servingSize: "100", servingUnit: "g",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      name: form.name.trim(),
      brand: form.brand.trim() || undefined,
      calories: parseFloat(form.calories),
      protein: parseFloat(form.protein),
      carbs: parseFloat(form.carbs),
      fat: parseFloat(form.fat),
      fiber: form.fiber ? parseFloat(form.fiber) : undefined,
      sodium: form.sodium ? parseFloat(form.sodium) : undefined,
      servingSize: parseFloat(form.servingSize) || 100,
      servingUnit: form.servingUnit,
    };

    const res = await fetch("/api/foods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      setError("Failed to create food. Please check all values.");
      return;
    }

    const food = await res.json();
    onCreated(food);
    onClose();
  }

  const field = (label: string, key: string, type = "number", placeholder = "") => (
    <div>
      <label className="label">{label}</label>
      <input
        className="input"
        type={type}
        step={type === "number" ? "0.1" : undefined}
        min={type === "number" ? "0" : undefined}
        value={form[key as keyof typeof form]}
        onChange={(e) => set(key, e.target.value)}
        placeholder={placeholder}
        required={["name", "calories", "protein", "carbs", "fat"].includes(key)}
      />
    </div>
  );

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(5px)",
      padding: "1rem",
    }}>
      <div className="card" style={{ width: "100%", maxWidth: "480px", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Create Custom Food</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: "0.75rem", marginBottom: "1rem", borderRadius: "0.5rem", backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)", color: "#fca5a5", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            {field("Food Name", "name", "text", "e.g. Chicken Breast")}
            {field("Brand (optional)", "brand", "text", "e.g. Tyson")}
          </div>

          <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.875rem" }}>
            <p className="label" style={{ marginBottom: "0.75rem" }}>Macros (per serving)</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.875rem" }}>
              {field("Calories (kcal)", "calories", "number", "250")}
              {field("Protein (g)", "protein", "number", "30")}
              {field("Carbs (g)", "carbs", "number", "0")}
              {field("Fat (g)", "fat", "number", "5")}
              {field("Fiber (g, optional)", "fiber", "number", "0")}
              {field("Sodium (mg, optional)", "sodium", "number", "200")}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
            {field("Serving Size", "servingSize", "number", "100")}
            <div>
              <label className="label">Serving Unit</label>
              <select
                className="input"
                value={form.servingUnit}
                onChange={(e) => set("servingUnit", e.target.value)}
                style={{ appearance: "none" }}
              >
                {["g", "oz", "ml", "cup", "tbsp", "tsp", "piece", "slice"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: "0.75rem", marginTop: "0.25rem" }}
          >
            {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
            {loading ? "Creating…" : "Create Food"}
          </button>
        </form>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
