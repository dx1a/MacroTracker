"use client";

interface CarbFatBudgetProps {
  carbs: number;
  fat: number;
  calorieTarget: number;
  proteinTarget: number;
}

export function CarbFatBudget({ carbs, fat, calorieTarget, proteinTarget }: CarbFatBudgetProps) {
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
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Carbs + Fat
          </span>
          <span style={{
            fontSize: "0.65rem", fontWeight: 700, color: "var(--color-primary-light)",
            backgroundColor: "color-mix(in srgb, var(--color-primary) 15%, transparent)",
            padding: "1px 6px", borderRadius: "99px", letterSpacing: "0.03em",
          }}>
            FLEXIBLE
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.375rem", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-carbs)" }}>
            {Math.round(carbs)}g C
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>·</span>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-fat)" }}>
            {Math.round(fat)}g F
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
            = {Math.round(consumedCals)} / {Math.round(combinedBudgetCals)} kcal
          </span>
        </div>
      </div>

      {/* Stacked bar: carb segment + fat segment */}
      <div style={{ height: "9px", borderRadius: "99px", backgroundColor: "var(--color-border)", overflow: "hidden", display: "flex" }}>
        <div style={{
          width: `${pctCarb}%`,
          background: "linear-gradient(90deg, #d4a500cc, var(--color-carbs))",
          borderRadius: pctFat > 0 ? "99px 0 0 99px" : "99px",
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
        }} />
        <div style={{
          width: `${Math.max(0, pctFat)}%`,
          background: "linear-gradient(90deg, #e55a00cc, var(--color-fat))",
          borderRadius: pctCarb > 0 ? "0 99px 99px 0" : "99px",
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
          flexShrink: 0,
          ...(over ? { background: "var(--color-danger)" } : {}),
        }} />
      </div>

      {/* Footer row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
            <span style={{ color: "var(--color-carbs)", fontWeight: 600 }}>■</span> Carbs {Math.round(carbCals)} kcal
          </span>
          <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
            <span style={{ color: "var(--color-fat)", fontWeight: 600 }}>■</span> Fat {Math.round(fatCals)} kcal
          </span>
        </div>
        <span style={{ fontSize: "0.7rem", color: over ? "var(--color-danger)" : "var(--color-muted)" }}>
          {over
            ? `${Math.round(consumedCals - combinedBudgetCals)} kcal over`
            : `${Math.round(remaining)} kcal left`}
        </span>
      </div>

      {/* Soft limit note */}
      <p style={{ fontSize: "0.68rem", color: "var(--color-muted)", fontStyle: "italic", lineHeight: 1.4 }}>
        Carbs &amp; fat share a combined budget — trade freely between them as long as the total holds.
      </p>
    </div>
  );
}
