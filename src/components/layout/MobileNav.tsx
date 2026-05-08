"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, BarChart3, User } from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log", icon: UtensilsCrossed },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        padding: "0.375rem 0.25rem",
        paddingBottom: "calc(0.375rem + env(safe-area-inset-bottom, 0px))",
        zIndex: 50,
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
  );
}
