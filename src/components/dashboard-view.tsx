import Link from "next/link";
import { ExampleBadge } from "@/components/example-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEuro, formatQty } from "@/lib/format";
import { KIND_LABEL, type Category, type Product } from "@/lib/types";
import type { getDashboard } from "@/lib/queries";

type Dashboard = ReturnType<typeof getDashboard>;

function StockBadge({ status }: { status: "bajo" | "agotado" }) {
  return (
    <Badge variant={status === "agotado" ? "destructive" : "secondary"}>
      {status === "agotado" ? "Agotado" : "Bajo"}
    </Badge>
  );
}

export function DashboardView({ data }: { data: Dashboard }) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Hoy en el taller</p>
          <h1 className="font-heading text-3xl tracking-tight sm:text-4xl">Qué puedes hacer con lo que hay</h1>
        </div>
        <Button render={<Link href="/recetas" />} className="h-10 px-4">
          Ver recetas
        </Button>
      </div>

      {data.hasExamples ? (
        <p className="rounded-xl bg-accent px-4 py-3 text-sm leading-relaxed text-accent-foreground">
          Los datos marcados como ejemplo son de muestra: una vela de soja y el material para hacerla.
          Puedes editarlos o borrarlos cuando quieras.
        </p>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Valor del almacén</CardDescription>
            <CardTitle className="font-heading text-2xl">{formatEuro(data.stockValue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Referencias</CardDescription>
            <CardTitle className="font-heading text-2xl">{data.products.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Tipos de vela</CardDescription>
            <CardTitle className="font-heading text-2xl">{data.candles.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-3">
        <div>
          <h2 className="font-heading text-2xl">Para revisar</h2>
          <p className="text-sm text-muted-foreground">
            Avisamos si algo está agotado, si queda poca cantidad, o si no alcanza para 10 velas de una receta.
          </p>
        </div>
        {data.lowStock.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              El almacén está holgado. Ningún material está bajo ni agotado.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2">
            {data.lowStock.map((product) => (
              <Card key={product.id} size="sm">
                <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-muted-foreground">{product.detail}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{formatQty(product.quantity, product.unit)}</span>
                    <StockBadge status={product.status} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4">
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-heading text-2xl">Almacén por categoría</h2>
          <Link href="/almacen" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
            Editar stock
          </Link>
        </div>
        {data.categories.length === 0 ? (
          <Card>
            <CardContent className="text-sm text-muted-foreground">
              Todavía no hay categorías. Crea la primera en el almacén.
            </CardContent>
          </Card>
        ) : (
          data.categories.map((category) => (
            <CategoryBlock key={category.id} category={category} lowStock={data.lowStock} />
          ))
        )}
      </section>

      <section className="grid gap-4">
        <div>
          <h2 className="font-heading text-2xl">Velas</h2>
          <p className="text-sm text-muted-foreground">
            El precio de venta es el coste de una vela, más el margen en porcentaje y un margen fijo en euros.
          </p>
        </div>
        {data.candles.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Todavía no hay tipos de vela</CardTitle>
              <CardDescription>
                Crea una receta para ver cuántas puedes hacer, el coste y el precio de venta.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/recetas" />}>Crear una receta</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {data.candles.map((candle) => (
              <Card key={candle.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="font-heading text-xl">{candle.name}</CardTitle>
                    {candle.isExample ? <ExampleBadge /> : null}
                  </div>
                  <CardDescription>
                    {candle.quote.limitingProductName
                      ? `Te limita ${candle.quote.limitingProductName}.`
                      : candle.quote.maxCandles === 0
                        ? "Ahora mismo no se puede fabricar."
                        : "Lista para fabricar."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <p className="font-heading text-3xl tracking-tight">
                    {candle.quote.maxCandles}{" "}
                    <span className="text-lg font-normal text-muted-foreground">
                      {candle.quote.maxCandles === 1 ? "vela" : "velas"}
                    </span>
                  </p>
                  <dl className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Coste</dt>
                      <dd className="font-medium">{formatEuro(candle.quote.unitCost)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Margen {formatNumberPercent(candle.marginPercent)}</dt>
                      <dd className="font-medium">{formatEuro(candle.quote.percentMarginAmount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Margen fijo</dt>
                      <dd className="font-medium">{formatEuro(candle.marginFixed)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Precio de venta</dt>
                      <dd className="font-medium">{formatEuro(candle.quote.sellPrice)}</dd>
                    </div>
                  </dl>
                  <Button variant="outline" render={<Link href={`/recetas/${candle.id}`} />}>
                    Abrir receta
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function formatNumberPercent(value: number) {
  return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} %`;
}

function CategoryBlock({
  category,
  lowStock,
}: {
  category: Category & { products: Product[]; stockValue: number };
  lowStock: Dashboard["lowStock"];
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{category.name}</CardTitle>
          <Badge variant="secondary">{KIND_LABEL[category.kind]}</Badge>
          {category.isExample ? <ExampleBadge /> : null}
        </div>
        <CardDescription>
          {category.products.length === 0
            ? "Sin productos"
            : `${category.products.length} ${category.products.length === 1 ? "producto" : "productos"} · ${formatEuro(category.stockValue)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {category.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">Añade el primer producto de esta categoría en el almacén.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {category.products.map((product) => {
              const pressure = lowStock.find((item) => item.id === product.id);
              return (
                <li key={product.id} className="rounded-lg bg-muted/60 px-3 py-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{product.name}</span>
                    {product.isExample ? <ExampleBadge /> : null}
                    {pressure ? <StockBadge status={pressure.status} /> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatQty(product.quantity, product.unit)} · {formatEuro(product.unitPrice)} / {product.unit}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
