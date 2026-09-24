import { RecipeIndex } from "@/components/recipe-index";
import { getDb } from "@/lib/db";
import { listCandles, listProducts, quoteCandle } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Recetas",
};

export default function RecetasPage() {
  const db = getDb();
  const products = listProducts(db);
  const candles = listCandles(db).map((candle) => ({
    ...candle,
    quote: quoteCandle(candle, products),
  }));
  return <RecipeIndex candles={candles} />;
}
