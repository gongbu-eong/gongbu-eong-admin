import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { PostModerationPanel, ModerationButton } from "@/features/admin/components/management/MutationControls";
import { StatusBadge, formatAdminDate } from "@/features/admin/components/management/ManagementCommon";
import { getManagedCommunityPost } from "@/features/admin/server/community-management.repository";
import styles from "@/features/admin/components/management/Management.module.css";

export const dynamic = "force-dynamic";
export default async function CommunityPostDetailPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  const post = await getManagedCommunityPost(postId);
  if (!post) notFound();
  return (
    <AdminLayout activeNav="community" activeSubNav="community-posts" title="게시글 상세 관리" description="원문, 댓글, 신고 맥락을 함께 확인한 뒤 조치합니다." stickyHeader headerActions={<Link className={styles.buttonSecondary} href="/community/posts">목록으로</Link>}>
      <main className={styles.page}>
        <section className={styles.surface}><div className={styles.detailHeader}><div><div className={styles.inlineMeta}><StatusBadge tone="blue">{post.category}</StatusBadge><StatusBadge tone={post.status === "active" ? "success" : "danger"}>{post.status === "active" ? "공개" : "숨김"}</StatusBadge>{post.pendingReportCount ? <StatusBadge tone="danger">미처리 신고 {post.pendingReportCount}</StatusBadge> : null}</div><h2>{post.title}</h2><div className={styles.inlineMeta}><span>{post.authorName}</span><span>{post.authorEmail}</span><span>{formatAdminDate(post.createdAt, true)}</span></div></div><div className={styles.detailStats}><span>조회<strong>{post.viewCount}</strong></span><span>추천<strong>{post.recommendCount}</strong></span><span>댓글<strong>{post.commentCount}</strong></span></div></div></section>
        <div className={styles.split}>
          <div className={styles.page} style={{ marginTop: 0 }}>
            <section className={styles.surface}><h3 className={styles.sectionTitle}>게시글 원문</h3><div className={styles.previewContent}>{post.content}</div>{post.attachments.length ? <div className={styles.cardList}>{post.attachments.map((file) => <div className={styles.listCard} key={file.id}><div><h3>{file.name}</h3><p>{file.mimeType} · {(file.size / 1024).toFixed(1)}KB</p></div><a className={styles.buttonSecondary} href={`/api/admin/community/attachments/${file.id}`} target="_blank" rel="noreferrer">첨부 보기</a></div>)}</div> : null}</section>
            <section className={styles.surface}><div className={styles.surfaceHeader}><div><h2>댓글·답글</h2><p>{post.comments.length}건을 원문 맥락과 함께 확인합니다.</p></div></div>{post.comments.length ? <div className={styles.cardList}>{post.comments.map((comment) => <article className={styles.listCard} key={comment.id}><div><div className={styles.inlineMeta}><strong>{comment.authorName}</strong><StatusBadge tone={comment.status === "active" ? "success" : "danger"}>{comment.status === "active" ? "공개" : "숨김"}</StatusBadge>{comment.parentCommentId ? <StatusBadge>답글</StatusBadge> : null}{comment.reportCount ? <StatusBadge tone="danger">신고 {comment.reportCount}</StatusBadge> : null}</div><p>{comment.content}</p><small className={styles.cellSubtext}>{formatAdminDate(comment.createdAt, true)} · 좋아요 {comment.likeCount} · 싫어요 {comment.dislikeCount}</small></div><ModerationButton endpoint={`/api/admin/community/comments/${comment.id}`} body={{ status: comment.status === "active" ? "deleted" : "active" }} danger={comment.status === "active"} confirmMessage={comment.status === "active" ? "댓글을 숨길까요?" : "댓글을 복구할까요?"}>{comment.status === "active" ? "숨김" : "복구"}</ModerationButton></article>)}</div> : <div className={styles.empty}>댓글이 없습니다.</div>}</section>
          </div>
          <aside className={styles.sidePanel}><section className={styles.surface}><h3 className={styles.sectionTitle}>게시글 조치</h3><p className={styles.sectionHint}>카테고리 정정 또는 공개 상태를 변경합니다.</p><div style={{ marginTop: 16 }}><PostModerationPanel postId={post.id} category={post.category} status={post.status} /></div></section>{post.reports.length ? <section className={styles.surface} style={{ marginTop: 16 }}><h3 className={styles.sectionTitle}>신고 요약</h3><div className={styles.cardList}>{post.reports.map((report) => <Link className={styles.listCard} href={`/community/reports?status=${report.status}`} key={report.id}><div><h3>{report.reason}</h3><p>{report.reporterName} · {formatAdminDate(report.createdAt, true)}</p></div><StatusBadge tone={report.status === "pending" ? "danger" : report.status === "reviewing" ? "warning" : "muted"}>{reportStatus(report.status)}</StatusBadge></Link>)}</div></section> : null}</aside>
        </div>
      </main>
    </AdminLayout>
  );
}
function reportStatus(status: string) { return ({ pending: "대기", reviewing: "검토 중", resolved: "완료", rejected: "기각" } as Record<string, string>)[status] || status; }
