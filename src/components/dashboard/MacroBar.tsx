"use client";

interface MacroBarProps {
  label: string;
  value: number;
  target: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, value, target, color, unit = "g" }: MacroBarProps) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0);
  const over = value > target && target > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
        <div style={{ display: "flex", gap: "0.25rem", alignItems: "baseline" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 700, color: over ? "var(--color-danger)" : "var(--color-foreground)" }}>
            {Math.round(value)}{unit}
          </span>
          <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
            / {Math.round(target)}{unit}
          </span>
        </div>
      </div>
      <div style={{ height: "7px", borderRadius: "99px", backgroundColor: "var(--color-border)", overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          borderRadius: "99px",
          background: over
            ? "var(--color-danger)"
            : `linear-gradient(90deg, ${color}cc, ${color})`,
          transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.7rem", color: "var(--color-muted)" }}>
          {Math.round(pct)}%
        </span>
        <span style={{ fontSize: "0.7rem", color: over ? "var(--color-danger)" : "var(--color-muted)" }}>
          {over ? `${Math.round(value - target)}${unit} over` : `${Math.round(target - value)}${unit} left`}
        </span>
      </div>
    </div>
  );
}
