import { AdminMemberDetailPage } from "@/features/admin/components/members/AdminMemberDetailPage";
import { redirect } from "next/navigation";
import { requireAdminSession } from "@/features/admin/server/auth.repository";

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
    logChannel?: string;
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

  if (resolvedSearchParams?.item && ["diagnosis", "resume-coaching", "interview-coaching"].includes(resolvedSearchParams.tab || "")) {
    await requireAdminSession();
    redirect(`/members/${encodeURIComponent(resolvedParams.userId)}/${resolvedSearchParams.tab}/${encodeURIComponent(resolvedSearchParams.item)}`);
  }

  return (
    <AdminMemberDetailPage
      userId={resolvedParams.userId}
      activeTab={resolvedSearchParams?.tab}
      logStartDate={resolvedSearchParams?.logStartDate}
      logEndDate={resolvedSearchParams?.logEndDate}
      logEvent={resolvedSearchParams?.logEvent}
      logScreen={resolvedSearchParams?.logScreen}
      logChannel={resolvedSearchParams?.logChannel}
      logKeyword={resolvedSearchParams?.logKeyword}
      logIp={resolvedSearchParams?.logIp}
      logIncludeExcluded={resolvedSearchParams?.logIncludeExcluded}
      logPage={Number(resolvedSearchParams?.logPage || 1)}
    />
  );
}
