import { notFound } from "next/navigation";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import { getMemberResumeResult } from "@/features/admin/server/member-coaching-results.repository";
import { MemberCoachingResultShell } from "@/features/admin/components/members/MemberCoachingResultShell";
import { CoachingResultView } from "@/features/admin/components/members/service-results/coaching/components/CoachingResultView";

export const dynamic = "force-dynamic";

export default async function MemberResumeResultPage({ params }: {
  params: Promise<{ userId: string; resultId: string }>;
}) {
  await requireAdminSession();
  const { userId, resultId } = await params;
  const item = await getMemberResumeResult(userId, resultId);
  if (!item) notFound();
  return (
    <MemberCoachingResultShell userId={userId} tab="resume-coaching">
      <CoachingResultView item={item} />
    </MemberCoachingResultShell>
  );
}
