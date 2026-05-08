"use client";

import { MacroBar } from "./MacroBar";

interface CarbFatBudgetProps {
  carbs: number;
  fat: number;
  carbTarget: number;
  fatTarget: number;
  calorieTarget: number;
  proteinTarget: number;
}

export function CarbFatBudget({ carbs, fat, carbTarget, fatTarget, calorieTarget, proteinTarget }: CarbFatBudgetProps) {
  const combinedBudgetCals = Math.max(0, calorieTarget - proteinTarget * 4);
  const carbCals = carbs * 4;
  const fatCals = fat * 9;
  const consumedCals = carbCals + fatCals;
  const pctTotal = combinedBudgetCals > 0 ? Math.min(100, (consumedCals / combinedBudgetCals) * 100) : 0;
  const pctCarb = combinedBudgetCals > 0 ? Math.min(100, (carbCals / combinedBudgetCals) * 100) : 0;
  const pctFat = combinedBudgetCals > 0 ? Math.min(pctTotal - pctCarb, (fatCals / combinedBudgetCals) * 100) : 0;
  const remaining = Math.max(0, combinedBudgetCals - consumedCals);
  const over = consumedCals > combinedBudgetCals && combinedBudgetCals > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {/* Individual bars */}
      <MacroBar label="Carbs" value={carbs} target={carbTarget} color="var(--color-carbs)" />
      <MacroBar label="Fat" value={fat} target={fatTarget} color="var(--color-fat)" />

      {/* Combined flexible budget */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", paddingTop: "0.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Combined Budget
            </span>
            <span style={{
              fontSize: "0.6rem", fontWeight: 700, color: "var(--color-primary-light)",
              backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
              padding: "1px 5px", borderRadius: "99px", letterSpacing: "0.03em",
            }}>
              FLEXIBLE
            </span>
          </div>
          <span style={{ fontSize: "0.72rem", color: over ? "var(--color-danger)" : "var(--color-muted)" }}>
            {Math.round(consumedCals)} / {Math.round(combinedBudgetCals)} kcal
            {over
              ? ` · ${Math.round(consumedCals - combinedBudgetCals)} over`
              : ` · ${Math.round(remaining)} left`}
          </span>
        </div>

        {/* Stacked carb+fat bar */}
        <div style={{ height: "6px", borderRadius: "99px", backgroundColor: "var(--color-border)", overflow: "hidden", display: "flex" }}>
          <div style={{
            width: `${pctCarb}%`,
            background: "linear-gradient(90deg, #d4a500cc, var(--color-carbs))",
            borderRadius: pctFat > 0 ? "99px 0 0 99px" : "99px",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
            flexShrink: 0,
          }} />
          <div style={{
            width: `${Math.max(0, pctFat)}%`,
            background: over ? "var(--color-danger)" : "linear-gradient(90deg, #e55a00cc, var(--color-fat))",
            borderRadius: pctCarb > 0 ? "0 99px 99px 0" : "99px",
            transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
            flexShrink: 0,
          }} />
        </div>

        <p style={{ fontSize: "0.65rem", color: "var(--color-muted)", fontStyle: "italic" }}>
          Carbs &amp; fat share a combined calorie budget — trade freely between them.
        </p>
      </div>
    </div>
  );
}
