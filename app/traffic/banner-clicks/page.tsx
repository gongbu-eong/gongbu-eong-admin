import { BannerClickLogsPage } from "@/features/admin/components/traffic/BannerClickLogsPage";

export const dynamic = "force-dynamic";

type BannerClickLogsRouteProps = {
  searchParams?: Promise<{
    startDate?: string;
    endDate?: string;
    keyword?: string;
    page?: string;
  }>;
};

export default async function Page({
  searchParams,
}: BannerClickLogsRouteProps) {
  const resolvedSearchParams = await searchParams;

  return <BannerClickLogsPage filters={resolvedSearchParams} />;
}
