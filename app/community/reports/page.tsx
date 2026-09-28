import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { ReportsQueue } from "@/features/admin/components/management/ReportsQueue";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import { getManagedReports } from "@/features/admin/server/community-management.repository";

export const dynamic = "force-dynamic";
export default async function CommunityReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  await requireAdminSession();
  const params = await searchParams;
  const filters = {
    page: Number(params?.page || 1), status: params?.status || "open", targetType: params?.targetType || "all",
    keyword: (params?.keyword || "").trim().slice(0, 100), searchBy: params?.searchBy || "all", reason: params?.reason || "",
    targetId: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(params?.targetId || "") ? params!.targetId : undefined,
  };
  const data = await getManagedReports(filters);
  return (
    <AdminLayout activeNav="community" activeSubNav="community-reports" title="신고 처리" description="접수 · 검토 · 처리 이력" stickyHeader>
      <ReportsQueue data={data} filters={filters} />
    </AdminLayout>
  );
}
