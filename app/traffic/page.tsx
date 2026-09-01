import { TrafficSourcePage } from "@/features/admin/components/traffic/TrafficSourcePage";

export const dynamic = "force-dynamic";

type TrafficPageProps = {
  searchParams?: Promise<{
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function Page({ searchParams }: TrafficPageProps) {
  const resolvedSearchParams = await searchParams;

  return <TrafficSourcePage filters={resolvedSearchParams} />;
}
