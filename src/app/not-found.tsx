import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-lg gap-3 py-10 text-center">
      <h1 className="font-heading text-3xl">No está en el taller</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Esa página o esa receta no existe. Vuelve al tablero para seguir con el stock y las velas.
      </p>
      <div>
        <Button className="h-10" render={<Link href="/" />}>
          Ir al tablero
        </Button>
      </div>
    </div>
  );
}
