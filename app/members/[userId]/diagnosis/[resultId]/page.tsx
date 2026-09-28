import { notFound } from "next/navigation";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import { getMemberDiagnosisResult } from "@/features/admin/server/member-diagnosis-results.repository";
import { MemberCoachingResultShell } from "@/features/admin/components/members/MemberCoachingResultShell";
import { DiagnosisResultDetail } from "@/features/admin/components/members/service-results/diagnosis/DiagnosisResultDetail";

export const dynamic = "force-dynamic";

export default async function MemberDiagnosisResultPage({ params }: {
  params: Promise<{ userId: string; resultId: string }>;
}) {
  await requireAdminSession();
  const { userId, resultId } = await params;
  const data = await getMemberDiagnosisResult(userId, resultId);
  if (!data) notFound();
  return (
    <MemberCoachingResultShell userId={userId} tab="diagnosis">
      <DiagnosisResultDetail {...data} />
    </MemberCoachingResultShell>
  );
}
