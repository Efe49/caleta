"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") {
    return <div className="fixed inset-0 overflow-hidden bg-[#1d4e89]">{children}</div>;
  }
  return (
    <div className="flex min-h-full flex-col bg-[radial-gradient(ellipse_at_top,oklch(0.97_0.03_82),transparent_55%)]">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
