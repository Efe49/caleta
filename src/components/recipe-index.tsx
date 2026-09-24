"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExampleBadge } from "@/components/example-badge";
import { Field } from "@/components/field";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createCandleAction } from "@/app/actions";
import { formatEuro } from "@/lib/format";
import type { CandleQuote } from "@/lib/calc";
import type { CandleType } from "@/lib/types";

export function RecipeIndex({
  candles,
}: {
  candles: Array<CandleType & { quote: CandleQuote }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Coste y precio</p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Recetas</h1>
        </div>
        <Button className="h-10" onClick={() => setOpen(true)}>
          Nueva vela
        </Button>
      </div>

      {candles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay tipos de vela</CardTitle>
            <CardDescription>
              Crea el primero para juntar cera, mecha y envase, y ver el precio de venta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setOpen(true)}>Crear una receta</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {candles.map((candle) => (
            <Card key={candle.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="font-heading text-xl">{candle.name}</CardTitle>
                  {candle.isExample ? <ExampleBadge /> : null}
                </div>
                <CardDescription>
                  Hasta {candle.quote.maxCandles} {candle.quote.maxCandles === 1 ? "vela" : "velas"} · coste{" "}
                  {formatEuro(candle.quote.unitCost)} · venta {formatEuro(candle.quote.sellPrice)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" render={<Link href={`/recetas/${candle.id}`} />}>
                  Abrir receta
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <NewCandleDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}

function NewCandleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await createCandleAction(name);
      if (!result.ok || !result.id) {
        setError(result.ok ? "No se ha podido crear la vela." : result.error);
        return;
      }
      toast.success("Receta creada. Añade los materiales.");
      setName("");
      onOpenChange(false);
      router.push(`/recetas/${result.id}`);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva vela</DialogTitle>
          <DialogDescription>
            Luego añades los materiales y un solo margen: un porcentaje o un importe fijo.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>No se ha creado</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field label="Nombre" htmlFor="candle-name">
          <Input
            id="candle-name"
            className="h-10"
            value={name}
            placeholder="Vela de lavanda 180 ml"
            onChange={(event) => setName(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Creando…" : "Crear receta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
