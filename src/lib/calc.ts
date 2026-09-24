import type { CategoryKind } from "@/lib/types";

export type CalcProduct = {
  id: number;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  estimatedUses: number | null;
  kind: CategoryKind;
};

export type CalcLine = {
  productId: number;
  quantity: number;
};

export type LineBreakdown = {
  productId: number;
  name: string;
  unit: string;
  kind: CategoryKind;
  quantityPerCandle: number;
  stock: number;
  lineCost: number;
  capacity: number | null;
  missingUses: boolean;
  remainingAfterBatch: number;
  consumedInBatch: number;
};

export type CandleQuote = {
  maxCandles: number;
  unitCost: number;
  marginPercent: number;
  marginFixed: number;
  percentMarginAmount: number;
  sellPrice: number;
  blockedByEquipment: boolean;
  missingConsumables: boolean;
  limitingProductId: number | null;
  limitingProductName: string | null;
  lines: LineBreakdown[];
  batchQuantity: number;
  batchCost: number;
  batchRevenue: number;
  batchMargin: number;
  warnings: string[];
};

const EPSILON = 1e-9;

const LOOSE_LOW_STOCK: Record<string, number> = {
  unidad: 5,
  g: 100,
  kg: 0.5,
  m: 2,
  cm: 50,
  ml: 20,
  L: 0.5,
};

export function floorDivision(stock: number, perCandle: number): number {
  if (perCandle <= 0) return Number.POSITIVE_INFINITY;
  if (stock <= 0) return 0;
  return Math.floor((stock + EPSILON) / perCandle);
}

export function calculateCandle(input: {
  products: CalcProduct[];
  lines: CalcLine[];
  marginPercent: number;
  marginFixed: number;
  batchQuantity?: number;
}): CandleQuote {
  const byId = new Map(input.products.map((product) => [product.id, product]));
  const ordered: CalcLine[] = [];

  for (const line of input.lines) {
    if (!byId.has(line.productId)) continue;
    const existing = ordered.find((item) => item.productId === line.productId);
    if (existing) existing.quantity += line.quantity;
    else ordered.push({ productId: line.productId, quantity: line.quantity });
  }

  const warnings: string[] = [];
  const lines: LineBreakdown[] = [];
  let unitCost = 0;
  let blockedByEquipment = false;
  let consumableCount = 0;
  let maxCandles = Number.POSITIVE_INFINITY;
  let limitingProductId: number | null = null;
  let limitingProductName: string | null = null;

  for (const line of ordered) {
    const product = byId.get(line.productId);
    if (!product) continue;

    if (product.kind === "fijo") {
      const uses = product.estimatedUses ?? 0;
      const missingUses = !(uses > 0);
      const lineCost = missingUses ? 0 : product.unitPrice / uses;
      if (missingUses) {
        warnings.push(
          `«${product.name}» no tiene usos estimados, así que su coste no se reparte entre las velas.`,
        );
      }
      if (product.quantity <= 0) {
        blockedByEquipment = true;
        warnings.push(`Sin «${product.name}» en el almacén no se puede fabricar.`);
      }
      unitCost += lineCost;
      lines.push({
        productId: product.id,
        name: product.name,
        unit: product.unit,
        kind: "fijo",
        quantityPerCandle: line.quantity,
        stock: product.quantity,
        lineCost,
        capacity: product.quantity > 0 ? null : 0,
        missingUses,
        remainingAfterBatch: product.quantity,
        consumedInBatch: 0,
      });
      continue;
    }

    if (line.quantity <= 0) {
      warnings.push(`«${product.name}» está en la receta con cantidad 0 y no cuenta.`);
      continue;
    }

    consumableCount += 1;
    const capacity = floorDivision(product.quantity, line.quantity);
    const lineCost = line.quantity * product.unitPrice;
    unitCost += lineCost;
    if (capacity < maxCandles) {
      maxCandles = capacity;
      limitingProductId = product.id;
      limitingProductName = product.name;
    }
    lines.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      kind: "consumible",
      quantityPerCandle: line.quantity,
      stock: product.quantity,
      lineCost,
      capacity,
      missingUses: false,
      remainingAfterBatch: product.quantity,
      consumedInBatch: 0,
    });
  }

  const missingConsumables = consumableCount === 0;
  if (missingConsumables) {
    maxCandles = 0;
    limitingProductId = null;
    limitingProductName = null;
    warnings.push("Añade un material que se consuma en cada vela para saber cuántas puedes hacer.");
  } else if (blockedByEquipment) {
    maxCandles = 0;
    limitingProductId = null;
    limitingProductName = null;
  } else if (!Number.isFinite(maxCandles)) {
    maxCandles = 0;
  }

  const marginPercent = Number.isFinite(input.marginPercent) ? input.marginPercent : 0;
  const marginFixed = Number.isFinite(input.marginFixed) ? input.marginFixed : 0;
  const percentMarginAmount = unitCost * (marginPercent / 100);
  const sellPrice = unitCost + percentMarginAmount + marginFixed;
  const requested = input.batchQuantity ?? 0;
  const safeRequested = Number.isFinite(requested) ? Math.floor(requested) : 0;
  const batchQuantity = Math.max(0, Math.min(safeRequested, maxCandles));

  for (const line of lines) {
    if (line.kind === "consumible") {
      line.consumedInBatch = line.quantityPerCandle * batchQuantity;
      line.remainingAfterBatch = line.stock - line.consumedInBatch;
    }
  }

  return {
    maxCandles,
    unitCost,
    marginPercent,
    marginFixed,
    percentMarginAmount,
    sellPrice,
    blockedByEquipment,
    missingConsumables,
    limitingProductId,
    limitingProductName,
    lines,
    batchQuantity,
    batchCost: unitCost * batchQuantity,
    batchRevenue: sellPrice * batchQuantity,
    batchMargin: (sellPrice - unitCost) * batchQuantity,
    warnings,
  };
}

export type StockStatus = "ok" | "bajo" | "agotado";

export function describeStockPressure(
  product: CalcProduct,
  candles: Array<{ name: string; lines: CalcLine[] }>,
): { status: StockStatus; detail: string } {
  if (product.quantity <= 0) {
    return {
      status: "agotado",
      detail:
        product.kind === "fijo"
          ? "Sin este equipo no se puede fabricar ninguna vela que lo necesite."
          : "No queda nada en el almacén.",
    };
  }

  if (product.kind === "fijo") {
    return { status: "ok", detail: "" };
  }

  let worst: { candles: number; name: string } | null = null;
  for (const candle of candles) {
    const line = candle.lines.find((item) => item.productId === product.id);
    if (!line || line.quantity <= 0) continue;
    const capacity = floorDivision(product.quantity, line.quantity);
    if (!worst || capacity < worst.candles) {
      worst = { candles: capacity, name: candle.name };
    }
  }

  if (worst && worst.candles < 10) {
    const noun = worst.candles === 1 ? "vela" : "velas";
    return {
      status: "bajo",
      detail: `Solo alcanza para ${worst.candles} ${noun} de «${worst.name}».`,
    };
  }

  const threshold = LOOSE_LOW_STOCK[product.unit] ?? 5;
  if (product.quantity < threshold) {
    return {
      status: "bajo",
      detail: "Queda poca cantidad en el almacén.",
    };
  }

  return { status: "ok", detail: "" };
}
