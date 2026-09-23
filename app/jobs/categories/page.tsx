import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { CategoryManager } from "@/features/admin/components/management/ReferenceManagers";
import { listJobCategories } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function JobCategoriesPage() {
  const categories = await listJobCategories();
  return <AdminLayout activeNav="jobs" activeSubNav="job-categories" title="직무 분류" description="공고 필터와 성향별 추천에 쓰이는 직무 기준을 관리합니다." stickyHeader><main className={styles.page}><section className={styles.surface}><div className={styles.surfaceHeader}><div><h2>직무 기준</h2><p>사용 중인 분류는 삭제 대신 사용 안 함으로 전환해 기존 연결을 유지하세요.</p></div></div><CategoryManager categories={categories} /></section></main></AdminLayout>;
}
