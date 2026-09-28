import Link from "next/link";
import { ReportProcessor } from "./MutationControls";
import { ManagementPagination, StatusBadge, formatAdminDate } from "./ManagementCommon";
import type { getManagedReports } from "@/features/admin/server/community-management.repository";
import { REPORT_DECISIONS, REPORT_STATUSES } from "@/features/admin/community-reports";
import type { ManagementDateInput } from "@/features/admin/management-date";
import { publicSiteHref } from "@/features/admin/public-site";
import styles from "./Management.module.css";
import reportStyles from "./Reports.module.css";

export function ReportsQueue({ data, filters }: {
  data: Awaited<ReturnType<typeof getManagedReports>>;
  filters: ManagementDateInput & { status: string; targetType: string; keyword: string; searchBy: string; reason: string; targetId?: string };
}) {
  const pageHref = (page: number) => {
    const query = new URLSearchParams({ status: filters.status, targetType: filters.targetType, keyword: filters.keyword,
      searchBy: filters.searchBy, reason: filters.reason, page: String(page) });
    if (filters.targetId) query.set("targetId", filters.targetId);
    for (const key of ["period", "dateField", "startDate", "endDate"] as const) {
      if (filters[key]) query.set(key, filters[key]);
    }
    return `/community/reports?${query}`;
  };
  return (
    <main className={`${styles.page} ${reportStyles.page}`}>
      <section className={reportStyles.queue}>
        <div className={styles.surfaceHeader}><h2>신고 대기열 <span className={reportStyles.total}>{data.total.toLocaleString("ko-KR")}건</span></h2></div>
        {filters.targetId ? <p className={reportStyles.scope}>동일 대상에 접수된 신고</p> : null}
        <div className={reportStyles.columnHeader} aria-hidden="true"><span>신고 대상</span><span>신고 사유</span><span>대상 작성자</span><span>신고자·접수일</span><span>처리 상태</span></div>
        {data.items.map((report) => {
          const targetLabel = report.targetType === "post" ? "게시글" : report.isReply ? "답글" : "댓글";
          const snapshot = report.snapshot;
          const snapshotContent = typeof snapshot?.content === "string" ? snapshot.content : "신고 당시 원문이 저장되어 있지 않습니다.";
          const snapshotTitle = typeof snapshot?.title === "string" ? snapshot.title : typeof snapshot?.post_title === "string" ? snapshot.post_title : "";
          const targetState = report.targetStatus === "active" ? "공개" : report.targetStatus === "deleted" ? "숨김·삭제" : "대상 없음";
          const postHref = report.postId ? `/community/posts/${report.postId}${report.targetType === "comment" ? `#comment-${report.targetId}` : ""}` : null;
          return (
            <details key={`${report.id}-${report.updatedAt}`} className={reportStyles.report}>
              <summary className={reportStyles.summary}>
                <div className={reportStyles.subject}><span className={reportStyles.meta}>{targetLabel} · 동일 대상 신고 {report.relatedCount}건</span><strong>{report.targetTitle}</strong><p>{report.targetContent || snapshotContent}</p></div>
                <div><span className={reportStyles.mobileLabel}>신고 사유</span><strong>{report.reason}</strong>{report.reasonDetail ? <p>{report.reasonDetail}</p> : null}</div>
                <div><span className={reportStyles.mobileLabel}>대상 작성자</span><strong>{report.authorName}</strong><p>{report.authorEmail}</p></div>
                <div><span className={reportStyles.mobileLabel}>신고자</span><strong>{report.reporterName}</strong><p>{formatAdminDate(report.createdAt, true)}</p></div>
                <div className={reportStyles.status}><StatusBadge tone={report.status === "pending" ? "danger" : report.status === "reviewing" ? "warning" : "muted"}>{REPORT_STATUSES[report.status] || report.status}</StatusBadge><span className={reportStyles.meta}>상세·처리</span></div>
              </summary>
              <div className={reportStyles.detail}>
                <div className={reportStyles.context}>
                  <div className={reportStyles.people}>
                    <div><span>대상 작성자</span>{report.authorId ? <Link href={`/members?selectedId=${report.authorId}`}>{report.authorName}</Link> : <strong>{report.authorName}</strong>}<small>{report.authorEmail}</small></div>
                    <div><span>신고자</span><Link href={`/members?selectedId=${report.reporterId}`}>{report.reporterName}</Link><small>{report.reporterEmail}</small></div>
                  </div>
                  <section className={reportStyles.reason}><h3>신고 사유</h3><strong>{report.reason}</strong>{report.reasonDetail ? <p>{report.reasonDetail}</p> : null}</section>
                  <div className={reportStyles.comparison}>
                    <section><h3>신고 당시 원문</h3>{snapshotTitle ? <strong>{snapshotTitle}</strong> : null}<p>{snapshotContent}</p></section>
                    <section><h3>현재 원문 <StatusBadge tone={report.targetStatus === "active" ? "success" : "muted"}>{targetState}</StatusBadge></h3><strong>{report.targetTitle}</strong><p>{report.targetContent || "현재 원문이 없습니다."}</p>{report.parentStatus && report.parentStatus !== "active" ? <p className={reportStyles.warning}>원 게시글이 숨김·삭제 상태입니다.</p> : null}</section>
                  </div>
                  <div className={reportStyles.links}>
                    {postHref ? <Link className={styles.buttonSecondary} href={postHref}>원문 관리</Link> : null}
                    {report.postId ? <a className={styles.buttonSecondary} href={publicSiteHref(`/community/${report.postId}${report.targetType === "comment" ? `#comment-${report.targetId}` : ""}`)} target="_blank" rel="noreferrer">사이트에서 보기</a> : null}
                    <Link className={styles.buttonSecondary} href={`/community/reports?status=all&targetType=${report.targetType}&targetId=${report.targetId}`}>동일 대상 신고 {report.relatedCount}건</Link>
                  </div>
                  <section className={reportStyles.history}><h3>처리 이력</h3>
                    {report.history.length ? <ol>{report.history.map((entry, index) => <li key={`${entry.at}-${index}`}><div><strong>{REPORT_DECISIONS[entry.decision]?.label || entry.decision}</strong><span>{entry.adminName} · {formatAdminDate(entry.at, true)}</span></div><p>{entry.note || "처리 메모 없음"}</p>{entry.previousReviewNote || entry.previousReviewedAt ? <p>이전 처리 기록 ({formatAdminDate(entry.previousReviewedAt || null, true)}): {entry.previousReviewNote || "메모 없음"}</p> : null}</li>)}</ol>
                      : <p>{report.reviewNote ? `기존 처리 메모: ${report.reviewNote}` : "아직 처리 이력이 없습니다."}</p>}
                  </section>
                </div>
                <aside className={reportStyles.processor}><h3>신고 처리</h3><ReportProcessor key={`${report.updatedAt}-${report.targetStatus}`} reportId={report.id} currentStatus={report.status} targetStatus={report.targetStatus} updatedAt={report.updatedAt} /></aside>
              </div>
            </details>
          );
        })}
        {!data.items.length ? <div className={styles.empty}><strong>검색 조건에 맞는 신고가 없습니다.</strong></div> : null}
        <ManagementPagination page={data.page} totalPages={data.totalPages} createHref={pageHref} />
      </section>
    </main>
  );
}
