import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { JobEditor } from "@/features/admin/components/management/JobEditor";
import { StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { getManagedJob, listInstitutions, listJobCategories } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const [job, institutions, categories] = await Promise.all([getManagedJob(jobId), listInstitutions(), listJobCategories()]);
  if (!job) notFound();
  return (
    <AdminLayout activeNav="jobs" activeSubNav="job-list" title="공고 상세 관리" description="원본 출처에 맞는 범위에서 공고 정보와 노출 상태를 관리합니다." stickyHeader headerActions={<Link className={styles.buttonSecondary} href="/jobs">목록으로</Link>}>
      <main className={styles.page}>
        <section className={styles.surface}>
          <div className={styles.detailHeader}>
            <div><StatusBadge tone={job.source === "manual" ? "blue" : "default"}>{job.source === "manual" ? "수동 공고" : "ALIO 수집"}</StatusBadge><h2>{job.title}</h2><div className={styles.inlineMeta}><span>{job.institutionName}</span><span>최근 수정 {formatAdminDate(job.updatedAt, true)}</span><StatusBadge tone={job.isActive ? "success" : "danger"}>{job.isActive ? "공개" : "비공개"}</StatusBadge></div></div>
            <div className={styles.detailStats}><span>조회<strong>{job.viewCount.toLocaleString("ko-KR")}</strong></span><span>찜<strong>{job.bookmarkCount.toLocaleString("ko-KR")}</strong></span></div>
          </div>
          <nav className={styles.tabList} aria-label="상세 항목"><a href="#basic">기본 정보</a><a href="#schedule">일정·지원</a>{job.source === "manual" ? <a href="#content">상세 내용</a> : null}<a href="#exposure">노출·분류</a></nav>
        </section>
        <section className={styles.surface}><JobEditor job={job} institutions={institutions} categories={categories} /></section>
      </main>
    </AdminLayout>
  );
}
