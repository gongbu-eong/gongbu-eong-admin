import { screenSql, trafficFactsCtes } from "./analytics-facts";
import { query } from "@/features/admin/server/db";
import {
  ensureAnalyticsExclusionSchema,
  excludedEventCondition,
} from "@/features/admin/server/analytics-exclusion.repository";

export type ActivityLogQuery = {
  startDate?: string;
  endDate?: string;
  userId?: string;
  allDates?: boolean;
  limit?: number;
  event?: string;
  eventType?: string;
  cohort?: "job_visitor" | "job_activity" | "job_returning";
  bannerKey?: string;
  screen?: string;
  keyword?: string;
  ip?: string;
  channel?: string;
  unique?: string;
  from?: string;
  page?: string;
};

export type ActivityLogData = {
  startDate: string;
  endDate: string;
  event: string;
  eventType: string;
  cohort: string;
  bannerKey: string;
  screen: string;
  keyword: string;
  ip: string;
  channel: string;
  uniqueOnly: boolean;
  from: string;
  page: number;
  totalPages: number;
  totalCount: number;
  rows: ActivityLogRow[];
};

export type ActivityLogRow = {
  id: string;
  eventAt: string;
  event: string;
  userName: string;
  userEmail: string;
  identity: string;
  ipAddress: string;
  path: string;
  detail: string;
  device: "웹" | "모바일" | "알 수 없음";
};

type ActivityLogDbRow = {
  id: string;
  event_at: string;
  event_type: string | null;
  user_name: string | null;
  user_email: string | null;
  anonymous_id: string | null;
  session_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  path: string | null;
  detail: string | null;
  total_count: string;
};

const pageSize = 40;

function dateValue(value: string | undefined, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value as string : fallback;
}

function normalizeIp(value: string | undefined) {
  return (value || "").trim().split("/")[0] || "";
}

function isIpSearch(value: string) {
  return /^[0-9a-f:.]+(?:\/\d+)?$/i.test(value) && (value.includes(".") || value.includes(":"));
}

function getDeviceLabel(userAgent: string | null) {
  if (!userAgent) return "알 수 없음" as const;
  return /android|iphone|ipad|ipod|mobile|tablet|webos|blackberry/i.test(userAgent)
    ? "모바일"
    : "웹";
}

function defaultDates(args?: ActivityLogQuery) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = dateValue(args?.startDate, today);
  const end = dateValue(args?.endDate, today);
  return { startDate: start <= end ? start : end, endDate: start <= end ? end : start };
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatEvent(value: string | null) {
  if (!value) return "기타 이벤트";
  const labels: Record<string, string> = {
    page_view: "방문",
    screen_click: "화면 요소 클릭",
    screen_change: "화면 입력·변경",
    screen_submit: "화면 제출",
    community_post_view: "커뮤니티 글 열람",
    banner_impression: "배너 노출",
    banner_click: "배너·버튼 클릭",
    bookmark_click: "찜 클릭",
    apply_click: "지원 클릭",
    api_action: "기능 실행",
    api_data_view: "내부 데이터 조회",
    job_detail_apply_click: "공고 지원 클릭",
    job_detail_bookmark_click: "공고 찜 클릭",
    diagnosis_start: "진단 시작",
    diagnosis_complete: "진단 완료",
    diagnosis_result_view: "진단 결과 열람",
    login_success: "로그인 성공",
    login_failed: "로그인 실패",
    attribution_capture: "유입 기록",
    entry: "최초 진입",
    coaching_start: "코칭 시작",
    coaching_complete: "코칭 완료",
    interview_coaching_start: "면접 코칭 시작",
    interview_coaching_answer: "면접 답변 제출",
    interview_coaching_complete: "면접 코칭 완료",
    job_detail_visitor: "공고 상세 방문자",
    job_detail_followup_visitor: "공고 상세 후속 행동 방문자",
    job_detail_returning_visitor: "공고 상세 재방문자",
  };
  return labels[value] || value;
}

function mapActivityRows(rows: ActivityLogDbRow[]): ActivityLogRow[] {
  return rows.map((row) => ({
    id: row.id,
    eventAt: formatDateTime(row.event_at),
    event: formatEvent(row.event_type),
    userName: row.user_name || "비회원",
    userEmail: row.user_email || "",
    identity: row.anonymous_id || row.session_id || "회원 식별됨",
    ipAddress: row.ip_address || "-",
    path: row.path || "-",
    detail: row.detail || "-",
    device: getDeviceLabel(row.user_agent),
  }));
}

function jobCohortSql() {
  const trafficCtes = trafficFactsCtes(
    "($1::date AT TIME ZONE 'Asia/Seoul')",
    "(($2::date + 1) AT TIME ZONE 'Asia/Seoul')",
  );

  return `
    WITH ${trafficCtes},
    job_visits AS (
      SELECT DISTINCT ON (p.day, p.visitor_key)
        p.id,
        p.user_id,
        p.anonymous_id,
        p.event_at,
        p.day,
        p.path,
        p.ip_address,
        p.user_agent,
        p.visitor_key,
        p.channel
      FROM analytics_pages p
      WHERE p.visitor_key IS NOT NULL
        AND p.screen = 'job_detail'
        AND p.day BETWEEN $1::date AND $2::date
      ORDER BY p.day, p.visitor_key, p.event_at, p.id
    ),
    followup_visitors AS (
      SELECT DISTINCT ON ((s.last_job_at AT TIME ZONE 'Asia/Seoul')::date, s.visitor_key)
        s.id,
        s.event_at,
        s.path,
        s.event_type,
        (s.last_job_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        s.visitor_key
      FROM analytics_session_flags s
      WHERE s.last_job_at IS NOT NULL
        AND s.event_at >= s.last_job_at
        AND (s.event_type = 'page_view' OR s.event_type LIKE '%click%' OR s.event_type LIKE '%start%' OR s.event_type LIKE '%complete%')
        AND (s.last_job_at AT TIME ZONE 'Asia/Seoul')::date BETWEEN $1::date AND $2::date
      ORDER BY (s.last_job_at AT TIME ZONE 'Asia/Seoul')::date, s.visitor_key, s.event_at, s.id
    ),
    cohort_rows AS (
      SELECT
        'job-visitor:' || v.day::text || ':' || v.visitor_key AS id,
        v.event_at,
        'job_detail_visitor' AS event_type,
        v.user_id,
        v.anonymous_id,
        NULL::uuid AS session_id,
        v.ip_address,
        v.user_agent,
        v.path,
        '공고 상세 방문자' AS detail,
        v.channel
      FROM job_visits v
      WHERE $6::text = 'job_visitor'
      UNION ALL
      SELECT
        'job-followup:' || f.day::text || ':' || f.visitor_key AS id,
        f.event_at,
        'job_detail_followup_visitor' AS event_type,
        v.user_id,
        v.anonymous_id,
        NULL::uuid AS session_id,
        v.ip_address,
        v.user_agent,
        f.path,
        f.event_type AS detail,
        v.channel
      FROM followup_visitors f
      JOIN job_visits v ON v.day = f.day AND v.visitor_key = f.visitor_key
      WHERE $6::text = 'job_activity'
      UNION ALL
      SELECT
        'job-returning:' || v.day::text || ':' || v.visitor_key AS id,
        v.event_at,
        'job_detail_returning_visitor' AS event_type,
        v.user_id,
        v.anonymous_id,
        NULL::uuid AS session_id,
        v.ip_address,
        v.user_agent,
        v.path,
        '이전 30일 이내 방문 이력' AS detail,
        v.channel
      FROM job_visits v
      JOIN analytics_job_users j ON j.day = v.day AND j.visitor_key = v.visitor_key
      WHERE $6::text = 'job_returning' AND j.returning
    )
    SELECT
      c.id,
      c.event_at,
      c.event_type,
      COALESCE(u.nickname, u.display_name) AS user_name,
      u.email::text AS user_email,
      c.anonymous_id,
      c.session_id,
      c.ip_address,
      c.user_agent,
      c.path,
      c.detail,
      COUNT(*) OVER()::text AS total_count
    FROM cohort_rows c
    LEFT JOIN public.users u ON u.id = c.user_id
    WHERE ($3::text = '' OR c.channel = CASE $3::text
      WHEN 'instagram' THEN '인스타그램'
      WHEN 'blog' THEN '블로그'
      WHEN 'threads' THEN '스레드'
      WHEN 'search' THEN '검색'
      WHEN 'direct' THEN '직접유입'
      ELSE $3::text END)
    ORDER BY c.event_at DESC, c.id DESC
    LIMIT $4 OFFSET $5`;
}

export async function getActivityLogData(args?: ActivityLogQuery): Promise<ActivityLogData> {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const { startDate, endDate } = args?.allDates
    ? { startDate: "1970-01-01", endDate: today }
    : defaultDates(args);
  const requestedEvent = args?.event || "activity";
  const event = requestedEvent === "page_view" ? "visit" : requestedEvent;
  const eventType = /^[a-z0-9][a-z0-9_.:-]{1,99}$/i.test(args?.eventType || "")
    ? args?.eventType || ""
    : "";
  const cohort = args?.cohort && ["job_visitor", "job_activity", "job_returning"].includes(args.cohort)
    ? args.cohort
    : "";
  const screen = args?.screen === "coaching" ? "resume_coaching" : args?.screen || "all";
  const bannerKey = args?.bannerKey || "";
  const keyword = (args?.keyword || "").trim();
  const ip = normalizeIp(args?.ip);
  const keywordIp = isIpSearch(keyword) ? normalizeIp(keyword) : "";
  const channel = args?.channel || "all";
  const from = args?.from || "";
  const uniqueOnly = args?.unique === "1";
  const userId = args?.userId || null;
  const resultPageSize = Math.min(10000, Math.max(1, Number(args?.limit || pageSize)));
  const page = Math.max(1, Number(args?.page || 1));
  const pattern = keyword ? `%${keyword}%` : "";
  const offset = (page - 1) * resultPageSize;
  await ensureAnalyticsExclusionSchema();

  if (cohort) {
    const cohortResult = await query<ActivityLogDbRow>(jobCohortSql(), [
      startDate,
      endDate,
      channel === "all" ? "" : channel,
      resultPageSize,
      offset,
      cohort,
    ]);
    const totalCount = Number(cohortResult.rows[0]?.total_count || 0);

    return {
      startDate,
      endDate,
      event,
      eventType,
      cohort,
      bannerKey,
      screen,
      keyword,
      ip,
      channel,
      uniqueOnly,
      from,
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      totalCount,
      rows: mapActivityRows(cohortResult.rows),
    };
  }

  const eventsSql = `
    WITH raw_events AS (
      SELECT
        access.id::text AS id,
        access.created_at AS event_at,
        access.event_name AS event_type,
        'access'::text AS event_source,
        access.user_id,
        access.anonymous_id,
        access.session_id,
        SPLIT_PART(access.ip_address::text, '/', 1) AS ip_address,
        access.user_agent,
        COALESCE(access.user_id::text, access.anonymous_id::text) AS visitor_key,
        access.path AS path,
        COALESCE(
          NULLIF(access.traffic_channel, ''),
          NULLIF(access.metadata->>'trafficChannel', ''),
          NULLIF(substring(access.path from '[?&]utm_source=([^&]+)'), ''),
          CASE
            WHEN access.referrer ILIKE '%gongbueong.career.co.kr%' OR access.referrer ILIKE '%localhost%' THEN NULL
            ELSE NULLIF(access.referrer, '')
          END,
          'direct'
        ) AS source_value,
        COALESCE(access.title, access.screen_key, access.traffic_channel, access.referrer) AS detail,
        COALESCE(NULLIF(access.screen_key, ''), access.metadata->>'screenKey') AS screen_key,
        NULL::text AS banner_key
      FROM public.access_logs access
      WHERE access.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND access.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR access.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(access.ip_address::text, '/', 1) = $10::text)
        AND ${excludedEventCondition("access.user_id", "access.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        -- Activity logs from different collectors must share one clock.
        -- Use the server persistence time so a page visit and the following
        -- product event cannot be reordered by client clock/network delay.
        events.created_at,
        events.event_type,
        'product'::text,
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(NULLIF(events.properties->>'ip_address', ''), '/', 1),
        NULLIF(events.properties->>'user_agent', ''),
        COALESCE(
          events.user_id::text,
          events.anonymous_id::text,
          NULLIF(CONCAT_WS('|', SPLIT_PART(NULLIF(events.properties->>'ip_address', ''), '/', 1), NULLIF(events.properties->>'user_agent', '')), '')
        ),
        COALESCE(events.properties->>'path', events.properties->>'screenKey', events.properties->>'targetPath'),
        COALESCE(NULLIF(events.properties->>'traffic_channel', ''), NULLIF(events.properties->>'source', ''), 'direct'),
        COALESCE(
          NULLIF(events.properties->>'banner_name', ''),
          NULLIF(events.properties->>'element_text', ''),
          NULLIF(events.properties->>'api_path', ''),
          NULLIF(events.properties->>'targetPath', ''),
          NULLIF(events.properties->>'title', ''),
          events.event_type
        ),
        events.properties->>'screenKey',
        CASE
          WHEN events.event_type = 'banner_click' THEN NULLIF(events.properties->>'banner_key', '')
          WHEN events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click') THEN events.event_type
        END
      FROM public.product_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.properties->>'ip_address', '/', 1) = $10::text)
        AND ${excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        events.event_name,
        'attribution'::text,
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        NULL::text,
        COALESCE(events.user_id::text, events.anonymous_id::text, events.id::text),
        events.landing_path,
        COALESCE(events.source, events.medium, events.campaign, events.referrer),
        COALESCE(events.source, events.medium, events.campaign, events.referrer),
        NULL::text,
        NULL::text
      FROM public.attribution_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        CASE WHEN events.success THEN 'login_success' ELSE 'login_failed' END,
        'auth'::text,
        events.user_id,
        NULL::uuid,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        NULL::text,
        COALESCE(events.user_id::text, events.id::text),
        '/login',
        'login',
        COALESCE(events.provider::text, events.failure_reason),
        'login',
        NULL::text
      FROM public.auth_login_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        'entry',
        'entry'::text,
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        NULL::text,
        COALESCE(events.user_id::text, events.anonymous_id::text, events.id::text),
        events.landing_path,
        COALESCE(events.campaign_source, events.campaign_medium, events.campaign_name),
        COALESCE(events.campaign_source, events.campaign_medium, events.campaign_name),
        NULL::text,
        NULL::text
      FROM public.user_entry_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
    ), daily_channels AS (
      SELECT DISTINCT ON ((event_at AT TIME ZONE 'Asia/Seoul')::date, visitor_key)
        (event_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        visitor_key,
        source_value
      FROM raw_events
      WHERE event_source = 'access'
        AND event_type = 'page_view'
        AND visitor_key IS NOT NULL
      ORDER BY (event_at AT TIME ZONE 'Asia/Seoul')::date, visitor_key, event_at, id
    ), normalized AS (
      SELECT
        raw_events.*,
        users.nickname,
        users.display_name,
        users.email::text AS email,
        COALESCE(raw_events.anonymous_id::text, raw_events.session_id::text) AS identity,
        ${screenSql("split_part(raw_events.path, '?', 1)") } AS normalized_screen_key,
        CASE
          WHEN COALESCE(daily_channels.source_value, raw_events.source_value) IN ('블로그', 'blog') OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%blog%' THEN 'blog'
          WHEN COALESCE(daily_channels.source_value, raw_events.source_value) IN ('인스타그램', 'instagram') OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%instagram%' THEN 'instagram'
          WHEN COALESCE(daily_channels.source_value, raw_events.source_value) IN ('스레드', 'threads') OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%thread%' THEN 'threads'
          WHEN COALESCE(daily_channels.source_value, raw_events.source_value) IN ('검색', 'search') OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%google%' OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%naver%' OR COALESCE(daily_channels.source_value, raw_events.source_value) ILIKE '%daum%' THEN 'search'
          ELSE 'direct'
        END AS acquisition_channel
      FROM raw_events
      LEFT JOIN public.users users ON users.id = raw_events.user_id
      LEFT JOIN daily_channels
        ON daily_channels.day = (raw_events.event_at AT TIME ZONE 'Asia/Seoul')::date
        AND daily_channels.visitor_key = raw_events.visitor_key
    )
  `;
  const whereSql = `
    WHERE ($3::text = 'activity' AND (
      (event_source = 'access' AND event_type = 'page_view') OR
      (event_source = 'product' AND event_type NOT IN ('api_data_view', 'api_action', 'banner_impression', 'attribution_capture', 'entry')) OR
      event_source = 'auth'
    ) OR $3::text = 'all' OR
      ($3::text = 'visit' AND event_source = 'access' AND event_type = 'page_view') OR
      ($3::text = 'product' AND event_source = 'product' AND event_type NOT IN ('page_view', 'api_data_view', 'api_action', 'banner_impression', 'attribution_capture', 'entry', 'login_success', 'login_failed')) OR
      ($3::text = 'attribution' AND event_type = 'attribution_capture') OR
      ($3::text = 'login' AND event_type LIKE 'login_%') OR
      ($3::text = 'entry' AND event_type = 'entry'))
    AND ($4::text = 'all' OR normalized_screen_key = $4::text OR ($4::text = 'ai_tools' AND path LIKE '/ai-tools%'))
    AND ($5::text = 'all' OR acquisition_channel = $5::text)
    AND ($9::text = '' OR event_type = $9::text)
    AND (
      ($10::text <> '' AND ip_address = $10::text) OR
      ($10::text = '' AND (
        $6::text = '' OR path ILIKE $6::text OR detail ILIKE $6::text OR
        ip_address ILIKE $6::text OR identity ILIKE $6::text OR
        nickname ILIKE $6::text OR display_name ILIKE $6::text OR email ILIKE $6::text
      ))
    )
    AND ($7::text = '' OR ip_address = $7::text)
    AND ($8::text = '' OR (event_source = 'product' AND banner_key = $8::text))
  `;
  const baseParams = [startDate, endDate, event, screen, channel, pattern, ip, bannerKey, eventType, keywordIp, userId];
  const sourceSql = uniqueOnly
      ? `${eventsSql}, filtered AS (
        SELECT normalized.*,
          ROW_NUMBER() OVER (
            PARTITION BY (event_at AT TIME ZONE 'Asia/Seoul')::date,
              COALESCE(anonymous_id::text, user_id::text, session_id::text, ip_address)
            ORDER BY event_at ASC, id ASC
          ) AS visitor_rank
        FROM normalized
        ${whereSql} AND COALESCE(anonymous_id::text, user_id::text, session_id::text, ip_address) IS NOT NULL
      )`
    : eventsSql;
  const rowsSource = uniqueOnly
    ? "filtered WHERE visitor_rank = 1"
    : `normalized ${whereSql}`;
  const rowsResult = await query<ActivityLogDbRow>(`${sourceSql}
    SELECT id, event_at, event_type, COALESCE(nickname, display_name) AS user_name,
      email AS user_email, anonymous_id, session_id, ip_address, user_agent, path, detail,
      COUNT(*) OVER()::text AS total_count
    FROM ${rowsSource}
    ORDER BY event_at DESC, id DESC
    LIMIT $12 OFFSET $13`, [...baseParams, resultPageSize, offset]);
  const totalCount = Number(rowsResult.rows[0]?.total_count || 0);

  return {
    startDate,
    endDate,
    event,
    eventType,
    cohort,
    bannerKey,
    screen,
    keyword,
    ip,
    channel,
    uniqueOnly,
    from,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / resultPageSize)),
    totalCount,
    rows: mapActivityRows(rowsResult.rows),
  };
}
