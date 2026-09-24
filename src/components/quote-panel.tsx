import type { CandleQuote } from "@/lib/calc";
import { formatEuro, formatNumber, formatQty } from "@/lib/format";

export function QuotePanel({ quote }: { quote: CandleQuote }) {
  return (
    <div className="grid gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div>
        <p className="text-sm text-muted-foreground">Puedes hacer</p>
        <p className="font-heading text-4xl tracking-tight">
          {quote.maxCandles}
          <span className="ml-2 text-lg font-normal text-muted-foreground">
            {quote.maxCandles === 1 ? "vela" : "velas"}
          </span>
        </p>
        {quote.limitingProductName ? (
          <p className="mt-1 text-sm text-muted-foreground">Te limita {quote.limitingProductName}.</p>
        ) : null}
      </div>

      <dl className="grid gap-2 text-sm">
        <Row label="Coste" value={formatEuro(quote.unitCost)} />
        <Row
          label={`Margen ${formatNumber(quote.marginPercent, 2)} %`}
          value={formatEuro(quote.percentMarginAmount)}
        />
        <Row label="Margen fijo" value={formatEuro(quote.marginFixed)} />
        <Row label="Precio de venta" value={formatEuro(quote.sellPrice)} strong />
      </dl>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Precio = coste × (1 + margen %) + margen fijo.
      </p>

      {quote.lines.length > 0 ? (
        <ul className="grid gap-2 border-t border-border pt-3 text-sm">
          {quote.lines.map((line) => (
            <li key={line.productId} className="flex items-start justify-between gap-3">
              <span>
                <span className="block font-medium">{line.name}</span>
                <span className="text-muted-foreground">
                  {line.kind === "fijo"
                    ? "Equipo · no se descuenta"
                    : `${formatQty(line.quantityPerCandle, line.unit)} por vela`}
                </span>
              </span>
              <span className="shrink-0">{formatEuro(line.lineCost)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {quote.warnings.length > 0 ? (
        <ul className="grid gap-1 text-sm text-destructive">
          {quote.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-heading text-lg" : "font-medium"}>{value}</dd>
    </div>
  );
}
