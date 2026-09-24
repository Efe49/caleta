"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto grid max-w-lg gap-3 py-10 text-center">
      <h1 className="font-heading text-3xl">No se ha podido abrir el taller</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Ha habido un problema al cargar los datos. Prueba de nuevo en un momento.
      </p>
      <div>
        <Button className="h-10" onClick={() => reset()}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
