import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "MacroTrack — Premium Nutrition Tracker",
  description: "Track your macros, calories, and weight with intelligent adaptive coaching.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.setAttribute('data-theme','light');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col" style={{ backgroundColor: "var(--color-background)", color: "var(--color-foreground)" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
