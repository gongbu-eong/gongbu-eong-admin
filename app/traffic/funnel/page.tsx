import { FunnelLogsPage } from "@/features/admin/components/traffic/FunnelLogsPage";
import { FunnelLogQuery } from "@/features/admin/data/traffic";

type FunnelLogsRouteProps = {
  searchParams?: Promise<FunnelLogQuery>;
};

export default async function Page({ searchParams }: FunnelLogsRouteProps) {
  const resolvedSearchParams = await searchParams;

  return <FunnelLogsPage filters={resolvedSearchParams} />;
}
