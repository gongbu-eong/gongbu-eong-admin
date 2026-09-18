import { query } from "@/features/admin/server/db";

export type MemberStatusFilter = "all" | "active" | "blocked";
export type MemberChannelFilter =
  | "all"
  | "instagram"
  | "blog"
  | "threads"
  | "search"
  | "direct";

export type MemberDetailTab =
  | "overview"
  | "diagnosis"
  | "resume-coaching"
  | "interview-coaching"
  | "community"
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
  diagnosisCount: number;
  resumeCoachingCount: number;
  interviewCoachingCount: number;
  postCount: number;
  commentCount: number;
};

export type MemberDiagnosis = {
  id: string;
  date: string;
  title: string;
  result: string;
  detail: unknown;
};

export type MemberResumeCoaching = {
  id: string;
  date: string;
  title: string;
  result: string;
  inputText: string;
  inputType: string;
  sourceFilename: string;
  sourceFileUrl: string;
  detail: unknown;
};

export type MemberInterviewCoaching = {
  id: string;
  date: string;
  title: string;
  result: string;
  status: string;
  materialFilename: string;
  materialFileAvailable: boolean;
  detail: unknown;
};

export type MemberCommunityActivity = {
  id: string;
  postId: string;
  date: string;
  kind: string;
  title: string;
  content: string;
  status: string;
  href: string;
};

export type MemberLog = {
  id: string;
  actor: string;
  kind: string;
  target: string;
  detail: string;
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
  diagnosis: MemberDiagnosis[];
  resumeCoachings: MemberResumeCoaching[];
  interviewCoachings: MemberInterviewCoaching[];
  community: MemberCommunityActivity[];
  logs: MemberLog[];
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
  coaching_members: string;
};

type DiagnosisRow = {
  id: string;
  date_value: string | Date | null;
  title: string | null;
  result: string | null;
  detail: unknown;
};

type ResumeCoachingRow = {
  id: string;
  date_value: string | Date | null;
  title: string | null;
  score: string | number | null;
  input_text: string | null;
  input_type: string | null;
  source_filename: string | null;
  source_file_url: string | null;
  detail: unknown;
};

type CommunityRow = {
  id: string;
  post_id: string;
  date_value: string | Date | null;
  kind: string | null;
  title: string | null;
  content: string | null;
  status: string | null;
};

type InterviewCoachingRow = {
  id: string;
  date_value: string | Date | null;
  title: string | null;
  status: string | null;
  material_filename: string | null;
  material_file_available: boolean | null;
  detail: unknown;
};

type LogRow = {
  id: string;
  actor: string | null;
  kind: string | null;
  target: string | null;
  detail: string | null;
  occurred_at: string | Date | null;
};

const pageSize = 10;

export function normalizeMemberTab(value?: string | null): MemberDetailTab {
  if (
    value === "diagnosis" ||
    value === "resume-coaching" ||
    value === "interview-coaching" ||
    value === "community" ||
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

function formatInterviewStatus(value: string | null) {
  if (value === "completed") return "완료";
  if (value === "ready") return "질문 준비 완료";
  if (value === "draft") return "작성 중";
  if (value === "failed") return "실패";
  return value || "-";
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
  if (value.includes("coaching")) return "AI NCS 자소서 코칭";
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
  if (value === "active" || value === "blocked") {
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
    ) posts ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS comment_count
      FROM public.community_comments comments
      WHERE comments.user_id = users.id
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
          COUNT(DISTINCT coaching.user_id) AS coaching_members
        FROM public.users users
        LEFT JOIN public.diagnosis_results diagnosis ON diagnosis.user_id = users.id
        LEFT JOIN (
          SELECT user_id FROM public.resume_coaching_requests WHERE user_id IS NOT NULL
          UNION
          SELECT user_id FROM public.interview_coaching_sessions WHERE user_id IS NOT NULL
        ) coaching ON coaching.user_id = users.id
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
  const coachingMembers = numberValue(metrics?.coaching_members);
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
        label: "AI 코칭 경험 회원",
        value: formatNumber(coachingMembers),
        unit: "명",
        note: `전체의 ${totalMembers > 0 ? Math.round((coachingMembers / totalMembers) * 100) : 0}%`,
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
    diagnosis: [],
    resumeCoachings: [],
    interviewCoachings: [],
    community: [],
    logs: [],
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

  const [
    diagnosisResult,
    resumeCoachingResult,
    communityResult,
    interviewCoachingResult,
    logResult,
  ] = await Promise.all([
    query<DiagnosisRow>(
      `
        SELECT
          results.id,
          results.created_at AS date_value,
          COALESCE(types.name, '강점·성향 진단') AS title,
          COALESCE(results.summary, types.name, '결과 확인') AS result,
          jsonb_build_object(
            'totalScore', results.total_score,
            'stabilityScore', results.stability_score,
            'challengeScore', results.challenge_score,
            'analyticalScore', results.analytical_score,
            'collaborationScore', results.collaboration_score,
            'leadershipScore', results.leadership_score,
            'publicServiceScore', results.public_service_score,
            'strengths', results.strengths,
            'weaknesses', results.weaknesses,
            'summary', results.summary,
            'rawResult', results.raw_result
          ) AS detail
        FROM public.diagnosis_results results
        LEFT JOIN public.personality_types types ON types.id = results.personality_type_id
        WHERE results.user_id = $1::uuid
        ORDER BY results.created_at DESC
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
          results.score,
          requests.input_text,
          requests.input_type,
          COALESCE(requests.source_filename, files.original_filename) AS source_filename,
          COALESCE(files.public_url, '') AS source_file_url,
          jsonb_build_object(
            'feedback', results.feedback,
            'correctedText', results.corrected_text,
            'job', requests.job_posting_snapshot,
            'model', results.model_name
          ) AS detail,
          results.id
        FROM public.resume_coaching_requests requests
        LEFT JOIN public.resume_coaching_results results ON results.request_id = requests.id
        LEFT JOIN public.user_files files ON files.id = requests.source_file_id
        WHERE requests.user_id = $1::uuid
        ORDER BY requests.created_at DESC, results.created_at DESC NULLS LAST
      `,
      [memberRow.id],
    ),
    query<CommunityRow>(
      `
        SELECT created_at AS date_value, '게시글' AS kind, title, status
        , id, id AS post_id, content
        FROM public.community_posts
        WHERE user_id = $1::uuid
        UNION ALL
        SELECT comments.created_at AS date_value,
          CASE WHEN comments.parent_comment_id IS NULL THEN '댓글' ELSE '대댓글' END AS kind,
          posts.title, comments.status, comments.id, comments.post_id, comments.content
        FROM public.community_comments comments
        JOIN public.community_posts posts ON posts.id = comments.post_id
        WHERE comments.user_id = $1::uuid
        ORDER BY date_value DESC
      `,
      [memberRow.id],
    ),
    query<InterviewCoachingRow>(
      `
        SELECT
          sessions.id,
          sessions.started_at AS date_value,
          COALESCE(NULLIF(CONCAT_WS(' · ', sessions.company_name, sessions.position_name), ''), 'AI NCS 면접 코칭') AS title,
          sessions.status,
          sessions.material_filename,
          (sessions.material_file_data IS NOT NULL) AS material_file_available,
          jsonb_build_object(
            'company', sessions.company_name,
            'position', sessions.position_name,
            'duty', sessions.duty_text,
            'status', sessions.status,
            'analysis', sessions.analysis,
            'questions', sessions.questions,
            'result', sessions.result,
            'messages', COALESCE((
              SELECT jsonb_agg(to_jsonb(messages) ORDER BY messages.message_order)
              FROM public.interview_coaching_messages messages
              WHERE messages.session_id = sessions.id
            ), '[]'::jsonb)
          ) AS detail
        FROM public.interview_coaching_sessions sessions
        WHERE sessions.user_id = $1::uuid
        ORDER BY sessions.started_at DESC
      `,
      [memberRow.id],
    ),
    query<LogRow>(
      `
        SELECT *
        FROM (
          SELECT
            users.id::text AS id,
            '시스템' AS actor,
            'signup' AS kind,
            '/signup' AS target,
            users.email::text AS detail,
            COALESCE(users.signup_completed_at, users.created_at) AS occurred_at
          FROM public.users users
          WHERE users.id = $1::uuid
          UNION ALL
          SELECT id::text, '사용자', CASE WHEN success THEN 'login_success' ELSE 'login_failed' END,
            COALESCE(entry_source::text, 'login'), COALESCE(failure_reason, provider::text), created_at
          FROM public.auth_login_events
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT id::text, '사용자', event_name, COALESCE(canonical_path, path),
            COALESCE(title, screen_key, traffic_channel), created_at
          FROM public.access_logs
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT id::text, '사용자', 'entry', COALESCE(landing_path, entry_source::text),
            campaign_source, created_at
          FROM public.user_entry_events
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT
            id::text,
            '시스템' AS actor,
            event_name AS kind,
            COALESCE(landing_path, landing_url, referrer) AS target,
            COALESCE(source, medium, campaign) AS detail,
            created_at AS occurred_at
          FROM public.attribution_events
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT
            id::text,
            '시스템' AS actor,
            event_type AS kind,
            COALESCE(
              properties->>'path',
              properties->>'title',
              diagnosis_result_id::TEXT,
              diagnosis_run_id::TEXT
            ) AS target,
            properties::text AS detail,
            created_at AS occurred_at
          FROM public.product_events
          WHERE user_id = $1::uuid
          UNION ALL
          SELECT results.id::text, '시스템', 'diagnosis_complete', results.id::text,
            COALESCE(results.summary, types.name), results.created_at
          FROM public.diagnosis_results results
          LEFT JOIN public.personality_types types ON types.id = results.personality_type_id
          WHERE results.user_id = $1::uuid
          UNION ALL
          SELECT results.id::text, '시스템', 'resume_coaching_complete', results.id::text,
            requests.source_filename, results.created_at
          FROM public.resume_coaching_results results
          JOIN public.resume_coaching_requests requests ON requests.id = results.request_id
          WHERE requests.user_id = $1::uuid
          UNION ALL
          SELECT sessions.id::text, '시스템', 'interview_coaching', sessions.id::text,
            COALESCE(sessions.position_name, sessions.company_name), sessions.started_at
          FROM public.interview_coaching_sessions sessions
          WHERE sessions.user_id = $1::uuid
          UNION ALL
          SELECT posts.id::text, '사용자', 'community_post', posts.id::text,
            posts.title, posts.created_at
          FROM public.community_posts posts
          WHERE posts.user_id = $1::uuid
          UNION ALL
          SELECT comments.id::text, '사용자',
            CASE WHEN comments.parent_comment_id IS NULL THEN 'community_comment' ELSE 'community_reply' END,
            comments.post_id::text, comments.content, comments.created_at
          FROM public.community_comments comments
          WHERE comments.user_id = $1::uuid
        ) logs
        ORDER BY occurred_at ASC, id ASC
      `,
      [memberRow.id],
    ),
  ]);

  return {
    member: toMemberSummary(memberRow),
    diagnosis: diagnosisResult.rows.map((row) => ({
      id: row.id,
      date: formatShortDate(row.date_value),
      title: row.title || "강점·성향 진단",
      result: row.result || "결과 확인",
      detail: row.detail,
    })),
    resumeCoachings: resumeCoachingResult.rows.map((row) => ({
      id: row.id,
      date: formatShortDate(row.date_value),
      title: row.title || "자소서 코칭",
      result: row.score === null || row.score === undefined ? "결과 확인" : `${row.score}점`,
      inputText: row.input_text || "",
      inputType: row.input_type || "text",
      sourceFilename: row.source_filename || "",
      sourceFileUrl: row.source_file_url || "",
      detail: row.detail,
    })),
    interviewCoachings: interviewCoachingResult.rows.map((row) => ({
      id: row.id,
      date: formatShortDate(row.date_value),
      title: row.title || "AI NCS 면접 코칭",
      result: row.status === "completed" ? "완료" : formatInterviewStatus(row.status),
      status: row.status || "-",
      materialFilename: row.material_filename || "",
      materialFileAvailable: Boolean(row.material_file_available),
      detail: row.detail,
    })),
    community: communityResult.rows.map((row) => ({
      id: row.id,
      postId: row.post_id,
      date: formatShortDate(row.date_value),
      kind: row.kind || "-",
      title: row.title || "-",
      content: row.content || "",
      status: formatCommunityStatus(row.status),
      href: `/community/${row.post_id}${row.kind === "게시글" ? "" : `#comment-${row.id}`}`,
    })),
    logs: logResult.rows.map((row) => ({
      id: row.id,
      actor: row.actor || "시스템",
      kind: formatKind(row.kind),
      target: formatTarget(row.target),
      detail: row.detail || "",
      occurredAt: formatDateTime(row.occurred_at),
    })),
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
      `
        INSERT INTO public.oauth_login_restrictions (
          user_id,
          provider,
          provider_user_id,
          provider_email,
          status,
          restricted_until,
          reason,
          updated_at
        )
        SELECT
          accounts.user_id,
          accounts.provider,
          accounts.provider_user_id,
          accounts.provider_email,
          $2::public.user_status,
          CASE
            WHEN $2::text = 'blocked' THEN users.blocked_until
            ELSE users.rejoin_blocked_until
          END,
          CASE
            WHEN $2::text = 'blocked' THEN 'admin_block'
            ELSE 'admin_forced_withdrawal'
          END,
          NOW()
        FROM public.user_oauth_accounts accounts
        JOIN public.users users ON users.id = accounts.user_id
        WHERE accounts.user_id = $1::uuid
        ON CONFLICT (provider, provider_user_id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          provider_email = EXCLUDED.provider_email,
          status = EXCLUDED.status,
          restricted_until = EXCLUDED.restricted_until,
          reason = EXCLUDED.reason,
          updated_at = NOW()
      `,
      [userId, status],
    );

    await query(
      "DELETE FROM public.user_sessions WHERE user_id = $1::uuid",
      [userId],
    );
  } else if ((result.rowCount || 0) > 0) {
    await query(
      "DELETE FROM public.oauth_login_restrictions WHERE user_id = $1::uuid",
      [userId],
    );
  }

  return (result.rowCount || 0) > 0;
}
