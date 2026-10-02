import { AdminDashboardPage } from "@/features/admin/components/AdminDashboardPage";
import { trafficChannelOptions } from "@/features/admin/traffic-channel";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{
    channel?: string;
    product?: string;
    period?: string;
    startDate?: string;
    endDate?: string;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;

  if (params?.channel && !trafficChannelOptions.some(([key]) => key === params.channel)) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key !== "channel" && typeof value === "string") query.set(key, value);
    }
    redirect(query.size ? `/?${query.toString()}` : "/");
  }

  return (
    <AdminDashboardPage
      selectedChannel={params?.channel}
      selectedProduct={params?.product}
      period={params?.period}
      startDate={params?.startDate}
      endDate={params?.endDate}
    />
  );
}
