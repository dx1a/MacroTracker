"use client";

import { useState, useCallback } from "react";
import { Droplets, Plus, Minus } from "lucide-react";

const ML_PER_GLASS = 240; // 8 oz
const OZ_PER_ML = 1 / 29.5735;

function mlToOz(ml: number) {
  return Math.round(ml * OZ_PER_ML * 10) / 10;
}

interface WaterTrackerProps {
  initialMl: number;
  goalMl: number;
  date: string; // YYYY-MM-DD
  isAutoGoal: boolean;
}

export function WaterTracker({ initialMl, goalMl, date, isAutoGoal }: WaterTrackerProps) {
  const [amount, setAmount] = useState(initialMl);
  const [saving, setSaving] = useState(false);

  const pct = goalMl > 0 ? Math.min(1, amount / goalMl) : 0;
  const glasses = Math.round(amount / ML_PER_GLASS * 10) / 10;
  const goalGlasses = Math.round(goalMl / ML_PER_GLASS);

  const save = useCallback(async (newAmount: number) => {
    setSaving(true);
    await fetch("/api/water", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, amount: Math.max(0, newAmount) }),
    });
    setSaving(false);
  }, [date]);

  function adjust(deltaML: number) {
    const next = Math.max(0, Math.min(amount + deltaML, goalMl * 2));
    setAmount(next);
    save(next);
  }

  const fillY = 134 * (1 - pct);
  const isGoalMet = pct >= 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Droplets size={16} color="var(--color-primary-light)" />
          <h3 style={{ fontSize: "0.875rem", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Hydration
          </h3>
        </div>
        {isAutoGoal && (
          <span style={{ fontSize: "0.65rem", color: "var(--color-muted)", fontStyle: "italic" }}>
            Auto goal
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
        {/* Glass SVG */}
        <div style={{ flexShrink: 0, margin: "0 auto" }}>
          <svg viewBox="0 0 80 135" width="90" height="152" style={{ overflow: "visible", display: "block" }}>
            <defs>
              <linearGradient id="waterFill" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <linearGradient id="waterFillGreen" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              <clipPath id="glassClip">
                {/* Slightly tapered glass shape */}
                <path d="M8,0 L72,0 L65,132 L15,132 Z" />
              </clipPath>
            </defs>

            {/* Glass background */}
            <path d="M8,0 L72,0 L65,132 L15,132 Z" fill="var(--color-surface)" clipPath="url(#glassClip)" />

            {/* Water fill — translateY animates up as amount increases */}
            <rect
              x="0" y="0" width="80" height="132"
              fill={isGoalMet ? "url(#waterFillGreen)" : "url(#waterFill)"}
              clipPath="url(#glassClip)"
              style={{
                transform: `translateY(${fillY}px)`,
                transition: saving ? "none" : "transform 0.6s cubic-bezier(0.4,0,0.2,1)",
              }}
            />

            {/* Measurement lines */}
            {[0.25, 0.5, 0.75].map((mark) => {
              const yMark = 132 * (1 - mark);
              return (
                <line
                  key={mark}
                  x1="15" y1={yMark} x2="25" y2={yMark}
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  opacity="0.6"
                />
              );
            })}

            {/* Glass outline */}
            <path
              d="M8,0 L72,0 L65,132 L15,132 Z"
              fill="none"
              stroke="var(--color-border)"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />

            {/* Highlight — subtle shine on left */}
            <path
              d="M20,8 L16,122"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="4"
              strokeLinecap="round"
            />

            {/* Goal-met checkmark */}
            {isGoalMet && (
              <text x="40" y="68" textAnchor="middle" fontSize="22" fill="white" opacity="0.9">✓</text>
            )}
          </svg>
        </div>

        {/* Stats + controls */}
        <div style={{ flex: 1, minWidth: "140px", display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          {/* Amount display */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
              <span style={{ fontSize: "2rem", fontWeight: 800, color: isGoalMet ? "var(--color-success)" : "var(--color-primary-light)", lineHeight: 1 }}>
                {mlToOz(amount)}
              </span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-muted)", fontWeight: 600 }}>oz</span>
              <span style={{ fontSize: "0.8rem", color: "var(--color-muted)" }}>/ {mlToOz(goalMl)} oz</span>
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-muted)", marginTop: "0.15rem" }}>
              {glasses} / {goalGlasses} glasses · {Math.round(pct * 100)}%
            </p>
          </div>

          {/* Progress bar */}
          <div style={{ height: "6px", borderRadius: "99px", backgroundColor: "var(--color-border)", overflow: "hidden" }}>
            <div style={{
              height: "100%",
              width: `${pct * 100}%`,
              borderRadius: "99px",
              background: isGoalMet
                ? "linear-gradient(90deg, #059669, #34d399)"
                : "linear-gradient(90deg, #1d4ed8cc, #60a5fa)",
              transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
            }} />
          </div>

          {/* +/- controls */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={() => adjust(-ML_PER_GLASS)}
              className="btn-ghost"
              disabled={amount === 0}
              style={{ padding: "0.4rem 0.625rem", opacity: amount === 0 ? 0.4 : 1 }}
              title="Remove one glass"
            >
              <Minus size={14} />
            </button>
            <button
              onClick={() => adjust(ML_PER_GLASS)}
              className="btn-primary"
              style={{ flex: 1, justifyContent: "center", padding: "0.5rem", fontSize: "0.8rem", fontWeight: 600 }}
              title="Add one glass (8 oz)"
            >
              <Plus size={14} /> Glass
            </button>
            <button
              onClick={() => adjust(ML_PER_GLASS * 2)}
              className="btn-ghost"
              style={{ padding: "0.4rem 0.75rem", fontSize: "0.78rem" }}
              title="Add two glasses (16 oz)"
            >
              +2
            </button>
          </div>

          {isGoalMet && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-success)", fontWeight: 600 }}>
              🎉 Daily goal reached!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
