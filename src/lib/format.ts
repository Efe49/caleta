export function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number, digits = 3): string {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatQty(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!trimmed || trimmed === "." || trimmed === "-" || trimmed === "-.") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function roundQty(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
