"use client";

import { useState } from "react";
import { Lightbulb, X } from "lucide-react";

interface SuggestionBannerProps {
  suggestions: string[];
}

export function SuggestionBanner({ suggestions }: SuggestionBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const visible = suggestions.filter((_, i) => !dismissed.has(i));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {suggestions.map((s, i) =>
        dismissed.has(i) ? null : (
          <div key={i} style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            padding: "0.875rem 1rem",
            borderRadius: "0.75rem",
            backgroundColor: "color-mix(in srgb, var(--color-primary) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--color-primary) 25%, transparent)",
            animation: "fadeIn 0.3s ease",
          }}>
            <Lightbulb size={16} color="var(--color-primary-light)" style={{ flexShrink: 0, marginTop: "1px" }} />
            <p style={{ flex: 1, fontSize: "0.85rem", color: "var(--color-foreground)", lineHeight: 1.5 }}>{s}</p>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, i]))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)", padding: "0", flexShrink: 0 }}
            >
              <X size={14} />
            </button>
          </div>
        )
      )}
      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(-4px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </div>
  );
}
