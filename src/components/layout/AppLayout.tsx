"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {/* Mobile theme toggle — top right, hidden on desktop */}
        <div className="md:hidden" style={{ display: "flex", justifyContent: "flex-end", padding: "0.75rem 1rem 0" }}>
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
    </div>
  );
}
