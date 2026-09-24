"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExampleBadge } from "@/components/example-badge";
import { Field } from "@/components/field";
import { QuotePanel } from "@/components/quote-panel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  addRecipeLineAction,
  deleteCandleAction,
  registerProductionAction,
  removeRecipeLineAction,
  updateCandleAction,
  updateRecipeLineAction,
} from "@/app/actions";
import { calculateCandle } from "@/lib/calc";
import { formatEuro, formatQty, parseDecimal } from "@/lib/format";
import { KIND_LABEL, type CandleType, type Product } from "@/lib/types";

export function RecipeStudio({ candle, products }: { candle: CandleType; products: Product[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(candle.name);
  const [percent, setPercent] = useState(String(candle.marginPercent));
  const [fixed, setFixed] = useState(String(candle.marginFixed));
  const [batch, setBatch] = useState("1");
  const [productId, setProductId] = useState("");
  const [lineQty, setLineQty] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [qtyByLine, setQtyByLine] = useState<Record<number, string>>(() =>
    Object.fromEntries(candle.lines.map((line) => [line.id, String(line.quantity)])),
  );

  const usedIds = new Set(candle.lines.map((line) => line.productId));
  const available = products.filter((product) => !usedIds.has(product.id));
  const selected = products.find((product) => String(product.id) === productId);

  const quote = useMemo(() => {
    return calculateCandle({
      products,
      lines: candle.lines.map((line) => ({
        productId: line.productId,
        quantity: parseDecimal(qtyByLine[line.id] ?? "") ?? line.quantity,
      })),
      marginPercent: parseDecimal(percent) ?? 0,
      marginFixed: parseDecimal(fixed) ?? 0,
      batchQuantity: parseDecimal(batch) ?? 0,
    });
  }, [products, candle.lines, qtyByLine, percent, fixed, batch]);

  function saveFicha() {
    const marginPercent = parseDecimal(percent);
    const marginFixed = parseDecimal(fixed);
    if (marginPercent == null || marginFixed == null) {
      setError("Escribe los dos márgenes con números.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateCandleAction(candle.id, { name, marginPercent, marginFixed });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Ficha guardada.");
      router.refresh();
    });
  }

  function addLine() {
    const id = Number(productId);
    if (!id) {
      setError("Elige un producto.");
      return;
    }
    const quantity = selected?.kind === "fijo" ? 0 : parseDecimal(lineQty);
    if (selected?.kind !== "fijo" && (quantity == null || quantity <= 0)) {
      setError("La cantidad por vela tiene que ser mayor que cero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addRecipeLineAction(candle.id, id, quantity ?? 0);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProductId("");
      setLineQty("1");
      toast.success("Línea añadida a la receta.");
      router.refresh();
    });
  }

  function persistLine(lineId: number, productKind: Product["kind"]) {
    if (productKind === "fijo") return;
    const quantity = parseDecimal(qtyByLine[lineId] ?? "");
    if (quantity == null || quantity <= 0) {
      setError("La cantidad por vela tiene que ser mayor que cero.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await updateRecipeLineAction(lineId, quantity);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function removeLine(lineId: number) {
    setError(null);
    startTransition(async () => {
      const result = await removeRecipeLineAction(lineId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success("Línea quitada.");
      router.refresh();
    });
  }

  function confirmProduction() {
    setError(null);
    startTransition(async () => {
      const result = await registerProductionAction(candle.id, quote.batchQuantity);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmOpen(false);
      setBatch("1");
      toast.success("Fabricación registrada. El stock de materiales ya está descontado.");
      router.refresh();
    });
  }

  function removeCandle() {
    startTransition(async () => {
      const result = await deleteCandleAction(candle.id);
      if (!result.ok) {
        setError(result.error);
        setDeleteOpen(false);
        return;
      }
      toast.success("Receta borrada.");
      router.push("/recetas");
      router.refresh();
    });
  }

  const typedBatch = Math.floor(parseDecimal(batch) ?? 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3">
        <Link href="/recetas" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Volver a las recetas
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">{candle.name}</h1>
          {candle.isExample ? <ExampleBadge /> : null}
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Los materiales y el empaquetado se gastan en cada vela. El equipo solo tiene que estar en el almacén:
          su coste por vela es el precio dividido entre los usos estimados.
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Revisa este dato</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Ficha</CardTitle>
              <CardDescription>El precio se recalcula al cambiar los márgenes, aunque todavía no guardes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field label="Nombre" htmlFor="recipe-name">
                <Input id="recipe-name" className="h-10" value={name} onChange={(event) => setName(event.target.value)} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Margen (%)" htmlFor="margin-percent" hint="Se aplica sobre el coste.">
                  <Input
                    id="margin-percent"
                    inputMode="decimal"
                    className="h-10"
                    value={percent}
                    onChange={(event) => setPercent(event.target.value)}
                  />
                </Field>
                <Field label="Margen fijo (€)" htmlFor="margin-fixed" hint="Euros que sumas a cada vela.">
                  <Input
                    id="margin-fixed"
                    inputMode="decimal"
                    className="h-10"
                    value={fixed}
                    onChange={(event) => setFixed(event.target.value)}
                  />
                </Field>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button className="h-10" onClick={saveFicha} disabled={pending}>
                  {pending ? "Guardando…" : "Guardar ficha"}
                </Button>
                <Button variant="destructive" className="h-10" onClick={() => setDeleteOpen(true)}>
                  Borrar receta
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Materiales</CardTitle>
              <CardDescription>Añade lo que entra en una vela. El equipo se marca como necesario, sin cantidad.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {candle.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Esta vela todavía no tiene materiales.</p>
              ) : (
                <ul className="grid gap-3">
                  {candle.lines.map((line) => {
                    const product = products.find((item) => item.id === line.productId);
                    if (!product) return null;
                    return (
                      <li key={line.id} className="grid gap-2 rounded-lg bg-muted/50 p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="grid gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{product.name}</p>
                            <span className="text-xs text-muted-foreground">{KIND_LABEL[product.kind]}</span>
                          </div>
                          {product.kind === "fijo" ? (
                            <p className="text-sm text-muted-foreground">
                              Equipo necesario. Coste por vela:{" "}
                              {product.estimatedUses
                                ? formatEuro(product.unitPrice / product.estimatedUses)
                                : "indica los usos estimados en el almacén"}
                              . En stock: {formatQty(product.quantity, product.unit)}.
                            </p>
                          ) : (
                            <Field label={`Cantidad por vela (${product.unit})`} htmlFor={`line-${line.id}`}>
                              <Input
                                id={`line-${line.id}`}
                                inputMode="decimal"
                                className="h-10"
                                value={qtyByLine[line.id] ?? String(line.quantity)}
                                onChange={(event) =>
                                  setQtyByLine((current) => ({ ...current, [line.id]: event.target.value }))
                                }
                                onBlur={() => persistLine(line.id, product.kind)}
                              />
                            </Field>
                          )}
                        </div>
                        <Button variant="outline" onClick={() => removeLine(line.id)} disabled={pending}>
                          Quitar
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {products.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Primero añade productos en el almacén.
                </p>
              ) : available.length === 0 ? (
                <p className="text-sm text-muted-foreground">Todos los productos del almacén ya están en esta receta.</p>
              ) : (
                <div className="grid gap-3 border-t border-border pt-4">
                  <Field label="Añadir producto" htmlFor="add-product">
                    <Select value={productId} onValueChange={(value) => setProductId(value ?? "")}>
                      <SelectTrigger id="add-product" className="h-10 w-full">
                        <SelectValue placeholder="Elige cera, mecha, vaso o un molde" />
                      </SelectTrigger>
                      <SelectContent>
                        {available.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name} · {KIND_LABEL[product.kind]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  {selected && selected.kind !== "fijo" ? (
                    <Field label={`Cantidad por vela (${selected.unit})`} htmlFor="add-qty">
                      <Input
                        id="add-qty"
                        inputMode="decimal"
                        className="h-10"
                        value={lineQty}
                        onChange={(event) => setLineQty(event.target.value)}
                      />
                    </Field>
                  ) : null}
                  {selected?.kind === "fijo" ? (
                    <p className="text-sm text-muted-foreground">
                      Este equipo no se descuenta. Si su stock es cero, no podrás fabricar la vela.
                    </p>
                  ) : null}
                  <Button className="h-10" onClick={addLine} disabled={pending}>
                    Añadir a la receta
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fabricar un lote</CardTitle>
              <CardDescription>
                El stock no cambia hasta que confirmas. Solo se descuentan los materiales consumibles.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Field
                label="Cuántas quieres hacer"
                htmlFor="batch-qty"
                hint={quote.maxCandles > 0 ? `Máximo con el stock actual: ${quote.maxCandles}.` : "Ahora mismo el máximo es 0."}
              >
                <Input
                  id="batch-qty"
                  inputMode="numeric"
                  className="h-10"
                  value={batch}
                  disabled={quote.maxCandles === 0}
                  onChange={(event) => setBatch(event.target.value)}
                />
              </Field>
              {typedBatch > quote.maxCandles && quote.maxCandles > 0 ? (
                <p className="text-sm text-muted-foreground">
                  Has pedido {typedBatch}. El cálculo usa {quote.batchQuantity}, que es el máximo posible.
                </p>
              ) : null}
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Coste del lote</dt>
                  <dd className="font-medium">{formatEuro(quote.batchCost)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ingresos si las vendes</dt>
                  <dd className="font-medium">{formatEuro(quote.batchRevenue)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Margen del lote</dt>
                  <dd className="font-medium">{formatEuro(quote.batchMargin)}</dd>
                </div>
              </dl>
              {quote.lines.length > 0 ? (
                <div>
                  <p className="mb-2 text-sm font-medium">Stock que quedaría</p>
                  <ul className="grid gap-1 text-sm">
                    {quote.lines.map((line) => (
                      <li key={line.productId} className="flex justify-between gap-3">
                        <span>{line.name}</span>
                        <span className="text-muted-foreground">
                          {formatQty(line.stock, line.unit)} → {formatQty(line.remainingAfterBatch, line.unit)}
                          {line.kind === "fijo" ? " (no se toca)" : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <Button className="h-10" disabled={pending || quote.batchQuantity < 1} onClick={() => setConfirmOpen(true)}>
                Registrar fabricación
              </Button>
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-4">
          <QuotePanel quote={quote} />
        </aside>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              ¿Registrar {quote.batchQuantity} {quote.batchQuantity === 1 ? "vela" : "velas"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se descontará el material de «{name || candle.name}». Los moldes y herramientas se quedan como están.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="grid gap-1 text-sm">
            {quote.lines
              .filter((line) => line.kind === "consumible")
              .map((line) => (
                <li key={line.productId}>
                  {line.name}: −{formatQty(line.consumedInBatch, line.unit)}
                </li>
              ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={confirmProduction}>
              {pending ? "Registrando…" : "Confirmar fabricación"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar {candle.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se elimina la receta. El stock del almacén no cambia.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={pending} onClick={removeCandle}>
              Borrar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
