"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  UtensilsCrossed,
  BarChart3,
  User,
  LogOut,
  Zap,
  ClipboardCheck,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Food Log", icon: UtensilsCrossed },
  { href: "/checkin", label: "Check-In", icon: ClipboardCheck },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: "220px",
        minWidth: "220px",
        backgroundColor: "var(--color-surface)",
        borderRight: "1px solid var(--color-border)",
        display: "flex",
        flexDirection: "column",
        padding: "1.5rem 1rem",
        gap: "0.5rem",
      }}
    >
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", marginBottom: "1rem" }}>
        <div style={{
          width: "32px", height: "32px", borderRadius: "8px",
          background: "linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={18} color="white" />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--color-foreground)" }}>
          MacroTrack
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                borderRadius: "0.625rem",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 500,
                color: active ? "var(--color-primary-light)" : "var(--color-muted)",
                backgroundColor: active ? "color-mix(in srgb, var(--color-primary) 12%, transparent)" : "transparent",
                textDecoration: "none",
                transition: "all 0.15s",
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <ThemeToggle />

      {/* Sign out */}
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.625rem 0.875rem",
          borderRadius: "0.625rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          color: "var(--color-muted)",
          backgroundColor: "transparent",
          border: "none",
          cursor: "pointer",
          width: "100%",
          transition: "all 0.15s",
        }}
      >
        <LogOut size={18} />
        Sign Out
      </button>
    </aside>
  );
}
