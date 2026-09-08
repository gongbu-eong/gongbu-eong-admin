import { TrafficLogsPage } from "@/features/admin/components/traffic/TrafficLogsPage";

export const dynamic = "force-dynamic";

type TrafficLogsRouteProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    channel?: string;
    keyword?: string;
    page?: string;
    from?: string;
  }>;
};

export default async function Page({ searchParams }: TrafficLogsRouteProps) {
  const resolvedSearchParams = await searchParams;

  return <TrafficLogsPage filters={resolvedSearchParams} />;
}
