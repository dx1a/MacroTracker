"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ChevronLeft, ChevronRight, PlusCircle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FoodSearch } from "@/components/food/FoodSearch";
import { AddFoodModal } from "@/components/food/AddFoodModal";
import { CreateFoodModal } from "@/components/food/CreateFoodModal";
import { MacroBar } from "@/components/dashboard/MacroBar";
import { useDashboard } from "@/store/useDashboard";

type Meal = "breakfast" | "lunch" | "dinner" | "snacks";

interface FoodItem {
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

interface LogEntry {
  id: string;
  meal: Meal;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  food: FoodItem;
}

const MEALS: { key: Meal; label: string; emoji: string }[] = [
  { key: "breakfast", label: "Breakfast", emoji: "🌅" },
  { key: "lunch", label: "Lunch", emoji: "☀️" },
  { key: "dinner", label: "Dinner", emoji: "🌙" },
  { key: "snacks", label: "Snacks", emoji: "🍎" },
];

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(dateStr: string): string {
  const today = todayStr();
  const yesterday = offsetDate(today, -1);
  if (dateStr === today) return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

export default function LogPage() {
  const { status } = useSession();
  const router = useRouter();
  const { data: dashData, fetch: refetchDashboard } = useDashboard();

  const [date, setDate] = useState(todayStr());
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loadingLog, setLoadingLog] = useState(true);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [activeMeal, setActiveMeal] = useState<Meal>("breakfast");
  const [showCreate, setShowCreate] = useState(false);

  const profile = dashData?.profile;
  const calorieTarget = profile?.adaptiveCalories ?? profile?.calorieTarget ?? 2000;
  const proteinTarget = profile?.proteinTarget ?? 150;
  const carbTarget = profile?.carbTarget ?? 200;
  const fatTarget = profile?.fatTarget ?? 65;

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const fetchLog = useCallback(async () => {
    setLoadingLog(true);
    try {
      const res = await fetch(`/api/logs?date=${date}`);
      const data = await res.json();
      setEntries(data?.entries ?? []);
    } finally {
      setLoadingLog(false);
    }
  }, [date]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  async function deleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await fetch(`/api/logs/${id}`, { method: "DELETE" });
    if (date === todayStr()) refetchDashboard();
  }

  const totals = entries.reduce(
    (acc, e) => ({ cal: acc.cal + e.calories, p: acc.p + e.protein, c: acc.c + e.carbs, f: acc.f + e.fat }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const mealEntries = (meal: Meal) => entries.filter((e) => e.meal === meal);
  const mealTotal = (meal: Meal) =>
    mealEntries(meal).reduce((s, e) => s + e.calories, 0);

  return (
    <AppLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Header + date nav */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Food Log</h1>
            <p style={{ color: "var(--color-muted)", fontSize: "0.875rem" }}>Track every meal with precision</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <button className="btn-ghost" onClick={() => setDate((d) => offsetDate(d, -1))} style={{ padding: "0.5rem" }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ fontSize: "0.875rem", fontWeight: 700, minWidth: "80px", textAlign: "center" }}>
              {displayDate(date)}
            </span>
            <button
              className="btn-ghost"
              onClick={() => setDate((d) => offsetDate(d, 1))}
              disabled={date >= todayStr()}
              style={{ padding: "0.5rem", opacity: date >= todayStr() ? 0.4 : 1 }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Daily totals bar */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Daily Totals
            </h3>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-calories)" }}>{Math.round(totals.cal)} kcal</span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", alignSelf: "flex-end" }}>/ {calorieTarget}</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <MacroBar label="Protein" value={totals.p} target={proteinTarget} color="var(--color-protein)" />
            <MacroBar label="Carbs" value={totals.c} target={carbTarget} color="var(--color-carbs)" />
            <MacroBar label="Fat" value={totals.f} target={fatTarget} color="var(--color-fat)" />
          </div>
        </div>

        {/* Search */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.75rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Add Food</h3>
            <button
              className="btn-ghost"
              onClick={() => setShowCreate(true)}
              style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}
            >
              <PlusCircle size={14} /> Create Custom Food
            </button>
          </div>

          {/* Meal quick-select */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {MEALS.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => setActiveMeal(key)}
                style={{
                  padding: "0.4rem 0.875rem", borderRadius: "99px", border: "1px solid",
                  borderColor: activeMeal === key ? "var(--color-primary)" : "var(--color-border)",
                  backgroundColor: activeMeal === key ? "color-mix(in srgb, var(--color-primary) 15%, transparent)" : "transparent",
                  color: activeMeal === key ? "var(--color-primary-light)" : "var(--color-muted)",
                  cursor: "pointer", fontSize: "0.8rem", fontWeight: 600,
                  transition: "all 0.15s",
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          <FoodSearch onSelect={(food) => { setSelectedFood(food); }} />
        </div>

        {/* Meal sections */}
        {loadingLog ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "var(--color-muted)", fontSize: "0.875rem" }}>
            Loading log…
          </div>
        ) : (
          MEALS.map(({ key, label, emoji }) => {
            const mealItems = mealEntries(key);
            const total = mealTotal(key);
            return (
              <div key={key} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: mealItems.length > 0 ? "1rem" : "0" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.1rem" }}>{emoji}</span>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>{label}</h3>
                    {mealItems.length > 0 && (
                      <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                        ({mealItems.length} {mealItems.length === 1 ? "item" : "items"})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    {total > 0 && (
                      <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-calories)" }}>
                        {Math.round(total)} kcal
                      </span>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={() => { setActiveMeal(key); document.querySelector<HTMLInputElement>(".input")?.focus(); }}
                      style={{ padding: "0.4rem 0.625rem", fontSize: "0.78rem" }}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {mealItems.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "var(--color-muted)", fontStyle: "italic" }}>
                    No foods logged yet
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                    {mealItems.map((entry) => (
                      <div key={entry.id} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "0.625rem 0.875rem", borderRadius: "0.625rem",
                        backgroundColor: "var(--color-surface)",
                        border: "1px solid var(--color-border)",
                        gap: "0.75rem",
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "0.875rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {entry.food.name}
                          </p>
                          <p style={{ fontSize: "0.72rem", color: "var(--color-muted)" }}>
                            {entry.servings} × {entry.food.servingSize}{entry.food.servingUnit}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                          <div style={{ display: "none" }} className="macro-pills">
                            {[
                              { v: entry.protein, c: "var(--color-protein)", l: "P" },
                              { v: entry.carbs, c: "var(--color-carbs)", l: "C" },
                              { v: entry.fat, c: "var(--color-fat)", l: "F" },
                            ].map(({ v, c, l }) => (
                              <span key={l} style={{ fontSize: "0.7rem", fontWeight: 600, color: c, backgroundColor: `color-mix(in srgb, ${c} 15%, transparent)`, padding: "1px 5px", borderRadius: "99px" }}>
                                {l}{Math.round(v)}
                              </span>
                            ))}
                          </div>
                          <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-calories)" }}>
                            {Math.round(entry.calories)} kcal
                          </span>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "0.25rem", borderRadius: "0.25rem", transition: "color 0.15s" }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-danger)")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--color-muted)")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Meal subtotals */}
                    <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem", justifyContent: "flex-end" }}>
                      {[
                        { label: "P", value: mealItems.reduce((s, e) => s + e.protein, 0), color: "var(--color-protein)" },
                        { label: "C", value: mealItems.reduce((s, e) => s + e.carbs, 0), color: "var(--color-carbs)" },
                        { label: "F", value: mealItems.reduce((s, e) => s + e.fat, 0), color: "var(--color-fat)" },
                      ].map(({ label, value, color }) => (
                        <span key={label} style={{ fontSize: "0.75rem", color, fontWeight: 600 }}>
                          {label}: {Math.round(value)}g
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      {selectedFood && (
        <AddFoodModal
          food={selectedFood}
          meal={activeMeal}
          date={date}
          onClose={() => setSelectedFood(null)}
          onAdded={fetchLog}
        />
      )}

      {showCreate && (
        <CreateFoodModal
          onClose={() => setShowCreate(false)}
          onCreated={(food) => {
            setSelectedFood(food);
            setShowCreate(false);
          }}
        />
      )}
    </AppLayout>
  );
}
