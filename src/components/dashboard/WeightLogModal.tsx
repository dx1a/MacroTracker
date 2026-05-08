"use client";

import { useState } from "react";
import { Scale, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";
import { localDateStr } from "@/lib/date";

function todayStr() {
  return localDateStr();
}

function displayDate(dateStr: string): string {
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yStr) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function offsetDate(base: string, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function WeightLogModal() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayStr());
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { fetch: refetch } = useDashboard();

  function handleOpen() {
    setDate(todayStr());
    setWeight("");
    setNote("");
    setSuccess(false);
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight || parseFloat(weight) <= 0) return;
    setLoading(true);
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: parseFloat(weight), date, note, localToday: todayStr() }),
    });
    setLoading(false);
    setSuccess(true);
    refetch();
    setTimeout(() => {
      setOpen(false);
      setSuccess(false);
    }, 1200);
  }

  const isToday = date === todayStr();
  const isFuture = date > todayStr();

  return (
    <>
      <button
        className="btn-ghost"
        onClick={handleOpen}
        style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}
      >
        <Scale size={15} />
        Log Weight
      </button>

      {open && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          padding: "1rem",
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "380px", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Log Weight</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>
                  {isToday ? "Logging for today" : `Logging for ${displayDate(date)}`}
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              {/* Date navigator */}
              <div>
                <label className="label">Date</label>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setDate((d) => offsetDate(d, -1))}
                    style={{ padding: "0.5rem", flexShrink: 0 }}
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {/* Transparent date input layered over display text */}
                  <div style={{ flex: 1, position: "relative", textAlign: "center" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: 700, pointerEvents: "none" }}>
                      {displayDate(date)}
                    </span>
                    <input
                      type="date"
                      className="date-input"
                      value={date}
                      max={todayStr()}
                      onChange={(e) => e.target.value && setDate(e.target.value)}
                      style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
                      title="Pick a date"
                    />
                  </div>

                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => setDate((d) => offsetDate(d, 1))}
                    disabled={isToday || isFuture}
                    style={{ padding: "0.5rem", flexShrink: 0, opacity: isToday ? 0.35 : 1 }}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                {!isToday && (
                  <p style={{ fontSize: "0.7rem", color: "var(--color-muted)", textAlign: "center", marginTop: "0.35rem", fontStyle: "italic" }}>
                    Backfilling a previous entry
                  </p>
                )}
              </div>

              {/* Weight */}
              <div>
                <label className="label">Weight (lbs)</label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  min="50"
                  max="700"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="165.5"
                  required
                  autoFocus
                />
              </div>

              {/* Note */}
              <div>
                <label className="label">Note <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span></label>
                <input
                  className="input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Morning, post-workout…"
                />
              </div>

              <button
                className="btn-primary"
                type="submit"
                disabled={loading || success}
                style={{ justifyContent: "center" }}
              >
                {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {success ? "✓ Saved!" : loading ? "Saving…" : `Save for ${displayDate(date)}`}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
