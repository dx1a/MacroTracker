"use client";

import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: "1.5rem", maxWidth: "1400px", width: "100%", margin: "0 auto" }}>
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
