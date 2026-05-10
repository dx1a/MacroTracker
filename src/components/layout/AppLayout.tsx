"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setDrawerOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar — theme toggle right */}
        <div className="md:hidden" style={{
          display: "flex", justifyContent: "flex-end", alignItems: "center",
          padding: "0.75rem 1rem 0",
        }}>
          <ThemeToggle iconOnly />
        </div>

        <div className="mobile-bottom-safe" style={{ flex: 1, padding: "1.5rem", maxWidth: "1400px", width: "100%", margin: "0 auto" }}>
          {children}
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden">
          <MobileNav />
        </div>
      </main>

      {/* Arrow tab — always visible on mobile, slides with drawer */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          top: "50%",
          left: drawerOpen ? "260px" : 0,
          transform: "translateY(-50%)",
          zIndex: 302,
          transition: "left 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        }}
      >
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "22px", height: "52px",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderLeft: drawerOpen ? "1px solid var(--color-border)" : "none",
            borderRadius: drawerOpen ? "0 0.5rem 0.5rem 0" : "0 0.5rem 0.5rem 0",
            cursor: "pointer",
            color: "var(--color-muted)",
            boxShadow: "2px 0 8px rgba(0,0,0,0.15)",
            padding: 0,
          }}
        >
          {drawerOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Mobile slide-in drawer */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 300,
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
              animation: "fadeInBackdrop 0.2s ease",
            }}
          />

          {/* Drawer panel */}
          <div style={{
            position: "fixed", top: 0, left: 0, bottom: 0,
            width: "260px", zIndex: 301,
            display: "flex", flexDirection: "column",
            animation: "slideInDrawer 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            boxShadow: "4px 0 24px rgba(0,0,0,0.35)",
          }}>
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slideInDrawer {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
