export function formatCoins(value: number): string {
  return Math.floor(value).toLocaleString("es-ES");
}

export function formatWeight(kg: number): string {
  return `${kg.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`;
}
