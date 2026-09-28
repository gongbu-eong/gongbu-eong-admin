import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { ManagementFilterBar } from "@/features/admin/components/management/ManagementFilterBar";
import { resolveManagementDate } from "@/features/admin/management-date";
import { CategoryManager } from "@/features/admin/components/management/ReferenceManagers";
import { getNextJobCategorySortOrder, listJobCategories } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function JobCategoriesPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = { ...resolveManagementDate("categories", params), keyword: params?.keyword || "", status: params?.status || "all" };
  const categories = await listJobCategories(filters);
  const nextSortOrder = await getNextJobCategorySortOrder();
  return <AdminLayout activeNav="jobs" activeSubNav="job-categories" title="직무 분류" description="공고 필터와 성향별 추천에 쓰이는 직무 기준을 관리합니다." stickyHeader headerFilters={<ManagementFilterBar screen="categories" filters={filters} />}><main className={styles.page}><section className={styles.surface}><div className={styles.surfaceHeader}><div><h2>직무 기준</h2><p>{categories.length.toLocaleString("ko-KR")}개 직무 · 사용 중인 분류는 삭제 대신 사용 안 함으로 전환해 기존 연결을 유지하세요.</p></div></div><CategoryManager categories={categories} nextSortOrder={nextSortOrder} /></section></main></AdminLayout>;
}
