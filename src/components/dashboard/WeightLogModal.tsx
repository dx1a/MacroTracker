"use client";

import { useState } from "react";
import { Scale, X, Loader2 } from "lucide-react";
import { useDashboard } from "@/store/useDashboard";

export function WeightLogModal() {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const { fetch: refetch } = useDashboard();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: parseFloat(weight), date: today, note }),
    });
    setLoading(false);
    setOpen(false);
    setWeight("");
    setNote("");
    refetch();
  }

  return (
    <>
      <button
        className="btn-ghost"
        onClick={() => setOpen(true)}
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
        }}>
          <div className="card" style={{ width: "100%", maxWidth: "360px", boxShadow: "0 25px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 700 }}>Log Today&apos;s Weight</h3>
              <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted)" }}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Post-workout, morning..." />
              </div>
              <button className="btn-primary" type="submit" disabled={loading} style={{ justifyContent: "center" }}>
                {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
                {loading ? "Saving..." : "Save Weight"}
              </button>
            </form>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
