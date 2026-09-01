import { AdminMemberDetailPage } from "@/features/admin/components/members/AdminMemberDetailPage";

export const dynamic = "force-dynamic";

type MemberDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
  }>;
};

export default async function MemberDetailPage({
  params,
  searchParams,
}: MemberDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <AdminMemberDetailPage
      userId={resolvedParams.userId}
      activeTab={resolvedSearchParams?.tab}
    />
  );
}
