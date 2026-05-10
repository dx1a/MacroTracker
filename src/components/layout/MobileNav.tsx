"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, BarChart3, User, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: UtensilsCrossed },
  { href: "/checkin", label: "Check-In", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
      {/* Toggle tab */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <button
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Show navigation" : "Hide navigation"}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: "48px", height: "18px",
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderBottom: "none",
            borderRadius: "0.5rem 0.5rem 0 0",
            cursor: "pointer",
            color: "var(--color-muted)",
            padding: 0,
          }}
        >
          {collapsed ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Nav bar */}
      <nav
        style={{
          backgroundColor: "var(--color-surface)",
          borderTop: "1px solid var(--color-border)",
          display: collapsed ? "none" : "flex",
          padding: "0.375rem 0.25rem",
          paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.5rem 0.25rem",
                borderRadius: "0.625rem",
                color: active ? "var(--color-primary-light)" : "var(--color-muted)",
                backgroundColor: active ? "color-mix(in srgb, var(--color-primary) 10%, transparent)" : "transparent",
                textDecoration: "none",
                fontSize: "0.68rem",
                fontWeight: active ? 600 : 500,
                transition: "all 0.15s",
              }}
            >
              <Icon size={22} />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
