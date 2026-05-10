"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
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
        {/* Mobile top bar — hamburger left, theme toggle right */}
        <div className="md:hidden" style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.75rem 1rem 0",
        }}>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--color-muted)", padding: "0.25rem",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: "0.5rem",
            }}
          >
            <Menu size={24} />
          </button>
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
            {/* Close button row */}
            <div style={{
              display: "flex", justifyContent: "flex-end",
              padding: "0.75rem 0.75rem 0",
              backgroundColor: "var(--color-surface)",
              borderRight: "1px solid var(--color-border)",
            }}>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--color-muted)", padding: "0.375rem",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: "0.5rem",
                }}
              >
                <X size={20} />
              </button>
            </div>

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
