"use client";

interface MacroRingProps {
  calories: number;
  target: number;
  size?: number;
}

export function MacroRing({ calories, target, size = 180 }: MacroRingProps) {
  const pct = Math.min(1, calories / Math.max(1, target));
  const r = (size - 20) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const remaining = Math.max(0, target - calories);
  const over = calories > target;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={12}
        />
        {/* Progress */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={over ? "var(--color-danger)" : "url(#ringGrad)"}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
        </defs>
      </svg>
      {/* Centre text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: size * 0.18, fontWeight: 800, lineHeight: 1, color: over ? "var(--color-danger)" : "var(--color-foreground)" }}>
          {Math.round(calories).toLocaleString()}
        </span>
        <span style={{ fontSize: size * 0.075, color: "var(--color-muted)", marginTop: "2px" }}>kcal</span>
        <span style={{ fontSize: size * 0.072, color: over ? "var(--color-danger)" : "var(--color-success)", fontWeight: 600, marginTop: "4px" }}>
          {over ? `+${Math.round(Math.abs(remaining)).toLocaleString()} over` : `${Math.round(remaining).toLocaleString()} left`}
        </span>
      </div>
    </div>
  );
}
