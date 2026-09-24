import type Database from "better-sqlite3";
import { calculateCandle, describeStockPressure, type CalcProduct } from "@/lib/calc";
import { roundQty } from "@/lib/format";
import type { CandleType, Category, CategoryKind, Product, RecipeLine } from "@/lib/types";

type CategoryRow = {
  id: number;
  name: string;
  kind: CategoryKind;
  is_example: number;
  product_count: number;
};

type ProductRow = {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  kind: CategoryKind;
  unit: string;
  quantity: number;
  unit_price: number;
  estimated_uses: number | null;
  is_example: number;
};

type CandleRow = {
  id: number;
  name: string;
  margin_percent: number;
  margin_fixed: number;
  is_example: number;
};

type LineRow = {
  id: number;
  candle_type_id: number;
  product_id: number;
  quantity: number;
};

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    isExample: row.is_example === 1,
    productCount: row.product_count,
  };
}

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    categoryName: row.category_name,
    kind: row.kind,
    unit: row.unit,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    estimatedUses: row.estimated_uses,
    isExample: row.is_example === 1,
  };
}

export function listCategories(db: Database.Database): Category[] {
  const rows = db
    .prepare(
      `SELECT c.id, c.name, c.kind, c.is_example,
              (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
       FROM categories c
       ORDER BY c.id`,
    )
    .all() as CategoryRow[];
  return rows.map(mapCategory);
}

export function listProducts(db: Database.Database): Product[] {
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.category_id, c.name AS category_name, c.kind, p.unit,
              p.quantity, p.unit_price, p.estimated_uses, p.is_example
       FROM products p
       JOIN categories c ON c.id = p.category_id
       ORDER BY c.id, p.name COLLATE NOCASE`,
    )
    .all() as ProductRow[];
  return rows.map(mapProduct);
}

export function listCandles(db: Database.Database): CandleType[] {
  const candles = db
    .prepare(
      `SELECT id, name, margin_percent, margin_fixed, is_example
       FROM candle_types
       ORDER BY id`,
    )
    .all() as CandleRow[];
  const lines = db
    .prepare(
      `SELECT id, candle_type_id, product_id, quantity
       FROM recipe_lines
       ORDER BY id`,
    )
    .all() as LineRow[];

  return candles.map((candle) => ({
    id: candle.id,
    name: candle.name,
    marginPercent: candle.margin_percent,
    marginFixed: candle.margin_fixed,
    isExample: candle.is_example === 1,
    lines: lines
      .filter((line) => line.candle_type_id === candle.id)
      .map(
        (line): RecipeLine => ({
          id: line.id,
          productId: line.product_id,
          quantity: line.quantity,
        }),
      ),
  }));
}

export function getCandle(db: Database.Database, id: number): CandleType | null {
  return listCandles(db).find((candle) => candle.id === id) ?? null;
}

function toCalcProduct(product: Product): CalcProduct {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    quantity: product.quantity,
    unitPrice: product.unitPrice,
    estimatedUses: product.estimatedUses,
    kind: product.kind,
  };
}

export function quoteCandle(
  candle: CandleType,
  products: Product[],
  batchQuantity = 0,
) {
  return calculateCandle({
    products: products.map(toCalcProduct),
    lines: candle.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
    })),
    marginPercent: candle.marginPercent,
    marginFixed: candle.marginFixed,
    batchQuantity,
  });
}

export function getDashboard(db: Database.Database) {
  const categories = listCategories(db);
  const products = listProducts(db);
  const candles = listCandles(db);
  const stockValue = products.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0);
  const grouped = categories.map((category) => {
    const items = products.filter((product) => product.categoryId === category.id);
    return {
      ...category,
      products: items,
      stockValue: items.reduce((sum, product) => sum + product.quantity * product.unitPrice, 0),
    };
  });

  const candleInputs = candles.map((candle) => ({
    name: candle.name,
    lines: candle.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
  }));

  const lowStock = products
    .map((product) => {
      const pressure = describeStockPressure(toCalcProduct(product), candleInputs);
      return { ...product, status: pressure.status, detail: pressure.detail };
    })
    .filter(
      (product): product is Product & { status: "bajo" | "agotado"; detail: string } =>
        product.status !== "ok",
    );

  return {
    categories: grouped,
    products,
    candles: candles.map((candle) => ({
      ...candle,
      quote: quoteCandle(candle, products),
    })),
    stockValue,
    lowStock,
    hasExamples: products.some((product) => product.isExample) || candles.some((candle) => candle.isExample),
  };
}

function cleanName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function createCategory(
  db: Database.Database,
  input: { name: string; kind: CategoryKind },
): { ok: true; id: number } | { ok: false; error: string } {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Ponle un nombre a la categoría." };
  if (name.length > 80) return { ok: false, error: "El nombre es demasiado largo." };
  if (input.kind !== "fijo" && input.kind !== "consumible") {
    return { ok: false, error: "Elige si la categoría es equipo o material consumible." };
  }
  try {
    const result = db
      .prepare("INSERT INTO categories (name, kind, is_example) VALUES (?, ?, 0)")
      .run(name, input.kind);
    return { ok: true, id: Number(result.lastInsertRowid) };
  } catch {
    return { ok: false, error: "Ya hay una categoría con ese nombre." };
  }
}

export function updateCategory(
  db: Database.Database,
  id: number,
  input: { name: string; kind: CategoryKind },
): { ok: true } | { ok: false; error: string } {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Ponle un nombre a la categoría." };
  if (input.kind !== "fijo" && input.kind !== "consumible") {
    return { ok: false, error: "Elige si la categoría es equipo o material consumible." };
  }
  const current = db.prepare("SELECT kind FROM categories WHERE id = ?").get(id) as
    | { kind: CategoryKind }
    | undefined;
  if (!current) return { ok: false, error: "Esa categoría ya no existe." };
  if (current.kind !== input.kind) {
    const used = db
      .prepare("SELECT COUNT(*) AS total FROM products WHERE category_id = ?")
      .get(id) as { total: number };
    if (used.total > 0) {
      return {
        ok: false,
        error: "No puedes cambiar el tipo mientras haya productos. Crea otra categoría y muévelos.",
      };
    }
  }
  try {
    db.prepare("UPDATE categories SET name = ?, kind = ? WHERE id = ?").run(name, input.kind, id);
    return { ok: true };
  } catch {
    return { ok: false, error: "Ya hay una categoría con ese nombre." };
  }
}

export function deleteCategory(
  db: Database.Database,
  id: number,
): { ok: true } | { ok: false; error: string } {
  const used = db.prepare("SELECT COUNT(*) AS total FROM products WHERE category_id = ?").get(id) as
    | { total: number }
    | undefined;
  if (!used) return { ok: false, error: "Esa categoría ya no existe." };
  if (used.total > 0) {
    return {
      ok: false,
      error: "No se puede borrar: todavía hay productos en esta categoría.",
    };
  }
  const result = db.prepare("DELETE FROM categories WHERE id = ?").run(id);
  if (result.changes !== 1) return { ok: false, error: "Esa categoría ya no existe." };
  return { ok: true };
}

function categoryKind(db: Database.Database, categoryId: number): CategoryKind | null {
  const row = db.prepare("SELECT kind FROM categories WHERE id = ?").get(categoryId) as
    | { kind: CategoryKind }
    | undefined;
  return row?.kind ?? null;
}

export function createProduct(
  db: Database.Database,
  input: {
    name: string;
    categoryId: number;
    unit: string;
    quantity: number;
    unitPrice: number;
    estimatedUses: number | null;
  },
): { ok: true; id: number } | { ok: false; error: string } {
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Ponle un nombre al producto." };
  const kind = categoryKind(db, input.categoryId);
  if (!kind) return { ok: false, error: "Elige una categoría." };
  const unit = input.unit.trim();
  if (!unit) return { ok: false, error: "Indica la unidad." };
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    return { ok: false, error: "La cantidad no puede ser negativa." };
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    return { ok: false, error: "El precio no puede ser negativo." };
  }
  let uses: number | null = null;
  if (kind === "fijo") {
    if (input.estimatedUses == null || !(input.estimatedUses > 0)) {
      return { ok: false, error: "Los usos estimados tienen que ser mayores que cero." };
    }
    uses = input.estimatedUses;
  }
  const result = db
    .prepare(
      `INSERT INTO products
        (name, category_id, unit, quantity, unit_price, estimated_uses, is_example)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
    )
    .run(name, input.categoryId, unit, roundQty(input.quantity), input.unitPrice, uses);
  return { ok: true, id: Number(result.lastInsertRowid) };
}

export function updateProduct(
  db: Database.Database,
  id: number,
  input: {
    name: string;
    categoryId: number;
    unit: string;
    quantity: number;
    unitPrice: number;
    estimatedUses: number | null;
  },
): { ok: true } | { ok: false; error: string } {
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!existing) return { ok: false, error: "Ese producto ya no existe." };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Ponle un nombre al producto." };
  const kind = categoryKind(db, input.categoryId);
  if (!kind) return { ok: false, error: "Elige una categoría." };
  const unit = input.unit.trim();
  if (!unit) return { ok: false, error: "Indica la unidad." };
  if (!Number.isFinite(input.quantity) || input.quantity < 0) {
    return { ok: false, error: "La cantidad no puede ser negativa." };
  }
  if (!Number.isFinite(input.unitPrice) || input.unitPrice < 0) {
    return { ok: false, error: "El precio no puede ser negativo." };
  }
  let uses: number | null = null;
  if (kind === "fijo") {
    if (input.estimatedUses == null || !(input.estimatedUses > 0)) {
      return { ok: false, error: "Los usos estimados tienen que ser mayores que cero." };
    }
    uses = input.estimatedUses;
  }
  db.prepare(
    `UPDATE products
     SET name = ?, category_id = ?, unit = ?, quantity = ?, unit_price = ?, estimated_uses = ?
     WHERE id = ?`,
  ).run(name, input.categoryId, unit, roundQty(input.quantity), input.unitPrice, uses, id);
  return { ok: true };
}

export function updateStockAndPrice(
  db: Database.Database,
  id: number,
  quantity: number,
  unitPrice: number,
): { ok: true } | { ok: false; error: string } {
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!existing) return { ok: false, error: "Ese producto ya no existe." };
  if (!Number.isFinite(quantity) || quantity < 0) {
    return { ok: false, error: "La cantidad no puede ser negativa." };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { ok: false, error: "El precio no puede ser negativo." };
  }
  db.prepare("UPDATE products SET quantity = ?, unit_price = ? WHERE id = ?").run(
    roundQty(quantity),
    unitPrice,
    id,
  );
  return { ok: true };
}

export function deleteProduct(
  db: Database.Database,
  id: number,
): { ok: true } | { ok: false; error: string } {
  const existing = db.prepare("SELECT id FROM products WHERE id = ?").get(id);
  if (!existing) return { ok: false, error: "Ese producto ya no existe." };
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM recipe_lines WHERE product_id = ?").run(id);
    db.prepare("DELETE FROM products WHERE id = ?").run(id);
  });
  tx();
  return { ok: true };
}

export function createCandle(
  db: Database.Database,
  name: string,
): { ok: true; id: number } | { ok: false; error: string } {
  const clean = cleanName(name);
  if (!clean) return { ok: false, error: "Ponle un nombre al tipo de vela." };
  const result = db
    .prepare(
      "INSERT INTO candle_types (name, margin_percent, margin_fixed, is_example) VALUES (?, 0, 0, 0)",
    )
    .run(clean);
  return { ok: true, id: Number(result.lastInsertRowid) };
}

export function updateCandle(
  db: Database.Database,
  id: number,
  input: { name: string; marginPercent: number; marginFixed: number },
): { ok: true } | { ok: false; error: string } {
  const existing = db.prepare("SELECT id FROM candle_types WHERE id = ?").get(id);
  if (!existing) return { ok: false, error: "Esa vela ya no existe." };
  const name = cleanName(input.name);
  if (!name) return { ok: false, error: "Ponle un nombre al tipo de vela." };
  if (!Number.isFinite(input.marginPercent) || input.marginPercent < 0) {
    return { ok: false, error: "El margen en porcentaje no puede ser negativo." };
  }
  if (!Number.isFinite(input.marginFixed) || input.marginFixed < 0) {
    return { ok: false, error: "El margen fijo no puede ser negativo." };
  }
  db.prepare(
    "UPDATE candle_types SET name = ?, margin_percent = ?, margin_fixed = ? WHERE id = ?",
  ).run(name, input.marginPercent, input.marginFixed, id);
  return { ok: true };
}

export function deleteCandle(
  db: Database.Database,
  id: number,
): { ok: true } | { ok: false; error: string } {
  const result = db.prepare("DELETE FROM candle_types WHERE id = ?").run(id);
  if (result.changes !== 1) return { ok: false, error: "Esa vela ya no existe." };
  return { ok: true };
}

export function addRecipeLine(
  db: Database.Database,
  candleId: number,
  productId: number,
  quantity: number,
): { ok: true } | { ok: false; error: string } {
  const candle = db.prepare("SELECT id FROM candle_types WHERE id = ?").get(candleId);
  if (!candle) return { ok: false, error: "Esa vela ya no existe." };
  const product = db
    .prepare(
      `SELECT c.kind
       FROM products p
       JOIN categories c ON c.id = p.category_id
       WHERE p.id = ?`,
    )
    .get(productId) as { kind: CategoryKind } | undefined;
  if (!product) return { ok: false, error: "Ese producto ya no existe." };
  const qty = product.kind === "fijo" ? 0 : quantity;
  if (product.kind === "consumible" && (!(qty > 0) || !Number.isFinite(qty))) {
    return { ok: false, error: "La cantidad por vela tiene que ser mayor que cero." };
  }
  try {
    db.prepare(
      "INSERT INTO recipe_lines (candle_type_id, product_id, quantity) VALUES (?, ?, ?)",
    ).run(candleId, productId, qty);
    return { ok: true };
  } catch {
    return { ok: false, error: "Ese producto ya está en la receta." };
  }
}

export function updateRecipeLine(
  db: Database.Database,
  lineId: number,
  quantity: number,
): { ok: true } | { ok: false; error: string } {
  const line = db
    .prepare(
      `SELECT rl.id, c.kind
       FROM recipe_lines rl
       JOIN products p ON p.id = rl.product_id
       JOIN categories c ON c.id = p.category_id
       WHERE rl.id = ?`,
    )
    .get(lineId) as { id: number; kind: CategoryKind } | undefined;
  if (!line) return { ok: false, error: "Esa línea ya no está en la receta." };
  if (line.kind === "fijo") return { ok: true };
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: false, error: "La cantidad por vela tiene que ser mayor que cero." };
  }
  db.prepare("UPDATE recipe_lines SET quantity = ? WHERE id = ?").run(quantity, lineId);
  return { ok: true };
}

export function removeRecipeLine(
  db: Database.Database,
  lineId: number,
): { ok: true } | { ok: false; error: string } {
  const result = db.prepare("DELETE FROM recipe_lines WHERE id = ?").run(lineId);
  if (result.changes !== 1) return { ok: false, error: "Esa línea ya no está en la receta." };
  return { ok: true };
}

export function registerProduction(
  db: Database.Database,
  candleId: number,
  quantity: number,
): { ok: true } | { ok: false; error: string } {
  const candle = getCandle(db, candleId);
  if (!candle) return { ok: false, error: "Esa vela ya no existe." };
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { ok: false, error: "Indica un número entero de velas." };
  }
  const products = listProducts(db);
  const preview = quoteCandle(candle, products, quantity);
  if (quantity > preview.maxCandles) {
    return {
      ok: false,
      error:
        preview.maxCandles === 0
          ? "Con el stock de ahora no puedes fabricar esta vela."
          : `Como máximo puedes fabricar ${preview.maxCandles}.`,
    };
  }

  try {
    const tx = db.transaction(() => {
      for (const line of preview.lines) {
        if (line.kind !== "consumible") continue;
        const need = line.quantityPerCandle * quantity;
        const row = db.prepare("SELECT quantity FROM products WHERE id = ?").get(line.productId) as
          | { quantity: number }
          | undefined;
        if (!row || row.quantity + 1e-9 < need) {
          throw new Error("STOCK");
        }
        db.prepare("UPDATE products SET quantity = ? WHERE id = ?").run(roundQty(row.quantity - need), line.productId);
      }
    });
    tx();
  } catch (error) {
    if (error instanceof Error && error.message === "STOCK") {
      return { ok: false, error: "El stock ha cambiado. Vuelve a revisar la cantidad." };
    }
    throw error;
  }
  return { ok: true };
}
