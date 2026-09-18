import { query } from "@/features/admin/server/db";
import {
  ensureAnalyticsExclusionSchema,
  excludedEventCondition,
} from "@/features/admin/server/analytics-exclusion.repository";

export type ActivityLogQuery = {
  startDate?: string;
  endDate?: string;
  event?: string;
  screen?: string;
  keyword?: string;
  ip?: string;
  page?: string;
};

export type ActivityLogData = {
  startDate: string;
  endDate: string;
  event: string;
  screen: string;
  keyword: string;
  ip: string;
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
  path: string | null;
  detail: string | null;
};

const pageSize = 40;

function dateValue(value: string | undefined, fallback: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "") ? value as string : fallback;
}

function normalizeIp(value: string | undefined) {
  return (value || "").trim().split("/")[0] || "";
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
    banner_impression: "배너 노출",
    banner_click: "배너·버튼 클릭",
    bookmark_click: "찜 클릭",
    apply_click: "지원 클릭",
    diagnosis_start: "진단 시작",
    diagnosis_complete: "진단 완료",
    diagnosis_result_view: "진단 결과 열람",
    login_success: "로그인 성공",
    login_failed: "로그인 실패",
    attribution_capture: "유입 기록",
    entry: "최초 진입",
  };
  return labels[value] || value;
}

export async function getActivityLogData(args?: ActivityLogQuery): Promise<ActivityLogData> {
  const { startDate, endDate } = defaultDates(args);
  const requestedEvent = args?.event || "visit";
  const event = requestedEvent === "page_view" ? "visit" : requestedEvent;
  const screen = args?.screen || "all";
  const keyword = (args?.keyword || "").trim();
  const ip = normalizeIp(args?.ip);
  const page = Math.max(1, Number(args?.page || 1));
  const pattern = keyword ? `%${keyword}%` : "";
  const offset = (page - 1) * pageSize;
  await ensureAnalyticsExclusionSchema();

  const eventsSql = `
    WITH raw_events AS (
      SELECT
        access.id::text AS id,
        access.created_at AS event_at,
        access.event_name AS event_type,
        access.user_id,
        access.anonymous_id,
        access.session_id,
        SPLIT_PART(access.ip_address::text, '/', 1) AS ip_address,
        COALESCE(access.canonical_path, access.path) AS path,
        COALESCE(access.title, access.screen_key, access.traffic_channel, access.referrer) AS detail,
        COALESCE(NULLIF(access.screen_key, ''), access.metadata->>'screenKey') AS screen_key
      FROM public.access_logs access
      WHERE access.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND access.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ${excludedEventCondition("access.user_id", "access.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        events.event_type,
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(NULLIF(events.properties->>'ip_address', ''), '/', 1),
        COALESCE(events.properties->>'path', events.properties->>'screenKey', events.properties->>'targetPath'),
        COALESCE(events.properties->>'banner_name', events.properties->>'title', events.properties::text),
        events.properties->>'screenKey'
      FROM public.product_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ${excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        events.event_name,
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        events.landing_path,
        COALESCE(events.source, events.medium, events.campaign, events.referrer),
        NULL::text
      FROM public.attribution_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        CASE WHEN events.success THEN 'login_success' ELSE 'login_failed' END,
        events.user_id,
        NULL::uuid,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        '/login',
        COALESCE(events.provider::text, events.failure_reason),
        'login'
      FROM public.auth_login_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
      UNION ALL
      SELECT
        events.id::text,
        events.created_at,
        'entry',
        events.user_id,
        events.anonymous_id,
        NULL::uuid,
        SPLIT_PART(events.ip_address::text, '/', 1),
        events.landing_path,
        COALESCE(events.campaign_source, events.campaign_medium, events.campaign_name),
        NULL::text
      FROM public.user_entry_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ${excludedEventCondition("events.user_id", "events.ip_address")}
    ), normalized AS (
      SELECT
        raw_events.*,
        users.nickname,
        users.display_name,
        users.email::text AS email,
        COALESCE(raw_events.anonymous_id::text, raw_events.session_id::text) AS identity
      FROM raw_events
      LEFT JOIN public.users users ON users.id = raw_events.user_id
    )
  `;
  const whereSql = `
    WHERE ($3::text = 'all' OR
      ($3::text = 'visit' AND event_type = 'page_view') OR
      ($3::text = 'product' AND event_type NOT IN ('page_view', 'attribution_capture', 'entry', 'login_success', 'login_failed')) OR
      ($3::text = 'attribution' AND event_type = 'attribution_capture') OR
      ($3::text = 'login' AND event_type LIKE 'login_%') OR
      ($3::text = 'entry' AND event_type = 'entry'))
    AND ($4::text = 'all' OR screen_key ILIKE '%' || $4::text || '%' OR path ILIKE '%' || $4::text || '%')
    AND (
      $5::text = '' OR path ILIKE $5::text OR detail ILIKE $5::text OR
      ip_address ILIKE $5::text OR identity ILIKE $5::text OR
      nickname ILIKE $5::text OR display_name ILIKE $5::text OR email ILIKE $5::text
    )
    AND ($6::text = '' OR ip_address = $6::text)
  `;
  const [countResult, rowsResult] = await Promise.all([
    query<{ count: string }>(`${eventsSql} SELECT COUNT(*)::text AS count FROM normalized ${whereSql}`, [startDate, endDate, event, screen, pattern, ip]),
    query<ActivityLogDbRow>(`${eventsSql} SELECT id, event_at, event_type, COALESCE(nickname, display_name) AS user_name, email AS user_email, anonymous_id, session_id, ip_address, path, detail FROM normalized ${whereSql} ORDER BY event_at DESC LIMIT $7 OFFSET $8`, [startDate, endDate, event, screen, pattern, ip, pageSize, offset]),
  ]);
  const totalCount = Number(countResult.rows[0]?.count || 0);

  return {
    startDate,
    endDate,
    event,
    screen,
    keyword,
    ip,
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
    totalCount,
    rows: rowsResult.rows.map((row) => ({
      id: row.id,
      eventAt: formatDateTime(row.event_at),
      event: formatEvent(row.event_type),
      userName: row.user_name || "비회원",
      userEmail: row.user_email || "",
      identity: row.anonymous_id || row.session_id || "회원 식별됨",
      ipAddress: row.ip_address || "-",
      path: row.path || "-",
      detail: row.detail || "-",
    })),
  };
}
