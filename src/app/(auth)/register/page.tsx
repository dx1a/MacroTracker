"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Mail, Lock, User, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Registration failed.");
      setLoading(false);
      return;
    }

    // Auto sign-in
    await signIn("credentials", { email, password, redirect: false });
    router.push("/profile?onboarding=1");
  }

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthColor = ["transparent", "#ef4444", "#f59e0b", "#10b981"][strength];
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "radial-gradient(ellipse at top, #1e1040 0%, var(--color-background) 60%)",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: "52px", height: "52px", borderRadius: "14px",
            background: "linear-gradient(135deg, var(--color-primary), #6d28d9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
            boxShadow: "0 0 30px color-mix(in srgb, var(--color-primary) 40%, transparent)",
          }}>
            <Zap size={26} color="white" />
          </div>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.25rem" }}>Create account</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "0.9rem" }}>Start tracking your nutrition journey</p>
        </div>

        <div className="card" style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: "0.5rem",
                padding: "0.75rem", borderRadius: "0.5rem",
                backgroundColor: "color-mix(in srgb, var(--color-danger) 15%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 40%, transparent)",
                color: "#fca5a5", fontSize: "0.875rem",
              }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="label">Full Name</label>
              <div style={{ position: "relative" }}>
                <User size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                <input className="input" type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Johnson" required style={{ paddingLeft: "2.25rem" }} />
              </div>
            </div>

            <div>
              <label className="label">Email</label>
              <div style={{ position: "relative" }}>
                <Mail size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required style={{ paddingLeft: "2.25rem" }} />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }} />
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="8+ characters" required style={{ paddingLeft: "2.25rem" }} />
              </div>
              {password.length > 0 && (
                <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <div style={{ flex: 1, height: "3px", borderRadius: "99px", backgroundColor: "var(--color-border)" }}>
                    <div style={{ width: `${(strength / 3) * 100}%`, height: "100%", borderRadius: "99px", backgroundColor: strengthColor, transition: "all 0.3s" }} />
                  </div>
                  <span style={{ fontSize: "0.75rem", color: strengthColor, fontWeight: 600 }}>{strengthLabel}</span>
                </div>
              )}
            </div>

            {/* Benefits */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "0.875rem", backgroundColor: "var(--color-surface)", borderRadius: "0.5rem" }}>
              {["Adaptive calorie coaching", "Weight trend analysis", "Streak & goal tracking"].map((b) => (
                <div key={b} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--color-muted)" }}>
                  <CheckCircle2 size={14} color="var(--color-success)" />
                  {b}
                </div>
              ))}
            </div>

            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "0.75rem" }}
            >
              {loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : null}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "var(--color-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" style={{ color: "var(--color-primary-light)", fontWeight: 600, textDecoration: "none" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
