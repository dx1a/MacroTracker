"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Plus, Loader2 } from "lucide-react";

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

interface FoodSearchProps {
  onSelect: (food: Food) => void;
}

export function FoodSearch({ onSelect }: FoodSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/foods?q=${encodeURIComponent(q)}&limit=15`);
      const data = await res.json();
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(query), 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query, search]);

  const showDropdown = focused && (results.length > 0 || loading || query.length > 0);

  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative" }}>
        {loading
          ? <Loader2 size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", animation: "spin 1s linear infinite" }} />
          : <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
        }
        <input
          ref={inputRef}
          className="input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="Search foods… (e.g. chicken breast, oats)"
          style={{ paddingLeft: "2.25rem", paddingRight: query ? "2.25rem" : "0.875rem" }}
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); inputRef.current?.focus(); }}
            style={{ position: "absolute", right: "0.75rem", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 50,
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "0.75rem",
          boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
          overflow: "hidden",
          maxHeight: "340px",
          overflowY: "auto",
        }}>
          {loading && results.length === 0 && (
            <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && query && (
            <div style={{ padding: "1rem", textAlign: "center", color: "var(--color-muted)", fontSize: "0.875rem" }}>
              No results for &ldquo;{query}&rdquo;. Try creating a custom food.
            </div>
          )}
          {results.map((food) => (
            <button
              key={food.id}
              onClick={() => { onSelect(food); setQuery(""); setResults([]); }}
              style={{
                width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer",
                padding: "0.75rem 1rem",
                borderBottom: "1px solid var(--color-border)",
                transition: "background 0.15s",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--color-surface)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div>
                <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-foreground)" }}>{food.name}</p>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>
                  {food.brand && `${food.brand} · `}{food.servingSize}{food.servingUnit}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-calories)" }}>{Math.round(food.calories)} kcal</span>
                <div style={{ display: "flex", gap: "0.25rem" }}>
                  <Pill label={`P ${Math.round(food.protein)}g`} color="var(--color-protein)" />
                  <Pill label={`C ${Math.round(food.carbs)}g`} color="var(--color-carbs)" />
                  <Pill label={`F ${Math.round(food.fat)}g`} color="var(--color-fat)" />
                </div>
                <Plus size={14} color="var(--color-primary-light)" />
              </div>
            </button>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: "0.68rem", fontWeight: 600, color,
      backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
      padding: "1px 5px", borderRadius: "99px",
    }}>
      {label}
    </span>
  );
}
