"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import {
  addRecipeLine,
  createCandle,
  createCategory,
  createProduct,
  deleteCandle,
  deleteCategory,
  deleteProduct,
  registerProduction,
  removeRecipeLine,
  updateCandle,
  updateCategory,
  updateProduct,
  updateRecipeLine,
  updateStockAndPrice,
} from "@/lib/queries";
import type { ActionResult, CategoryKind } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

export async function createCategoryAction(input: {
  name: string;
  kind: CategoryKind;
}): Promise<ActionResult> {
  const result = createCategory(getDb(), input);
  if (result.ok) refresh();
  return result;
}

export async function updateCategoryAction(
  id: number,
  input: { name: string; kind: CategoryKind },
): Promise<ActionResult> {
  const result = updateCategory(getDb(), id, input);
  if (result.ok) refresh();
  return result;
}

export async function deleteCategoryAction(id: number): Promise<ActionResult> {
  const result = deleteCategory(getDb(), id);
  if (result.ok) refresh();
  return result;
}

export async function createProductAction(input: {
  name: string;
  categoryId: number;
  unit: string;
  quantity: number;
  unitPrice: number;
  estimatedUses: number | null;
}): Promise<ActionResult> {
  const result = createProduct(getDb(), input);
  if (result.ok) refresh();
  return result;
}

export async function updateProductAction(
  id: number,
  input: {
    name: string;
    categoryId: number;
    unit: string;
    quantity: number;
    unitPrice: number;
    estimatedUses: number | null;
  },
): Promise<ActionResult> {
  const result = updateProduct(getDb(), id, input);
  if (result.ok) refresh();
  return result;
}

export async function updateStockAndPriceAction(
  id: number,
  quantity: number,
  unitPrice: number,
): Promise<ActionResult> {
  const result = updateStockAndPrice(getDb(), id, quantity, unitPrice);
  if (result.ok) refresh();
  return result;
}

export async function deleteProductAction(id: number): Promise<ActionResult> {
  const result = deleteProduct(getDb(), id);
  if (result.ok) refresh();
  return result;
}

export async function createCandleAction(name: string): Promise<ActionResult> {
  const result = createCandle(getDb(), name);
  if (result.ok) refresh();
  return result;
}

export async function updateCandleAction(
  id: number,
  input: { name: string; marginPercent: number; marginFixed: number },
): Promise<ActionResult> {
  const result = updateCandle(getDb(), id, input);
  if (result.ok) refresh();
  return result;
}

export async function deleteCandleAction(id: number): Promise<ActionResult> {
  const result = deleteCandle(getDb(), id);
  if (result.ok) refresh();
  return result;
}

export async function addRecipeLineAction(
  candleId: number,
  productId: number,
  quantity: number,
): Promise<ActionResult> {
  const result = addRecipeLine(getDb(), candleId, productId, quantity);
  if (result.ok) refresh();
  return result;
}

export async function updateRecipeLineAction(
  lineId: number,
  quantity: number,
): Promise<ActionResult> {
  const result = updateRecipeLine(getDb(), lineId, quantity);
  if (result.ok) refresh();
  return result;
}

export async function removeRecipeLineAction(lineId: number): Promise<ActionResult> {
  const result = removeRecipeLine(getDb(), lineId);
  if (result.ok) refresh();
  return result;
}

export async function registerProductionAction(
  candleId: number,
  quantity: number,
): Promise<ActionResult> {
  const result = registerProduction(getDb(), candleId, quantity);
  if (result.ok) refresh();
  return result;
}
