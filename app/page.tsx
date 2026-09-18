import { AdminDashboardPage } from "@/features/admin/components/AdminDashboardPage";

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
