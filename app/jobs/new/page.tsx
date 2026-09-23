import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { JobEditor } from "@/features/admin/components/management/JobEditor";
import { listInstitutions, listJobCategories } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const [institutions, categories] = await Promise.all([listInstitutions(), listJobCategories()]);
  return (
    <AdminLayout activeNav="jobs" activeSubNav="job-list" title="수동 공고 등록" description="외부 수집과 별개로 운영할 공고를 초안부터 등록합니다." stickyHeader headerActions={<Link className={styles.buttonSecondary} href="/jobs">등록 취소</Link>}>
      <main className={styles.page}>
        <section className={styles.surface}><div className={styles.notice}>처음에는 공개 설정을 끈 채 저장하는 것을 권장합니다. 필수 정보와 지원 경로를 확인한 뒤 공개해 주세요.</div></section>
        <section className={styles.surface}><JobEditor institutions={institutions} categories={categories} /></section>
      </main>
    </AdminLayout>
  );
}
