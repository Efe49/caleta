export type CategoryKind = "fijo" | "consumible";

export const UNITS = ["g", "kg", "m", "cm", "ml", "L", "unidad"] as const;

export type Unit = (typeof UNITS)[number];

export const KIND_LABEL: Record<CategoryKind, string> = {
  fijo: "Activo fijo",
  consumible: "Consumible",
};

export type Category = {
  id: number;
  name: string;
  kind: CategoryKind;
  isExample: boolean;
  productCount: number;
};

export type Product = {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string;
  kind: CategoryKind;
  unit: string;
  quantity: number;
  unitPrice: number;
  estimatedUses: number | null;
  isExample: boolean;
};

export type RecipeLine = {
  id: number;
  productId: number;
  quantity: number;
};

export type CandleType = {
  id: number;
  name: string;
  marginPercent: number;
  marginFixed: number;
  isExample: boolean;
  lines: RecipeLine[];
};

export type ActionResult = { ok: true; id?: number } | { ok: false; error: string };
