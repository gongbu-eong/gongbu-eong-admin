import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { MetricGrid, ManagementPagination, StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { getManagedJobs, type JobManagementFilters } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | undefined>> };

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: JobManagementFilters = {
    page: Number(params?.page || 1),
    keyword: params?.keyword || "",
    source: isSource(params?.source) ? params.source : "all",
    status: isStatus(params?.status) ? params.status : "all",
  };
  const data = await getManagedJobs(filters);
  const hrefForPage = (page: number) => createHref({ ...data.filters, page });
  return (
    <AdminLayout
      activeNav="jobs"
      activeSubNav="job-list"
      title="공고 관리"
      description="공고의 공개 상태와 지원 정보를 확인하고 수동 공고를 관리합니다."
      stickyHeader
      headerActions={<Link className={styles.button} href="/jobs/new">수동 공고 등록</Link>}
    >
      <main className={styles.page}>
        <MetricGrid metrics={data.metrics} />
        <section className={styles.surface}>
          <div className={styles.surfaceHeader}>
            <div><h2>공고 목록</h2><p>총 {data.total.toLocaleString("ko-KR")}건 · 제목이나 기관명을 누르면 상세 관리로 이동합니다.</p></div>
          </div>
          <form className={styles.toolbar} action="/jobs">
            <label className={styles.search}><input className={styles.input} name="keyword" defaultValue={data.filters.keyword} placeholder="공고명 · 기관 · NCS 검색" /></label>
            <select className={styles.select} name="source" defaultValue={data.filters.source} aria-label="공고 출처">
              <option value="all">출처 전체</option><option value="alio">알리오 수집</option><option value="manual">수동 등록</option>
            </select>
            <select className={styles.select} name="status" defaultValue={data.filters.status} aria-label="공고 상태">
              <option value="all">상태 전체</option><option value="open">접수 중</option><option value="closing">3일 내 마감</option><option value="closed">마감</option><option value="hidden">비공개</option>
            </select>
            <button className={styles.button} type="submit">조회</button>
          </form>
          {data.jobs.length ? (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <colgroup><col style={{ width: "31%" }} /><col style={{ width: "10%" }} /><col style={{ width: "14%" }} /><col style={{ width: "10%" }} /><col style={{ width: "8%" }} /><col style={{ width: "8%" }} /><col style={{ width: "11%" }} /><col style={{ width: "8%" }} /></colgroup>
                <thead><tr><th>공고·기관</th><th>출처</th><th>접수 기간</th><th>모집 상태</th><th>공개</th><th>홈 노출</th><th>반응</th><th>관리</th></tr></thead>
                <tbody>
                  {data.jobs.map((job) => (
                    <tr key={job.id}>
                      <td><span className={styles.primaryCell}><Link href={`/jobs/${job.id}`}>{job.title}</Link><small>{job.institutionName} · {job.region} · {job.employmentType}</small></span></td>
                      <td data-label="출처"><StatusBadge tone={job.source === "manual" ? "blue" : "default"}>{job.source === "manual" ? "수동" : "ALIO"}</StatusBadge></td>
                      <td data-label="접수 기간"><span>{formatAdminDate(job.applicationStartAt)}<small className={styles.cellSubtext}>~ {formatAdminDate(job.applicationEndAt)}</small></span></td>
                      <td data-label="모집 상태"><StatusBadge tone={job.recruitmentStatus === "접수 중" ? "success" : job.recruitmentStatus === "마감" ? "muted" : "warning"}>{job.recruitmentStatus}</StatusBadge></td>
                      <td data-label="공개"><StatusBadge tone={job.isActive ? "success" : "danger"}>{job.isActive ? "공개" : "비공개"}</StatusBadge></td>
                      <td data-label="홈 노출">{job.isFeatured ? <StatusBadge tone="blue">우선</StatusBadge> : "-"}</td>
                      <td data-label="반응"><span className={styles.numberCell}>조회 {job.viewCount.toLocaleString("ko-KR")}<small className={styles.cellSubtext}>찜 {job.bookmarkCount.toLocaleString("ko-KR")}</small></span></td>
                      <td data-label="관리"><span className={styles.rowActions}><Link className={styles.buttonSecondary} href={`/jobs/${job.id}`}>상세</Link></span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div className={styles.empty}><strong>조건에 맞는 공고가 없습니다.</strong>검색어 또는 필터를 바꿔 보세요.</div>}
          <ManagementPagination page={data.page} totalPages={data.totalPages} createHref={hrefForPage} />
        </section>
      </main>
    </AdminLayout>
  );
}

function createHref(values: Record<string, string | number | boolean>) {
  const query = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => { if (value !== "" && value !== "all" && value !== false) query.set(key, String(value)); });
  return `/jobs?${query.toString()}`;
}
function isSource(value?: string): value is "all" | "alio" | "manual" { return ["all", "alio", "manual"].includes(value || ""); }
function isStatus(value?: string): value is "all" | "open" | "closing" | "closed" | "hidden" { return ["all", "open", "closing", "closed", "hidden"].includes(value || ""); }
