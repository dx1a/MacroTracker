"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="card-sm" style={{
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      transition: "transform 0.2s, box-shadow 0.2s",
    }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </span>
        {icon && (
          <span style={{ color: accent ?? "var(--color-primary)", opacity: 0.8 }}>
            {icon}
          </span>
        )}
      </div>
      <span style={{ fontSize: "1.5rem", fontWeight: 800, color: accent ?? "var(--color-foreground)", lineHeight: 1 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontSize: "0.75rem", color: "var(--color-muted)" }}>{sub}</span>
      )}
    </div>
  );
}
