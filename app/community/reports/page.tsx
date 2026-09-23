import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { ReportProcessor } from "@/features/admin/components/management/MutationControls";
import { ManagementPagination, StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { getManagedReports } from "@/features/admin/server/community-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function CommunityReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = { page: Number(params?.page || 1), status: params?.status || "pending", targetType: params?.targetType || "all" };
  const data = await getManagedReports(filters);
  return (
    <AdminLayout activeNav="community" activeSubNav="community-reports" title="신고 처리" description="신고 당시 내용과 현재 원문을 비교하고 실제 콘텐츠 조치를 함께 저장합니다." stickyHeader>
      <main className={styles.page}><section className={styles.surface}>
        <div className={styles.surfaceHeader}><div><h2>신고 대기열</h2><p>총 {data.total.toLocaleString("ko-KR")}건 · 오래 접수된 신고부터 표시합니다.</p></div></div>
        <form className={styles.toolbar} action="/community/reports"><select className={styles.select} name="status" defaultValue={filters.status}><option value="all">상태 전체</option><option value="pending">처리 대기</option><option value="reviewing">검토 중</option><option value="resolved">처리 완료</option><option value="rejected">위반 없음</option></select><select className={styles.select} name="targetType" defaultValue={filters.targetType}><option value="all">대상 전체</option><option value="post">게시글</option><option value="comment">댓글</option></select><button className={styles.button} type="submit">조회</button></form>
        <div className={styles.notice} style={{ marginTop: 16 }}>처리 완료만 선택해도 원문은 자동으로 숨겨지지 않습니다. 실제 제재가 필요하면 콘텐츠 조치에서 대상 숨김을 함께 선택하세요.</div>
        {data.items.length ? <div style={{ marginTop: 20 }}>{data.items.map((report) => <article className={styles.reportCard} key={report.id}>
          <div><p className={styles.reportLabel}>신고 정보</p><p className={styles.reportValue}><StatusBadge tone={report.status === "pending" ? "danger" : report.status === "reviewing" ? "warning" : "muted"}>{statusLabel(report.status)}</StatusBadge></p><p className={styles.reportValue} style={{ marginTop: 10 }}>{report.reason}</p><div className={styles.inlineMeta}><span>신고자 {report.reporterName}</span><span>{formatAdminDate(report.createdAt, true)}</span></div></div>
          <div><p className={styles.reportLabel}>{report.targetType === "post" ? "신고 게시글" : "신고 댓글"}</p><p className={styles.reportValue}><Link href={report.targetType === "post" ? `/community/posts/${report.targetId}` : `/community/comments?keyword=${encodeURIComponent(report.targetContent.slice(0, 40))}`}><strong>{report.targetTitle}</strong></Link></p><p className={styles.reportValue} style={{ marginTop: 8 }}>{report.targetContent.slice(0, 240) || "현재 원문을 찾을 수 없습니다."}</p><div className={styles.inlineMeta}><StatusBadge tone={report.targetStatus === "active" ? "success" : "danger"}>{report.targetStatus === "active" ? "현재 공개" : report.targetStatus === "deleted" ? "현재 숨김" : "대상 없음"}</StatusBadge>{report.reviewNote ? <span>이전 메모: {report.reviewNote}</span> : null}</div></div>
          <ReportProcessor reportId={report.id} currentStatus={report.status} targetStatus={report.targetStatus} />
        </article>)}</div> : <div className={styles.empty}><strong>해당 상태의 신고가 없습니다.</strong>다른 상태를 선택해 확인할 수 있습니다.</div>}
        <ManagementPagination page={data.page} totalPages={data.totalPages} createHref={(page) => `/community/reports?status=${filters.status}&targetType=${filters.targetType}&page=${page}`} />
      </section></main>
    </AdminLayout>
  );
}
function statusLabel(status: string) { return ({ pending: "처리 대기", reviewing: "검토 중", resolved: "처리 완료", rejected: "위반 없음" } as Record<string, string>)[status] || status; }
