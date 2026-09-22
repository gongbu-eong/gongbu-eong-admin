import { AdminMemberDetailPage } from "@/features/admin/components/members/AdminMemberDetailPage";

export const dynamic = "force-dynamic";

type MemberDetailPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams?: Promise<{
    tab?: string;
    item?: string;
    logStartDate?: string;
    logEndDate?: string;
    logEvent?: string;
    logScreen?: string;
    logKeyword?: string;
    logIp?: string;
    logIncludeExcluded?: string;
    logPage?: string;
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
      selectedItem={resolvedSearchParams?.item}
      logStartDate={resolvedSearchParams?.logStartDate}
      logEndDate={resolvedSearchParams?.logEndDate}
      logEvent={resolvedSearchParams?.logEvent}
      logScreen={resolvedSearchParams?.logScreen}
      logKeyword={resolvedSearchParams?.logKeyword}
      logIp={resolvedSearchParams?.logIp}
      logIncludeExcluded={resolvedSearchParams?.logIncludeExcluded}
      logPage={Number(resolvedSearchParams?.logPage || 1)}
    />
  );
}
