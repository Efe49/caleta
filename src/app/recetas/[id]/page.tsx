import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeStudio } from "@/components/recipe-studio";
import { getDb } from "@/lib/db";
import { getCandle, listProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const candle = getCandle(getDb(), Number(id));
  return { title: candle?.name ?? "Receta" };
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId)) notFound();
  const db = getDb();
  const candle = getCandle(db, numericId);
  if (!candle) notFound();
  return <RecipeStudio key={candle.id} candle={candle} products={listProducts(db)} />;
}
