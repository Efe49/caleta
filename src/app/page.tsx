import { DashboardView } from "@/components/dashboard-view";
import { getDb } from "@/lib/db";
import { getDashboard } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const data = getDashboard(getDb());
  return <DashboardView data={data} />;
}
