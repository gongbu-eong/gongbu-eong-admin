import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { listJobSyncRuns } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function JobSyncPage() {
  const runs = await listJobSyncRuns();
  return (
    <AdminLayout activeNav="jobs" activeSubNav="job-sync" title="공고 수집 이력" description="알리오 공고 수집 결과와 오류를 확인합니다." stickyHeader>
      <main className={styles.page}><section className={styles.surface}>
        <div className={styles.surfaceHeader}><div><h2>최근 실행</h2><p>최근 100회 · 수집 이력은 운영 기록이므로 이 화면에서 수정하거나 삭제하지 않습니다.</p></div></div>
        <div className={`${styles.notice} ${styles.noticeWarning}`}>실행 중 상태가 오래 유지되면 마지막 heartbeat와 크론 로그를 함께 확인하세요. 이 화면의 상태만 보고 작업을 재실행하지 않습니다.</div>
        {runs.length ? <div className={styles.tableWrap}><table className={styles.table}>
          <thead><tr><th>시작 시각</th><th>결과</th><th>수집</th><th>추가</th><th>수정</th><th>비활성</th><th>소요 시간</th><th>오류</th></tr></thead>
          <tbody>{runs.map((run) => <tr key={run.id}>
            <td><span className={styles.primaryCell}><strong>{formatAdminDate(run.startedAt, true)}</strong><small>{run.source.toUpperCase()}</small></span></td>
            <td data-label="결과"><StatusBadge tone={run.status === "succeeded" ? "success" : run.status === "failed" ? "danger" : run.status === "running" ? "warning" : "muted"}>{statusLabel(run.status)}</StatusBadge></td>
            <td data-label="수집" className={styles.numberCell}>{run.fetchedCount.toLocaleString("ko-KR")}</td><td data-label="추가" className={styles.numberCell}>{run.insertedCount.toLocaleString("ko-KR")}</td><td data-label="수정" className={styles.numberCell}>{run.updatedCount.toLocaleString("ko-KR")}</td><td data-label="비활성" className={styles.numberCell}>{run.deactivatedCount.toLocaleString("ko-KR")}</td>
            <td data-label="소요 시간">{duration(run.startedAt, run.completedAt)}</td><td data-label="오류"><span className={styles.cellSubtext}>{run.errorMessage || "-"}</span></td>
          </tr>)}</tbody>
        </table></div> : <div className={styles.empty}><strong>수집 이력이 없습니다.</strong>크론 실행 후 결과가 표시됩니다.</div>}
      </section></main>
    </AdminLayout>
  );
}
function statusLabel(status: string) { return ({ succeeded: "성공", failed: "실패", running: "실행 중", skipped: "건너뜀" } as Record<string, string>)[status] || status; }
function duration(start: string, end: string | null) { if (!end) return "-"; const seconds = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000)); return seconds < 60 ? `${seconds}초` : `${Math.floor(seconds / 60)}분 ${seconds % 60}초`; }
