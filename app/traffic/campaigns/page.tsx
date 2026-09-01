import { TrafficCampaignsPage } from "@/features/admin/components/traffic/TrafficCampaignsPage";

export const dynamic = "force-dynamic";

type TrafficCampaignsPageProps = {
  searchParams?: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function Page({ searchParams }: TrafficCampaignsPageProps) {
  const resolvedSearchParams = await searchParams;

  return <TrafficCampaignsPage filters={resolvedSearchParams} />;
}
