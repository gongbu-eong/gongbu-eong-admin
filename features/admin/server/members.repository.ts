import { query } from "@/features/admin/server/db";

export type MemberStatusFilter = "all" | "active" | "paid" | "blocked" | "memo";
export type MemberChannelFilter =
  | "all"
  | "instagram"
  | "blog"
  | "threads"
  | "search"
  | "direct";

export type MemberDetailTab =
  | "overview"
  | "purchases"
  | "diagnosis"
  | "resume-coaching"
  | "community"
  | "memo"
  | "logs";

export type MemberListQuery = {
  page?: number;
  keyword?: string | null;
  status?: string | null;
  channel?: string | null;
  selectedId?: string | null;
};

export type MemberMetric = {
  label: string;
  value: string;
  unit: string;
  note: string;
};

export type MemberSummary = {
  id: string;
  name: string;
  email: string;
  maskedEmail: string;
  gender: string;
  ageGroup: string;
  source: string;
  campaign: string;
  joinedAt: string;
  joinedAtShort: string;
  lastLoginAt: string;
  avatarSrc: string;
  backgroundColor: string;
  provider: string;
  status: string;
  statusLabel: string;
  blockedUntil: string;
  rejoinBlockedUntil: string;
  paidLabel: string;
  remainingCredits: number;
  purchaseCount: number;
  paymentTotal: number;
  diagnosisCount: number;
  resumeCoachingCount: number;
  interviewCoachingCount: number;
  postCount: number;
  commentCount: number;
};

export type MemberPurchase = {
  date: string;
  product: string;
  quantity: string;
  amount: string;
  credit: string;
};

export type MemberDiagnosis = {
  date: string;
  title: string;
  result: string;
};

export type MemberResumeCoaching = {
  date: string;
  title: string;
  result: string;
};

export type MemberCommunityActivity = {
  date: string;
  kind: string;
  title: string;
  status: string;
};

export type MemberMemo = {
  id: string;
  adminName: string;
  memo: string;
  createdAt: string;
};

export type MemberLog = {
  actor: string;
  kind: string;
  target: string;
  occurredAt: string;
};

export type MemberListData = {
  metrics: MemberMetric[];
  members: MemberSummary[];
  selectedMember: MemberSummary | null;
  page: number;
  totalPages: number;
  totalCount: number;
  keyword: string;
  status: MemberStatusFilter;
  channel: MemberChannelFilter;
  selectedId: string;
};

export type MemberDetailData = {
  member: MemberSummary | null;
  purchases: MemberPurchase[];
  diagnosis: MemberDiagnosis[];
  resumeCoachings: MemberResumeCoaching[];
  community: MemberCommunityActivity[];
  memos: MemberMemo[];
  logs: MemberLog[];
  memoTableAvailable: boolean;
};

type MemberRow = {
  id: string;
  nickname: string | null;
  display_name: string | null;
  email: string | null;
  gender: string | null;
  age_group: string | null;
  profile_avatar_key: string | null;
  profile_background_color: string | null;
  status: string;
  blocked_until: string | Date | null;
  rejoin_blocked_until: string | Date | null;
  signup_at: string | Date | null;
  last_login_at: string | Date | null;
  provider: string | null;
  provider_email: string | null;
  first_source: string | null;
  first_campaign: string | null;
  remaining_credits: string | number | null;
  purchase_count: string | number | null;
  payment_total: string | number | null;
  diagnosis_count: string | number | null;
  resume_coaching_count: string | number | null;
  interview_coaching_count: string | number | null;
  post_count: string | number | null;
  comment_count: string | number | null;
  total_filtered?: string | number | null;
};

type MetricRow = {
  total_members: string;
  active_members: string;
  blocked_members: string;
  new_week_members: string;
  diagnosis_members: string;
  paid_members: string;
};

type PurchaseRow = {
  date_value: string | Date | null;
  product: string | null;
  amount_krw: string | number | null;
  credit_amount: string | number | null;
};

type DiagnosisRow = {
  date_value: string | Date | null;
  title: string | null;
  result: string | null;
};

type ResumeCoachingRow = {
  date_value: string | Date | null;
  title: string | null;
  score: string | number | null;
};

type CommunityRow = {
  date_value: string | Date | null;
  kind: string | null;
  title: string | null;
  status: string | null;
};

type MemoRow = {
  id: string;
  admin_name: string | null;
  memo: string | null;
  created_at: string | Date | null;
};

type LogRow = {
  actor: string | null;
  kind: string | null;
  target: string | null;
  occurred_at: string | Date | null;
};

type TableExistsRow = {
  exists: boolean;
};

const pageSize = 10;

export function normalizeMemberTab(value?: string | null): MemberDetailTab {
  if (
    value === "purchases" ||
    value === "diagnosis" ||
    value === "resume-coaching" ||
    value === "community" ||
    value === "memo" ||
    value === "logs"
  ) {
    return value;
  }

  return "overview";
}

function isUuid(value: string | null | undefined) {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function numberValue(value: string | number | null | undefined) {
  return Number(value || 0);
}

function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatWon(value: number) {
  return `${formatNumber(value)}원`;
}

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  })
    .format(date)
    .replace(/\.$/, "");
}

function formatShortDate(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
  })
    .format(date)
    .replace(/\.$/, "");
}

function formatShortDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\.\s?/g, "/")
    .replace(/\/$/, "");
}

function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatGender(value: string | null) {
  if (value === "female") return "여";
  if (value === "male") return "남";
  return "-";
}

function formatAgeGroup(value: string | null) {
  const labels: Record<string, string> = {
    teens: "10대",
    early_20s: "20~24세",
    late_20s: "25~29세",
    early_30s: "30~34세",
    late_30s: "35~39세",
    over_40: "40세 이상",
  };

  return value ? labels[value] || value : "-";
}

function formatProvider(value: string | null) {
  if (value === "kakao") return "카카오";
  if (value === "naver") return "네이버";
  return "소셜";
}

function formatStatus(value: string) {
  if (value === "active") return "활동중";
  if (value === "blocked") return "정지";
  if (value === "pending_signup") return "가입대기";
  return "탈퇴";
}

function formatCommunityStatus(value: string | null) {
  if (value === "active" || value === "published") return "게시중";
  if (value === "hidden") return "숨김";
  if (value === "deleted") return "삭제";
  return value || "-";
}

function formatKind(value: string | null) {
  if (!value) return "-";
  if (value === "attribution_capture") return "방문";
  if (value === "diagnosis_complete") return "진단 완료";
  if (value.includes("resume_coaching")) return "자소서 코칭";
  if (value.includes("interview_coaching")) return "면접 코칭";
  if (value.includes("share")) return "공유";
  if (value.includes("signup")) return "회원 가입";
  return value;
}

function formatTarget(value: string | null) {
  if (!value) return "-";
  if (value.includes("diagnosis/result")) return "강점·성향 진단 결과";
  if (value.includes("diagnosis")) return "강점·성향 진단";
  if (value.includes("coaching")) return "AI 자소서 코칭";
  if (value.includes("community")) return "커뮤니티";
  if (value.includes("jobs")) return "채용공고";
  if (value === "/") return "메인";
  return value;
}

function maskEmail(value: string | null) {
  if (!value || !value.includes("@")) return value || "-";

  const [name, domain] = value.split("@");
  const prefix = name.slice(0, Math.min(3, name.length));

  return `${prefix}***@${domain}`;
}

function normalizeStatus(value?: string | null): MemberStatusFilter {
  if (value === "active" || value === "paid" || value === "blocked" || value === "memo") {
    return value;
  }

  return "all";
}

function normalizeChannel(value?: string | null): MemberChannelFilter {
  if (
    value === "instagram" ||
    value === "blog" ||
    value === "threads" ||
    value === "search" ||
    value === "direct"
  ) {
    return value;
  }

  return "all";
}

function toMemberSummary(row: MemberRow): MemberSummary {
  const email = row.email || row.provider_email || "-";
  const name = row.nickname || row.display_name || maskEmail(email) || "이름 없음";
  const avatarKey = row.profile_avatar_key || "fox";
  const purchaseCount = numberValue(row.purchase_count);

  return {
    id: row.id,
    name,
    email,
    maskedEmail: maskEmail(email),
    gender: formatGender(row.gender),
    ageGroup: formatAgeGroup(row.age_group),
    source: row.first_source || "직접유입",
    campaign: row.first_campaign || "캠페인 없음",
    joinedAt: formatDate(row.signup_at),
    joinedAtShort: formatShortDate(row.signup_at),
    lastLoginAt: formatShortDateTime(row.last_login_at),
    avatarSrc: `/my/avatars/${avatarKey}-profile.png`,
    backgroundColor: row.profile_background_color || "#c4c6ca",
    provider: formatProvider(row.provider),
    status: row.status,
    statusLabel: formatStatus(row.status),
    blockedUntil: formatDateTime(row.blocked_until),
    rejoinBlockedUntil: formatDateTime(row.rejoin_blocked_until),
    paidLabel: purchaseCount > 0 ? "유료" : "무료",
    remainingCredits: numberValue(row.remaining_credits),
    purchaseCount,
    paymentTotal: numberValue(row.payment_total),
    diagnosisCount: numberValue(row.diagnosis_count),
    resumeCoachingCount: numberValue(row.resume_coaching_count),
    interviewCoachingCount: numberValue(row.interview_coaching_count),
    postCount: numberValue(row.post_count),
    commentCount: numberValue(row.comment_count),
  };
}

function createMemberSelectSql(whereClause: string) {
  return `
    SELECT
      users.id,
      users.nickname,
      users.display_name,
      users.email::TEXT AS email,
      users.gender,
      users.age_group,
      users.profile_avatar_key,
      users.profile_background_color,
      users.status::TEXT,
      users.blocked_until,
      users.rejoin_blocked_until,
      COALESCE(users.signup_completed_at, users.created_at) AS signup_at,
      users.last_login_at,
      oauth.provider::TEXT,
      oauth.provider_email::TEXT,
      attribution.first_source,
      attribution.first_campaign,
      COALESCE(credits.balance_after, 0) AS remaining_credits,
      COALESCE(purchases.purchase_count, 0) AS purchase_count,
      COALESCE(purchases.payment_total, 0) AS payment_total,
      COALESCE(diagnosis.diagnosis_count, 0) AS diagnosis_count,
      COALESCE(resume_coaching.resume_coaching_count, 0) AS resume_coaching_count,
      COALESCE(interview_coaching.interview_coaching_count, 0) AS interview_coaching_count,
      COALESCE(posts.post_count, 0) AS post_count,
      COALESCE(comments.comment_count, 0) AS comment_count,
      COUNT(*) OVER() AS total_filtered
    FROM public.users users
    LEFT JOIN LATERAL (
      SELECT provider, provider_email
      FROM public.user_oauth_accounts accounts
      WHERE accounts.user_id = users.id
      ORDER BY COALESCE(accounts.last_used_at, accounts.linked_at, accounts.created_at) DESC
      LIMIT 1
    ) oauth ON TRUE
    LEFT JOIN public.user_attributions attribution ON attribution.user_id = users.id
    LEFT JOIN LATERAL (
      SELECT balance_after
      FROM public.credit_transactions transactions
      WHERE transactions.user_id = users.id
      ORDER BY transactions.created_at DESC
      LIMIT 1
    ) credits ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS purchase_count, COALESCE(SUM(amount_krw), 0) AS payment_total
      FROM public.payments payments
      WHERE payments.user_id = users.id
        AND payments.status = 'paid'
    ) purchases ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS diagnosis_count
      FROM public.diagnosis_results results
      WHERE results.user_id = users.id
    ) diagnosis ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS resume_coaching_count
      FROM public.resume_coaching_requests requests
      WHERE requests.user_id = users.id
    ) resume_coaching ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS interview_coaching_count
      FROM public.interview_coaching_sessions sessions
      WHERE sessions.user_id = users.id
    ) interview_coaching ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS post_count
      FROM public.community_posts posts
      WHERE posts.user_id = users.id
        AND posts.deleted_at IS NULL
        AND posts.status <> 'deleted'
    ) posts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS comment_count
      FROM public.community_comments comments
      WHERE comments.user_id = users.id
        AND comments.deleted_at IS NULL
        AND comments.status <> 'deleted'
    ) comments ON TRUE
    ${whereClause}
  `;
}

const memberFilterSql = `
  WHERE users.status <> 'withdrawn'
    AND (
      $1::text = ''
      OR users.nickname ILIKE $1::text
      OR users.display_name ILIKE $1::text
      OR users.email::TEXT ILIKE $1::text
      OR oauth.provider_email::TEXT ILIKE $1::text
    )
    AND (
      $2::text = 'all'
      OR ($2::text = 'active' AND users.status = 'active')
      OR ($2::text = 'blocked' AND users.status = 'blocked')
      OR ($2::text = 'paid' AND purchases.purchase_count > 0)
      OR ($2::text = 'memo')
    )
    AND (
      $3::text = 'all'
      OR CASE
        WHEN LOWER(COALESCE(attribution.first_source, '')) LIKE '%instagram%'
          OR LOWER(COALESCE(attribution.first_source, '')) = 'ig'
          THEN 'instagram'
        WHEN LOWER(COALESCE(attribution.first_source, '')) LIKE '%blog%'
          THEN 'blog'
        WHEN LOWER(COALESCE(attribution.first_source, '')) LIKE '%thread%'
          THEN 'threads'
        WHEN LOWER(COALESCE(attribution.first_source, '')) LIKE '%naver%'
          OR LOWER(COALESCE(attribution.first_source, '')) LIKE '%google%'
          OR LOWER(COALESCE(attribution.first_source, '')) LIKE '%daum%'
          OR LOWER(COALESCE(attribution.first_source, '')) LIKE '%search%'
          THEN 'search'
        ELSE 'direct'
      END = $3::text
    )
`;

async function hasAdminMemoTable() {
  const result = await query<TableExistsRow>(
    "SELECT to_regclass('public.admin_member_memos') IS NOT NULL AS exists",
  );

  return Boolean(result.rows[0]?.exists);
}

export async function getMemberListData(
  args?: MemberListQuery,
): Promise<MemberListData> {
  const page = Math.max(1, Number(args?.page || 1));
  const keyword = (args?.keyword || "").trim();
  const status = normalizeStatus(args?.status);
  const channel = normalizeChannel(args?.channel);
  const selectedId = isUuid(args?.selectedId) ? String(args?.selectedId) : "";
  const searchPattern = keyword ? `%${keyword}%` : "";
  const offset = (page - 1) * pageSize;

  const [metricResult, memberResult, selectedResult] = await Promise.all([
    query<MetricRow>(
      `
        SELECT
          COUNT(*) FILTER (WHERE users.status <> 'withdrawn') AS total_members,
          COUNT(*) FILTER (WHERE users.status = 'active') AS active_members,
          COUNT(*) FILTER (WHERE users.status = 'blocked') AS blocked_members,
          COUNT(*) FILTER (
            WHERE users.status <> 'withdrawn'
              AND COALESCE(users.signup_completed_at, users.created_at) >= NOW() - INTERVAL '7 days'
          ) AS new_week_members,
          COUNT(DISTINCT diagnosis.user_id) AS diagnosis_members,
          COUNT(DISTINCT payments.user_id) AS paid_members
        FROM public.users users
        LEFT JOIN public.diagnosis_results diagnosis ON diagnosis.user_id = users.id
        LEFT JOIN public.payments payments
          ON payments.user_id = users.id
         AND payments.status = 'paid'
      `,
    ),
    query<MemberRow>(
      `
        ${createMemberSelectSql(memberFilterSql)}
        ORDER BY COALESCE(users.signup_completed_at, users.created_at) DESC
        LIMIT $4 OFFSET $5
      `,
      [searchPattern, status, channel, pageSize, offset],
    ),
    selectedId
      ? query<MemberRow>(
          `
            ${createMemberSelectSql(`
              WHERE users.id = $1::uuid
            `)}
            LIMIT 1
          `,
          [selectedId],
        )
      : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof query<MemberRow>>>),
  ]);

  const metrics = metricResult.rows[0];
  const totalMembers = numberValue(metrics?.total_members);
  const activeMembers = numberValue(metrics?.active_members);
  const blockedMembers = numberValue(metrics?.blocked_members);
  const diagnosisMembers = numberValue(metrics?.diagnosis_members);
  const paidMembers = numberValue(metrics?.paid_members);
  const totalCount = numberValue(memberResult.rows[0]?.total_filtered);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const members = memberResult.rows.map(toMemberSummary);

  return {
    metrics: [
      {
        label: "전체 회원",
        value: formatNumber(totalMembers),
        unit: "명",
        note: `활동중 ${formatNumber(activeMembers)}명 · 정지 ${formatNumber(blockedMembers)}명`,
      },
      {
        label: "이번 주 신규 가입",
        value: formatNumber(numberValue(metrics?.new_week_members)),
        unit: "명",
        note: "최근 7일",
      },
      {
        label: "진단 경험 회원",
        value: formatNumber(diagnosisMembers),
        unit: "명",
        note: `전체의 ${totalMembers > 0 ? Math.round((diagnosisMembers / totalMembers) * 100) : 0}%`,
      },
      {
        label: "유료 전환 회원",
        value: formatNumber(paidMembers),
        unit: "명",
        note: `전환율 ${totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0}%`,
      },
    ],
    members,
    selectedMember: selectedResult.rows[0] ? toMemberSummary(selectedResult.rows[0]) : null,
    page: Math.min(page, totalPages),
    totalPages,
    totalCount,
    keyword,
    status,
    channel,
    selectedId,
  };
}

export async function getMemberDetailData(
  userId?: string | null,
): Promise<MemberDetailData> {
  const empty: MemberDetailData = {
    member: null,
    purchases: [],
    diagnosis: [],
    resumeCoachings: [],
    community: [],
    memos: [],
    logs: [],
    memoTableAvailable: false,
  };

  const memberResult = await query<MemberRow>(
    `
      ${createMemberSelectSql(`
        WHERE (
          ($1::uuid IS NULL AND users.status <> 'withdrawn')
          OR ($1::uuid IS NOT NULL AND users.id = $1::uuid)
        )
      `)}
      ORDER BY COALESCE(users.signup_completed_at, users.created_at) DESC
      LIMIT 1
    `,
    [isUuid(userId) ? userId : null],
  );
  const memberRow = memberResult.rows[0];

  if (!memberRow) {
    return empty;
  }

  const memoTableAvailable = await hasAdminMemoTable();
  const memoQuery = memoTableAvailable
    ? query<MemoRow>(
        `
          SELECT id, admin_name, memo, created_at
          FROM public.admin_member_memos
          WHERE user_id = $1::uuid
          ORDER BY created_at DESC
          LIMIT 5
        `,
        [memberRow.id],
      )
    : Promise.resolve({ rows: [] } as unknown as Awaited<ReturnType<typeof query<MemoRow>>>);

  const [
    purchaseResult,
    diagnosisResult,
    resumeCoachingResult,
    communityResult,
    memoResult,
    logResult,
  ] = await Promise.all([
    query<PurchaseRow>(
      `
        SELECT
          COALESCE(payments.paid_at, payments.created_at) AS date_value,
          COALESCE(packages.name, '진단권') AS product,
          payments.amount_krw,
          COALESCE(packages.credit_amount + packages.bonus_credit_amount, credits.amount, 0) AS credit_amount
        FROM public.payments payments
        LEFT JOIN public.credit_packages packages ON packages.id = payments.credit_package_id
        LEFT JOIN public.credit_transactions credits ON credits.payment_id = payments.id
        WHERE payments.user_id = $1::uuid
          AND payments.status = 'paid'
        ORDER BY COALESCE(payments.paid_at, payments.created_at) DESC
        LIMIT 5
      `,
      [memberRow.id],
    ),
    query<DiagnosisRow>(
      `
        SELECT
          results.created_at AS date_value,
          COALESCE(types.name, '강점·성향 진단') AS title,
          COALESCE(results.summary, types.name, '결과 확인') AS result
        FROM public.diagnosis_results results
        LEFT JOIN public.personality_types types ON types.id = results.personality_type_id
        WHERE results.user_id = $1::uuid
        ORDER BY results.created_at DESC
        LIMIT 5
      `,
      [memberRow.id],
    ),
    query<ResumeCoachingRow>(
      `
        SELECT
          requests.created_at AS date_value,
          COALESCE(
            requests.job_posting_snapshot->>'title',
            requests.source_filename,
            LEFT(requests.input_text, 32),
            '자소서 코칭'
          ) AS title,
          results.score
        FROM public.resume_coaching_requests requests
        LEFT JOIN public.resume_coaching_results results ON results.request_id = requests.id
        WHERE requests.user_id = $1::uuid
        ORDER BY requests.created_at DESC
        LIMIT 5
      `,
      [memberRow.id],
    ),
    query<CommunityRow>(
      `
        SELECT created_at AS date_value, '게시글' AS kind, title, status
        FROM public.community_posts
        WHERE user_id = $1::uuid
          AND deleted_at IS NULL
        UNION ALL
        SELECT comments.created_at AS date_value, '댓글' AS kind, posts.title, comments.status
        FROM public.community_comments comments
        JOIN public.community_posts posts ON posts.id = comments.post_id
        WHERE comments.user_id = $1::uuid
          AND comments.deleted_at IS NULL
        ORDER BY date_value DESC
        LIMIT 5
      `,
      [memberRow.id],
    ),
    memoQuery,
    query<LogRow>(
      `
        SELECT *
        FROM (
          SELECT
            '시스템' AS actor,
            event_name AS kind,
            COALESCE(landing_path, landing_url, referrer) AS target,
            created_at AS occurred_at
          FROM public.attribution_events
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT
            '시스템' AS actor,
            event_type AS kind,
            COALESCE(
              properties->>'path',
              properties->>'title',
              diagnosis_result_id::TEXT,
              diagnosis_run_id::TEXT
            ) AS target,
            created_at AS occurred_at
          FROM public.product_events
          WHERE user_id = $1::uuid
        ) logs
        ORDER BY occurred_at DESC
        LIMIT 5
      `,
      [memberRow.id],
    ),
  ]);

  return {
    member: toMemberSummary(memberRow),
    purchases: purchaseResult.rows.map((row) => ({
      date: formatShortDate(row.date_value),
      product: row.product || "진단권",
      quantity: "1",
      amount: formatWon(numberValue(row.amount_krw)),
      credit: `+${formatNumber(numberValue(row.credit_amount))}`,
    })),
    diagnosis: diagnosisResult.rows.map((row) => ({
      date: formatShortDate(row.date_value),
      title: row.title || "강점·성향 진단",
      result: row.result || "결과 확인",
    })),
    resumeCoachings: resumeCoachingResult.rows.map((row) => ({
      date: formatShortDate(row.date_value),
      title: row.title || "자소서 코칭",
      result: row.score === null || row.score === undefined ? "결과 확인" : `${row.score}점`,
    })),
    community: communityResult.rows.map((row) => ({
      date: formatShortDate(row.date_value),
      kind: row.kind || "-",
      title: row.title || "-",
      status: formatCommunityStatus(row.status),
    })),
    memos: memoResult.rows.map((row) => ({
      id: row.id,
      adminName: row.admin_name || "관리자",
      memo: row.memo || "",
      createdAt: formatDateTime(row.created_at),
    })),
    logs: logResult.rows.map((row) => ({
      actor: row.actor || "시스템",
      kind: formatKind(row.kind),
      target: formatTarget(row.target),
      occurredAt: formatDateTime(row.occurred_at),
    })),
    memoTableAvailable,
  };
}

export async function updateMemberStatus(
  userId: string,
  status: "active" | "blocked" | "withdrawn",
  days?: number,
) {
  if (!isUuid(userId)) {
    return false;
  }

  const result = await query<{ id: string }>(
    `
      UPDATE public.users
      SET
        status = $2::public.user_status,
        blocked_until = CASE
          WHEN $2::text = 'blocked' THEN NOW() + ($3::integer * INTERVAL '1 day')
          ELSE NULL
        END,
        rejoin_blocked_until = CASE
          WHEN $2::text = 'withdrawn' THEN NOW() + ($3::integer * INTERVAL '1 day')
          ELSE NULL
        END,
        withdrawn_at = CASE
          WHEN $2::text = 'withdrawn' THEN COALESCE(withdrawn_at, NOW())
          WHEN $2::text = 'active' THEN NULL
          ELSE withdrawn_at
        END,
        sanction_reason = CASE
          WHEN $2::text = 'blocked' THEN 'admin_block'
          WHEN $2::text = 'withdrawn' THEN 'admin_forced_withdrawal'
          ELSE NULL
        END,
        sanction_updated_at = CASE
          WHEN $2::text IN ('blocked', 'withdrawn') THEN NOW()
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE id = $1::uuid
      RETURNING id
    `,
    [userId, status, days || 0],
  );

  if ((result.rowCount || 0) > 0 && status !== "active") {
    await query(
      "DELETE FROM public.user_sessions WHERE user_id = $1::uuid",
      [userId],
    );
  }

  return (result.rowCount || 0) > 0;
}
