import { AdminMemberListPage } from "@/features/admin/components/members/AdminMemberListPage";
import type { ManagementDateInput } from "@/features/admin/management-date";

export const dynamic = "force-dynamic";

type MembersPageProps = {
  searchParams?: Promise<ManagementDateInput & {
    page?: string;
    keyword?: string;
    status?: string;
    channel?: string;
    selectedId?: string;
  }>;
};

export default async function MembersPage({ searchParams }: MembersPageProps) {
  const resolvedSearchParams = await searchParams;

  return (
    <AdminMemberListPage
      filters={{
        period: resolvedSearchParams?.period,
        dateField: resolvedSearchParams?.dateField,
        startDate: resolvedSearchParams?.startDate,
        endDate: resolvedSearchParams?.endDate,
        page: Number(resolvedSearchParams?.page || 1),
        keyword: resolvedSearchParams?.keyword || "",
        status: resolvedSearchParams?.status || "all",
        channel: resolvedSearchParams?.channel || "all",
        selectedId: resolvedSearchParams?.selectedId || "",
      }}
    />
  );
}
