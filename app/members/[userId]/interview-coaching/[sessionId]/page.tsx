import { notFound } from "next/navigation";
import { requireAdminSession } from "@/features/admin/server/auth.repository";
import { getMemberInterviewResult } from "@/features/admin/server/member-coaching-results.repository";
import { MemberCoachingResultShell } from "@/features/admin/components/members/MemberCoachingResultShell";
import { InterviewCoachingResultView } from "@/features/admin/components/members/service-results/interview-coaching/components/InterviewCoachingResultPage";
import styles from "@/features/admin/components/members/service-results/interview-coaching/components/InterviewCoachingPage.module.css";

export const dynamic = "force-dynamic";

export default async function MemberInterviewResultPage({ params }: {
  params: Promise<{ userId: string; sessionId: string }>;
}) {
  await requireAdminSession();
  const { userId, sessionId } = await params;
  const session = await getMemberInterviewResult(userId, sessionId);
  if (!session) notFound();
  return (
    <MemberCoachingResultShell userId={userId} tab="interview-coaching">
      <div className={styles.page}>
        <main className={styles.frame}>
          <h1>AI NCS 면접 코칭 결과</h1>
          {session.result ? <InterviewCoachingResultView session={session} /> : (
            <p className={styles.lead}>{session.status === "failed" ? "면접 코칭 처리에 실패하여 최종 결과가 없습니다." : "아직 최종 결과가 생성되지 않았습니다."}</p>
          )}
        </main>
      </div>
    </MemberCoachingResultShell>
  );
}
