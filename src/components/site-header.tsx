"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/", label: "Tablero" },
  { href: "/almacen", label: "Almacén" },
  { href: "/recetas", label: "Recetas" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function actualizar() {
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/actualizar", { method: "POST" });
      const data = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; error?: string } | null;
      if (!response.ok || !data?.ok) {
        setNotice({
          ok: false,
          text: data?.error?.trim() || "No se ha podido actualizar.",
        });
        return;
      }
      setNotice({ ok: true, text: data.message?.trim() || "Actualización en marcha" });
    } catch {
      setNotice({
        ok: false,
        text: "El servicio de actualización no está en marcha. En desarrollo local la aplicación no se ha actualizado.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <header className="border-b border-border/80 bg-card/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-primary font-heading text-lg text-primary-foreground shadow-sm">
            A
          </span>
          <span>
            <span className="block font-heading text-2xl leading-none tracking-tight">ALBA</span>
            <span className="text-sm text-muted-foreground">Taller de velas</span>
          </span>
        </Link>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <nav className="grid grid-cols-3 gap-1 sm:flex" aria-label="Secciones">
              {links.map((link) => {
                const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-full px-3 py-2 text-center text-sm font-medium transition-colors",
                      active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
            <Button type="button" variant="outline" className="h-10" onClick={actualizar} disabled={pending}>
              {pending ? "Actualizando…" : "Actualizar"}
            </Button>
          </div>
          {notice ? (
            <p
              role={notice.ok ? "status" : "alert"}
              className={cn("max-w-sm text-sm", notice.ok ? "text-foreground" : "text-destructive")}
            >
              {notice.text}
            </p>
          ) : null}
        </div>
      </div>
    </header>
  );
}
