import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { ManagementFilterBar } from "@/features/admin/components/management/ManagementFilterBar";
import { resolveManagementDate } from "@/features/admin/management-date";
import { InstitutionManager } from "@/features/admin/components/management/ReferenceManagers";
import { listInstitutions } from "@/features/admin/server/jobs-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function InstitutionsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = { ...resolveManagementDate("institutions", params), keyword: params?.keyword || "" };
  const institutions = await listInstitutions(filters);
  return <AdminLayout activeNav="jobs" activeSubNav="job-institutions" title="기관 관리" description="공고에 연결되는 기관 정보와 홈페이지를 관리합니다." stickyHeader headerFilters={<ManagementFilterBar screen="institutions" filters={filters} />}><main className={styles.page}><section className={styles.surface}><div className={styles.surfaceHeader}><div><h2>기관 목록</h2><p>{institutions.length.toLocaleString("ko-KR")}개 기관 · 연결 공고가 있는 기관은 삭제할 수 없습니다.</p></div></div><InstitutionManager institutions={institutions} /></section></main></AdminLayout>;
}
