import { StockManager } from "@/components/stock-manager";
import { getDb } from "@/lib/db";
import { listCategories, listProducts } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Almacén",
};

export default function AlmacenPage() {
  const db = getDb();
  return <StockManager categories={listCategories(db)} products={listProducts(db)} />;
}
