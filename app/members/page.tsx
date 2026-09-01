import { AdminMemberListPage } from "@/features/admin/components/members/AdminMemberListPage";

export const dynamic = "force-dynamic";

type MembersPageProps = {
  searchParams?: Promise<{
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
        page: Number(resolvedSearchParams?.page || 1),
        keyword: resolvedSearchParams?.keyword || "",
        status: resolvedSearchParams?.status || "all",
        channel: resolvedSearchParams?.channel || "all",
        selectedId: resolvedSearchParams?.selectedId || "",
      }}
    />
  );
}
