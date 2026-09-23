import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { ModerationButton } from "@/features/admin/components/management/MutationControls";
import { ManagementPagination, StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { getManagedComments } from "@/features/admin/server/community-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function CommunityCommentsPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const filters = { page: Number(params?.page || 1), keyword: params?.keyword || "", status: params?.status || "all" };
  const data = await getManagedComments(filters);
  return (
    <AdminLayout activeNav="community" activeSubNav="community-comments" title="댓글·답글 관리" description="원글 맥락과 반응을 확인하고 댓글 공개 상태를 관리합니다." stickyHeader>
      <main className={styles.page}><section className={styles.surface}>
        <div className={styles.surfaceHeader}><div><h2>댓글·답글</h2><p>총 {data.total.toLocaleString("ko-KR")}건 · 신고가 있는 댓글을 먼저 표시합니다.</p></div></div>
        <form className={styles.toolbar} action="/community/comments"><label className={styles.search}><input className={styles.input} name="keyword" defaultValue={filters.keyword} placeholder="댓글 내용 · 원글 제목 검색" /></label><select className={styles.select} name="status" defaultValue={filters.status}><option value="all">상태 전체</option><option value="active">공개</option><option value="deleted">숨김</option></select><button className={styles.button} type="submit">조회</button></form>
        {data.items.length ? <div className={styles.tableWrap}><table className={styles.table}><colgroup><col style={{ width: "35%" }} /><col style={{ width: "24%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} /><col style={{ width: "10%" }} /><col style={{ width: "9%" }} /></colgroup><thead><tr><th>댓글</th><th>원글</th><th>작성자</th><th>상태·신고</th><th>반응</th><th>관리</th></tr></thead><tbody>{data.items.map((comment) => <tr key={comment.id}>
          <td><span className={styles.primaryCell}><strong>{comment.content}</strong><small>{comment.parentCommentId ? "답글" : "댓글"} · {formatAdminDate(comment.createdAt, true)}</small></span></td>
          <td data-label="원글"><span className={styles.primaryCell}><Link href={`/community/posts/${comment.postId}`}>{comment.postTitle}</Link></span></td><td data-label="작성자">{comment.authorName}</td>
          <td data-label="상태·신고"><StatusBadge tone={comment.status === "active" ? "success" : "danger"}>{comment.status === "active" ? "공개" : "숨김"}</StatusBadge>{comment.reportCount ? <span className={styles.cellSubtext}>신고 {comment.reportCount}</span> : null}</td>
          <td data-label="반응"><span className={styles.numberCell}>좋아요 {comment.likeCount}<small className={styles.cellSubtext}>싫어요 {comment.dislikeCount}</small></span></td>
          <td data-label="관리"><ModerationButton endpoint={`/api/admin/community/comments/${comment.id}`} body={{ status: comment.status === "active" ? "deleted" : "active" }} danger={comment.status === "active"} confirmMessage={comment.status === "active" ? "댓글을 숨길까요?" : "댓글을 복구할까요?"}>{comment.status === "active" ? "숨김" : "복구"}</ModerationButton></td>
        </tr>)}</tbody></table></div> : <div className={styles.empty}><strong>조건에 맞는 댓글이 없습니다.</strong>검색어 또는 필터를 바꿔 보세요.</div>}
        <ManagementPagination page={data.page} totalPages={data.totalPages} createHref={(page) => { const query = new URLSearchParams(); if (filters.keyword) query.set("keyword", filters.keyword); if (filters.status !== "all") query.set("status", filters.status); query.set("page", String(page)); return `/community/comments?${query}`; }} />
      </section></main>
    </AdminLayout>
  );
}
