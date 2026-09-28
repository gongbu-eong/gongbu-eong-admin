import { db, query } from "@/features/admin/server/db";
import type { ManagementDateInput } from "@/features/admin/management-date";
import { appendManagementDate } from "./management-date-filter";
import { availableReportDecisions, REPORT_DECISIONS, REPORT_REASONS, type ReportDecision, type ReportHistoryEntry } from "@/features/admin/community-reports";

export type CommunityPostFilters = ManagementDateInput & {
  page?: number;
  keyword?: string;
  status?: "all" | "active" | "deleted";
  category?: string;
  reported?: boolean;
};

export const COMMUNITY_CATEGORIES = [
  "자유·잡담",
  "공시 정보",
  "공부·스터디",
  "질문·답변",
  "합격·면접 후기",
  "유머·짤",
] as const;

const PAGE_SIZE = 20;

type PostRow = {
  id: string;
  category: string;
  title: string;
  content: string;
  status: string;
  author_id: string;
  author_name: string;
  author_email: string | null;
  view_count: number;
  recommend_count: string | number;
  scrap_count: string | number;
  comment_count: string | number;
  report_count: string | number;
  pending_report_count: string | number;
  attachment_count: string | number;
  created_at: Date | string;
  updated_at: Date | string;
  deleted_at: Date | string | null;
};

export type ManagedCommunityPost = {
  id: string;
  category: string;
  title: string;
  content: string;
  contentPreview: string;
  status: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  viewCount: number;
  recommendCount: number;
  scrapCount: number;
  commentCount: number;
  reportCount: number;
  pendingReportCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export async function getManagedCommunityPosts(filters: CommunityPostFilters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const keyword = String(filters.keyword || "").trim().slice(0, 100);
  const status = filters.status || "all";
  const category = String(filters.category || "").trim();
  const values: unknown[] = [];
  const where: string[] = [];
  const dateRange = appendManagementDate("posts", filters, where, values);

  if (keyword) {
    values.push(`%${keyword}%`);
    where.push(`(
      posts.title ILIKE $${values.length}
      OR posts.content ILIKE $${values.length}
      OR COALESCE(users.community_nickname, users.nickname, users.display_name, users.email, '') ILIKE $${values.length}
    )`);
  }
  if (status !== "all") {
    values.push(status);
    where.push(`posts.status = $${values.length}`);
  }
  if (category) {
    values.push(category);
    where.push(`posts.category = $${values.length}`);
  }
  if (filters.reported) {
    where.push(`EXISTS (
      SELECT 1 FROM public.community_reports reported
      WHERE reported.target_type = 'post' AND reported.target_id = posts.id
    )`);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countValues = [...values];
  values.push(PAGE_SIZE, (page - 1) * PAGE_SIZE);

  const [postsResult, countResult, metricsResult] = await Promise.all([
    query<PostRow>(
      `
        SELECT
          posts.id,
          posts.category,
          posts.title,
          posts.content,
          posts.status,
          users.id AS author_id,
          COALESCE(users.community_nickname, users.nickname, users.display_name, '공부엉이') AS author_name,
          users.email AS author_email,
          posts.view_count,
          COALESCE(reactions.recommend_count, 0) AS recommend_count,
          COALESCE(reactions.scrap_count, 0) AS scrap_count,
          COALESCE(comments.comment_count, 0) AS comment_count,
          COALESCE(reports.report_count, 0) AS report_count,
          COALESCE(reports.pending_report_count, 0) AS pending_report_count,
          COALESCE(attachments.attachment_count, 0) AS attachment_count,
          posts.created_at,
          posts.updated_at,
          posts.deleted_at
        FROM public.community_posts posts
        JOIN public.users users ON users.id = posts.user_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE reaction_type = 'recommend')::integer AS recommend_count,
            COUNT(*) FILTER (WHERE reaction_type = 'scrap')::integer AS scrap_count
          FROM public.community_post_reactions
          WHERE post_id = posts.id
        ) reactions ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) FILTER (WHERE status = 'active')::integer AS comment_count
          FROM public.community_comments
          WHERE post_id = posts.id
        ) comments ON true
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::integer AS report_count,
            COUNT(*) FILTER (WHERE status IN ('pending', 'reviewing'))::integer AS pending_report_count
          FROM public.community_reports
          WHERE target_type = 'post' AND target_id = posts.id
        ) reports ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::integer AS attachment_count
          FROM public.community_post_attachments
          WHERE post_id = posts.id
        ) attachments ON true
        ${whereSql}
        ORDER BY
          COALESCE(reports.pending_report_count, 0) DESC,
          posts.created_at DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    ),
    query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM public.community_posts posts
        JOIN public.users users ON users.id = posts.user_id
        ${whereSql}
      `,
      countValues,
    ),
    query<{
      active_count: string;
      today_count: string;
      pending_report_count: string;
      deleted_count: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM public.community_posts WHERE status = 'active')::text AS active_count,
        (SELECT COUNT(*) FROM public.community_posts WHERE created_at >= date_trunc('day', NOW()))::text AS today_count,
        (SELECT COUNT(*) FROM public.community_reports WHERE status IN ('pending', 'reviewing'))::text AS pending_report_count,
        (SELECT COUNT(*) FROM public.community_posts WHERE status = 'deleted')::text AS deleted_count
    `),
  ]);
  const total = Number(countResult.rows[0]?.total || 0);
  const metrics = metricsResult.rows[0];

  return {
    posts: postsResult.rows.map(mapPost),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    filters: { keyword, status, category, reported: Boolean(filters.reported), ...dateRange },
    metrics: [
      { label: "공개 게시글", value: Number(metrics?.active_count || 0), note: "현재 열람 가능" },
      { label: "오늘 작성", value: Number(metrics?.today_count || 0), note: "자정 이후" },
      { label: "처리할 신고", value: Number(metrics?.pending_report_count || 0), note: "대기·검토 중" },
      { label: "숨김 게시글", value: Number(metrics?.deleted_count || 0), note: "복구 가능" },
    ],
  };
}

export async function getManagedCommunityPost(postId: string) {
  const posts = await query<PostRow>(
    `
      SELECT
        posts.id,
        posts.category,
        posts.title,
        posts.content,
        posts.status,
        users.id AS author_id,
        COALESCE(users.community_nickname, users.nickname, users.display_name, '공부엉이') AS author_name,
        users.email AS author_email,
        posts.view_count,
        COALESCE(reactions.recommend_count, 0) AS recommend_count,
        COALESCE(reactions.scrap_count, 0) AS scrap_count,
        COALESCE(comments.comment_count, 0) AS comment_count,
        COALESCE(reports.report_count, 0) AS report_count,
        COALESCE(reports.pending_report_count, 0) AS pending_report_count,
        COALESCE(attachments.attachment_count, 0) AS attachment_count,
        posts.created_at,
        posts.updated_at,
        posts.deleted_at
      FROM public.community_posts posts
      JOIN public.users users ON users.id = posts.user_id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE reaction_type = 'recommend')::integer AS recommend_count,
          COUNT(*) FILTER (WHERE reaction_type = 'scrap')::integer AS scrap_count
        FROM public.community_post_reactions WHERE post_id = posts.id
      ) reactions ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) FILTER (WHERE status = 'active')::integer AS comment_count
        FROM public.community_comments WHERE post_id = posts.id
      ) comments ON true
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::integer AS report_count,
          COUNT(*) FILTER (WHERE status IN ('pending', 'reviewing'))::integer AS pending_report_count
        FROM public.community_reports WHERE target_type = 'post' AND target_id = posts.id
      ) reports ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::integer AS attachment_count
        FROM public.community_post_attachments WHERE post_id = posts.id
      ) attachments ON true
      WHERE posts.id = $1
      LIMIT 1
    `,
    [postId],
  );
  if (!posts.rows[0]) return null;

  const [comments, reports, attachments] = await Promise.all([
    getManagedComments({ postId, limit: 100 }),
    getManagedReports({ targetId: postId, limit: 100 }),
    query<{ id: string; file_name: string; mime_type: string; file_size_bytes: number }>(
      `
        SELECT id, file_name, mime_type, file_size_bytes
        FROM public.community_post_attachments
        WHERE post_id = $1
        ORDER BY sort_order, created_at
      `,
      [postId],
    ),
  ]);

  return {
    ...mapPost(posts.rows[0]),
    comments: comments.items,
    reports: reports.items,
    attachments: attachments.rows.map((item) => ({
      id: item.id,
      name: item.file_name,
      mimeType: item.mime_type,
      size: item.file_size_bytes,
    })),
  };
}

export async function getCommunityAttachment(attachmentId: string) {
  const result = await query<{
    file_name: string;
    mime_type: string;
    file_data_url: string;
  }>(
    `
      SELECT file_name, mime_type, file_data_url
      FROM public.community_post_attachments
      WHERE id = $1
      LIMIT 1
    `,
    [attachmentId],
  );
  return result.rows[0] || null;
}

export async function getManagedComments(args: ManagementDateInput & {
  page?: number;
  keyword?: string;
  status?: string;
  postId?: string;
  limit?: number;
} = {}) {
  const page = Math.max(1, Number(args.page || 1));
  const limit = Math.min(100, Math.max(1, args.limit || PAGE_SIZE));
  const keyword = String(args.keyword || "").trim().slice(0, 100);
  const values: unknown[] = [];
  const where: string[] = [];
  appendManagementDate("comments", args, where, values);
  if (keyword) {
    values.push(`%${keyword}%`);
    where.push(`(comments.content ILIKE $${values.length} OR posts.title ILIKE $${values.length})`);
  }
  if (args.status && args.status !== "all") {
    values.push(args.status);
    where.push(`comments.status = $${values.length}`);
  }
  if (args.postId) {
    values.push(args.postId);
    where.push(`comments.post_id = $${values.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countValues = [...values];
  values.push(limit, (page - 1) * limit);

  const [result, count] = await Promise.all([
    query<{
      id: string;
      post_id: string;
      post_title: string;
      parent_comment_id: string | null;
      content: string;
      status: string;
      author_id: string;
      author_name: string;
      like_count: string;
      dislike_count: string;
      report_count: string;
      created_at: Date | string;
    }>(
      `
        SELECT
          comments.id,
          comments.post_id,
          posts.title AS post_title,
          comments.parent_comment_id,
          comments.content,
          comments.status,
          users.id AS author_id,
          COALESCE(users.community_nickname, users.nickname, users.display_name, '공부엉이') AS author_name,
          COALESCE(reactions.like_count, 0)::text AS like_count,
          COALESCE(reactions.dislike_count, 0)::text AS dislike_count,
          COALESCE(reports.report_count, 0)::text AS report_count,
          comments.created_at
        FROM public.community_comments comments
        JOIN public.community_posts posts ON posts.id = comments.post_id
        JOIN public.users users ON users.id = comments.user_id
        LEFT JOIN LATERAL (
          SELECT
            COUNT(*) FILTER (WHERE reaction_type = 'like') AS like_count,
            COUNT(*) FILTER (WHERE reaction_type = 'dislike') AS dislike_count
          FROM public.community_comment_reactions WHERE comment_id = comments.id
        ) reactions ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS report_count
          FROM public.community_reports WHERE target_type = 'comment' AND target_id = comments.id
        ) reports ON true
        ${whereSql}
        ORDER BY COALESCE(reports.report_count, 0) DESC, comments.created_at DESC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    ),
    query<{ total: string }>(
      `
        SELECT COUNT(*)::text AS total
        FROM public.community_comments comments
        JOIN public.community_posts posts ON posts.id = comments.post_id
        ${whereSql}
      `,
      countValues,
    ),
  ]);
  const total = Number(count.rows[0]?.total || 0);
  return {
    items: result.rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      postTitle: row.post_title,
      parentCommentId: row.parent_comment_id,
      content: row.content,
      status: row.status,
      authorId: row.author_id,
      authorName: row.author_name,
      likeCount: Number(row.like_count || 0),
      dislikeCount: Number(row.dislike_count || 0),
      reportCount: Number(row.report_count || 0),
      createdAt: toIso(row.created_at)!,
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function getManagedReports(args: ManagementDateInput & {
  page?: number;
  keyword?: string;
  searchBy?: string;
  reason?: string;
  status?: string;
  targetType?: string;
  targetId?: string;
  limit?: number;
} = {}) {
  const page = Number.isFinite(args.page) ? Math.max(1, Math.floor(args.page!)) : 1;
  const limit = Number.isFinite(args.limit) ? Math.min(100, Math.max(1, Math.floor(args.limit!))) : PAGE_SIZE;
  const keyword = String(args.keyword || "").trim().slice(0, 100);
  const values: unknown[] = [];
  const where: string[] = [];
  appendManagementDate("reports", args, where, values);
  if (args.status === "open") {
    where.push("reports.status IN ('pending', 'reviewing')");
  } else if (["pending", "reviewing", "resolved", "rejected"].includes(args.status || "")) {
    values.push(args.status);
    where.push(`reports.status = $${values.length}`);
  }
  if (["post", "comment", "reply"].includes(args.targetType || "")) {
    values.push(args.targetType === "reply" ? "comment" : args.targetType);
    where.push(`reports.target_type = $${values.length}`);
    if (args.targetType === "reply") where.push("COALESCE(comments.parent_comment_id::text, reports.target_snapshot->>'parent_comment_id') IS NOT NULL");
  }
  if (args.targetId) {
    values.push(args.targetId);
    where.push(`reports.target_id = $${values.length}`);
  }
  if (REPORT_REASONS.includes(args.reason as typeof REPORT_REASONS[number])) {
    values.push(args.reason);
    where.push(`COALESCE(reports.reason_code, reports.reason) = $${values.length}`);
  }
  if (keyword) {
    values.push(`%${keyword.replace(/[\\%_]/g, "\\$&")}%`);
    const term = `$${values.length}`;
    const nameMatch = (alias: string) => ["community_nickname", "nickname", "display_name", "email"].map((column) => `${alias}.${column} ILIKE ${term}`).join(" OR ");
    const searches: Record<string, string> = {
      content: ["posts.title", "posts.content", "parent_posts.title", "comments.content", "reports.target_snapshot->>'title'", "reports.target_snapshot->>'post_title'", "reports.target_snapshot->>'content'"].map((column) => `${column} ILIKE ${term}`).join(" OR "),
      reason: ["reports.reason", "reports.reason_code", "reports.reason_detail", "reports.review_note"].map((column) => `${column} ILIKE ${term}`).join(" OR "),
      author: nameMatch("authors"),
      reporter: nameMatch("users"),
    };
    const search = Object.hasOwn(searches, args.searchBy || "") ? searches[args.searchBy!] : Object.values(searches).join(" OR ");
    where.push(`(${search})`);
  }
  const joins = `
    FROM public.community_reports reports
    JOIN public.users users ON users.id = reports.user_id
    LEFT JOIN public.community_posts posts ON reports.target_type = 'post' AND posts.id = reports.target_id
    LEFT JOIN public.community_comments comments ON reports.target_type = 'comment' AND comments.id = reports.target_id
    LEFT JOIN public.community_posts parent_posts ON parent_posts.id::text = COALESCE(comments.post_id::text, CASE WHEN reports.target_type = 'comment' THEN reports.target_snapshot->>'post_id' END)
    LEFT JOIN public.users authors ON authors.id::text = COALESCE(posts.user_id::text, comments.user_id::text, reports.target_snapshot->>'user_id')
  `;
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const countValues = [...values];
  values.push(limit, (page - 1) * limit);

  const [result, count] = await Promise.all([
    query<{
      id: string;
      target_type: "post" | "comment";
      target_id: string;
      reason: string | null;
      reason_code: string | null;
      reason_detail: string | null;
      status: string;
      target_snapshot: Record<string, unknown> | null;
      reporter_name: string;
      reporter_id: string;
      reporter_email: string | null;
      author_id: string | null;
      author_name: string | null;
      author_email: string | null;
      post_id: string | null;
      parent_comment_id: string | null;
      parent_status: string | null;
      related_count: string;
      moderation_history: ReportHistoryEntry[];
      updated_at: Date | string;
      target_title: string | null;
      target_content: string | null;
      target_status: string | null;
      review_note: string | null;
      created_at: Date | string;
      reviewed_at: Date | string | null;
    }>(
      `
        SELECT
          reports.id,
          reports.target_type,
          reports.target_id,
          reports.reason,
          reports.reason_code,
          reports.reason_detail,
          reports.status,
          reports.target_snapshot,
          COALESCE(users.community_nickname, users.nickname, users.display_name, '공부엉이') AS reporter_name,
          users.id AS reporter_id,
          users.email AS reporter_email,
          authors.id AS author_id,
          COALESCE(authors.community_nickname, authors.nickname, authors.display_name, authors.email) AS author_name,
          authors.email AS author_email,
          CASE WHEN reports.target_type = 'post' THEN posts.id ELSE parent_posts.id END AS post_id,
          COALESCE(comments.parent_comment_id::text, reports.target_snapshot->>'parent_comment_id') AS parent_comment_id,
          parent_posts.status AS parent_status,
          (SELECT COUNT(*)::text FROM public.community_reports related WHERE related.target_type = reports.target_type AND related.target_id = reports.target_id) AS related_count,
          reports.moderation_history,
          reports.updated_at,
          CASE WHEN reports.target_type = 'post' THEN posts.title ELSE parent_posts.title END AS target_title,
          CASE WHEN reports.target_type = 'post' THEN posts.content ELSE comments.content END AS target_content,
          CASE WHEN reports.target_type = 'post' THEN posts.status ELSE comments.status END AS target_status,
          reports.review_note,
          reports.created_at,
          reports.reviewed_at
        ${joins}
        ${whereSql}
        ORDER BY
          CASE reports.status WHEN 'pending' THEN 0 WHEN 'reviewing' THEN 1 ELSE 2 END,
          reports.created_at ASC, reports.id ASC
        LIMIT $${values.length - 1} OFFSET $${values.length}
      `,
      values,
    ),
    query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${joins} ${whereSql}`,
      countValues,
    ),
  ]);
  const total = Number(count.rows[0]?.total || 0);

  return {
    items: result.rows.map((row) => ({
      id: row.id,
      targetType: row.target_type,
      targetId: row.target_id,
      reason: row.reason || row.reason_code || "사유 미입력",
      reasonDetail: row.reason_detail || "",
      status: row.status,
      snapshot: row.target_snapshot,
      reporterName: row.reporter_name,
      reporterId: row.reporter_id,
      reporterEmail: row.reporter_email || "",
      authorId: row.author_id,
      authorName: row.author_name || "탈퇴·삭제된 회원",
      authorEmail: row.author_email || "",
      postId: row.post_id,
      isReply: Boolean(row.parent_comment_id),
      parentStatus: row.parent_status,
      relatedCount: Number(row.related_count),
      history: Array.isArray(row.moderation_history) ? row.moderation_history : [],
      updatedAt: toIso(row.updated_at)!,
      targetTitle: row.target_title || snapshotText(row.target_snapshot, row.target_type === "post" ? "title" : "post_title") || "삭제되었거나 찾을 수 없는 대상",
      targetContent: row.target_content || "",
      targetStatus: row.target_status || "missing",
      reviewNote: row.review_note || "",
      createdAt: toIso(row.created_at)!,
      reviewedAt: toIso(row.reviewed_at),
    })),
    page,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export async function updateCommunityPostModeration(
  postId: string,
  input: { status?: string; category?: string },
) {
  const status = input.status === "deleted" ? "deleted" : "active";
  const category = input.category && COMMUNITY_CATEGORIES.includes(input.category as never)
    ? input.category
    : null;
  const result = await query(
    `
      UPDATE public.community_posts
      SET
        status = $2,
        category = COALESCE($3, category),
        deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, NOW()) ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [postId, status, category],
  );
  return Boolean(result.rowCount);
}

export async function updateCommunityCommentModeration(commentId: string, status: string) {
  const normalized = status === "deleted" ? "deleted" : "active";
  const result = await query(
    `
      UPDATE public.community_comments
      SET
        status = $2,
        deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, NOW()) ELSE NULL END,
        updated_at = NOW()
      WHERE id = $1
    `,
    [commentId, normalized],
  );
  return Boolean(result.rowCount);
}

export async function processCommunityReport(
  reportId: string,
  input: { decision: string; reviewNote: string; expectedStatus: string; expectedUpdatedAt: string; expectedTargetStatus: string },
  admin: { adminUserId: string; name: string },
) {
  if (!Object.hasOwn(REPORT_DECISIONS, input.decision)) throw new Error("처리할 조치를 선택해 주세요.");
  const decision = input.decision as ReportDecision;
  const outcome = REPORT_DECISIONS[decision];
  const note = input.reviewNote.trim();
  if (note.length > 1000 || (decision !== "review" && !note)) throw new Error("처리 사유를 1~1,000자로 입력해 주세요.");
  if (!admin.adminUserId || !admin.name) throw new Error("관리자 정보가 없습니다.");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const reportResult = await client.query<{ target_type: "post" | "comment"; target_id: string; status: string; updated_at: Date | string; review_note: string | null; reviewed_at: Date | string | null; moderation_history: ReportHistoryEntry[] }>(
      `SELECT target_type, target_id, status, updated_at, review_note, reviewed_at, moderation_history FROM public.community_reports WHERE id = $1 FOR UPDATE`,
      [reportId],
    );
    const report = reportResult.rows[0];
    if (!report) {
      await client.query("ROLLBACK");
      return false;
    }

    const table = report.target_type === "post" ? "community_posts" : "community_comments";
    const target = await client.query<{ status: string }>(`SELECT status FROM public.${table} WHERE id = $1 FOR UPDATE`, [report.target_id]);
    const targetStatus = target.rows[0]?.status || "missing";
    if (report.status !== input.expectedStatus || toIso(report.updated_at) !== input.expectedUpdatedAt || targetStatus !== input.expectedTargetStatus) {
      throw Object.assign(new Error("다른 처리로 신고 또는 원문 상태가 변경됐습니다. 새로고침 후 다시 확인해 주세요."), { name: "ReportConflictError" });
    }
    if (!availableReportDecisions(report.status, targetStatus).includes(decision)) throw new Error("현재 상태에서는 선택한 조치를 할 수 없습니다.");
    const nextTargetStatus = outcome.action === "hide" ? "deleted" : outcome.action === "restore" ? "active" : targetStatus;
    if (outcome.action !== "none") {
      await client.query(
        `UPDATE public.${table} SET status = $2, deleted_at = CASE WHEN $2 = 'deleted' THEN COALESCE(deleted_at, NOW()) ELSE NULL END, updated_at = NOW() WHERE id = $1`,
        [report.target_id, nextTargetStatus],
      );
    }
    const history: ReportHistoryEntry = { at: new Date().toISOString(), adminUserId: admin.adminUserId, adminName: admin.name,
      decision, fromStatus: report.status, toStatus: outcome.status, fromTargetStatus: targetStatus, toTargetStatus: nextTargetStatus, note };
    if (!report.moderation_history.length && (report.review_note || report.reviewed_at)) {
      history.previousReviewNote = report.review_note || "";
      history.previousReviewedAt = toIso(report.reviewed_at);
    }
    await client.query(
      `
        UPDATE public.community_reports
        SET status = $2, review_note = $3, reviewed_by = NULL,
            reviewed_at = CASE WHEN $2 IN ('resolved', 'rejected') THEN NOW() ELSE NULL END,
            moderation_history = moderation_history || $4::jsonb, updated_at = NOW()
        WHERE id = $1
      `,
      [reportId, outcome.status, note || null, JSON.stringify([history])],
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function snapshotText(snapshot: Record<string, unknown> | null, key: string) {
  return typeof snapshot?.[key] === "string" ? snapshot[key] as string : "";
}

function mapPost(row: PostRow): ManagedCommunityPost {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    content: row.content,
    contentPreview: row.content.replace(/\s+/g, " ").trim().slice(0, 120),
    status: row.status,
    authorId: row.author_id,
    authorName: row.author_name,
    authorEmail: row.author_email || "",
    viewCount: Number(row.view_count || 0),
    recommendCount: Number(row.recommend_count || 0),
    scrapCount: Number(row.scrap_count || 0),
    commentCount: Number(row.comment_count || 0),
    reportCount: Number(row.report_count || 0),
    pendingReportCount: Number(row.pending_report_count || 0),
    attachmentCount: Number(row.attachment_count || 0),
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    deletedAt: toIso(row.deleted_at),
  };
}

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
