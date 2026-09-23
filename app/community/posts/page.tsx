import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { MetricGrid, ManagementPagination, StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { COMMUNITY_CATEGORIES, getManagedCommunityPosts, type CommunityPostFilters } from "@/features/admin/server/community-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
type Props = { searchParams?: Promise<Record<string, string | undefined>> };

export default async function CommunityPostsPage({ searchParams }: Props) {
  const params = await searchParams;
  const filters: CommunityPostFilters = { page: Number(params?.page || 1), keyword: params?.keyword || "", status: isStatus(params?.status) ? params.status : "all", category: params?.category || "", reported: params?.reported === "true" };
  const data = await getManagedCommunityPosts(filters);
  return (
    <AdminLayout activeNav="community" activeSubNav="community-posts" title="커뮤니티 관리" description="게시글 상태와 신고 현황을 한곳에서 확인합니다." stickyHeader>
      <main className={styles.page}>
        <MetricGrid metrics={data.metrics} />
        <section className={styles.surface}>
          <div className={styles.surfaceHeader}><div><h2>게시글</h2><p>총 {data.total.toLocaleString("ko-KR")}건 · 원문을 확인한 뒤 상태를 변경하세요.</p></div><Link className={styles.buttonSecondary} href="/community/reports?status=pending">처리할 신고 보기</Link></div>
          <form className={styles.toolbar} action="/community/posts">
            <label className={styles.search}><input className={styles.input} name="keyword" defaultValue={data.filters.keyword} placeholder="제목 · 본문 · 작성자 검색" /></label>
            <select className={styles.select} name="category" defaultValue={data.filters.category} aria-label="카테고리"><option value="">카테고리 전체</option>{COMMUNITY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>
            <select className={styles.select} name="status" defaultValue={data.filters.status} aria-label="게시 상태"><option value="all">상태 전체</option><option value="active">공개</option><option value="deleted">숨김</option></select>
            <label className={styles.checkbox}><input type="checkbox" name="reported" value="true" defaultChecked={data.filters.reported} />신고 있는 글</label>
            <button className={styles.button} type="submit">조회</button>
          </form>
          {data.posts.length ? <div className={styles.tableWrap}><table className={styles.table}>
            <colgroup><col style={{ width: "34%" }} /><col style={{ width: "12%" }} /><col style={{ width: "13%" }} /><col style={{ width: "9%" }} /><col style={{ width: "9%" }} /><col style={{ width: "10%" }} /><col style={{ width: "13%" }} /></colgroup>
            <thead><tr><th>게시글</th><th>카테고리</th><th>작성자</th><th>상태</th><th>신고</th><th>반응</th><th>작성일</th></tr></thead>
            <tbody>{data.posts.map((post) => <tr key={post.id}>
              <td><span className={styles.primaryCell}><Link href={`/community/posts/${post.id}`}>{post.title}</Link><small>{post.contentPreview || "본문 없음"}</small></span></td>
              <td data-label="카테고리"><StatusBadge tone="blue">{post.category}</StatusBadge></td>
              <td data-label="작성자"><span>{post.authorName}<small className={styles.cellSubtext}>{post.authorEmail || "-"}</small></span></td>
              <td data-label="상태"><StatusBadge tone={post.status === "active" ? "success" : "danger"}>{post.status === "active" ? "공개" : "숨김"}</StatusBadge></td>
              <td data-label="신고">{post.pendingReportCount ? <StatusBadge tone="danger">미처리 {post.pendingReportCount}</StatusBadge> : <span className={styles.numberCell}>{post.reportCount || "-"}</span>}</td>
              <td data-label="반응"><span className={styles.numberCell}>추천 {post.recommendCount}<small className={styles.cellSubtext}>댓글 {post.commentCount} · 조회 {post.viewCount}</small></span></td>
              <td data-label="작성일"><span>{formatAdminDate(post.createdAt)}<small className={styles.cellSubtext}><Link href={`/community/posts/${post.id}`}>상세 관리 ›</Link></small></span></td>
            </tr>)}</tbody>
          </table></div> : <div className={styles.empty}><strong>조건에 맞는 게시글이 없습니다.</strong>검색어 또는 필터를 바꿔 보세요.</div>}
          <ManagementPagination page={data.page} totalPages={data.totalPages} createHref={(page) => createHref({ ...data.filters, page })} />
        </section>
      </main>
    </AdminLayout>
  );
}
function createHref(values: Record<string, string | number | boolean>) { const query = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== "" && value !== "all" && value !== false) query.set(key, String(value)); }); return `/community/posts?${query.toString()}`; }
function isStatus(value?: string): value is "all" | "active" | "deleted" { return ["all", "active", "deleted"].includes(value || ""); }
