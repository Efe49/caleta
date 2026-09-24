"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

const links = [
  { href: "/", label: "Tablero" },
  { href: "/almacen", label: "Almacén" },
  { href: "/recetas", label: "Recetas" },
];

export function SiteHeader() {
  const pathname = usePathname();

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
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
