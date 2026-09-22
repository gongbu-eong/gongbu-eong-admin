import {
  nonAutomatedUserAgentCondition,
  screenSql,
  trafficChannelKeySql,
  trafficFactsCtes,
} from "./analytics-facts";
import { getFunnelLogData } from "./traffic.repository";
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
  cohort?: "job_entry" | "job_apply" | "job_move" | "job_exit" | "job_pending" | "job_returning";
  bannerKey?: string;
  screen?: string;
  keyword?: string;
  ip?: string;
  channel?: string;
  unique?: string;
  includeExcluded?: string;
  from?: string;
  funnelProduct?: string;
  funnelStep?: string;
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
  includeExcluded: boolean;
  from: string;
  funnelProduct: string;
  funnelStep: string;
  funnelLabel: string;
  page: number;
  totalPages: number;
  totalCount: number;
  userId: string;
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
  channel: string;
  screen: string;
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
  acquisition_channel: string | null;
  screen_key: string | null;
  total_count: string;
};

type DashboardFactDetailSelector = {
  scope: string;
  metric: string;
  channel: string;
  dimension: string;
  funnelLabel: string;
};

let factDetailSchemaCache: { ready: boolean; expiresAt: number } | null = null;
const factDetailReadinessCache = new Map<string, { ready: boolean; expiresAt: number }>();

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
    job_detail_entry_visitor: "공고 상세 첫 유입 방문자",
    job_detail_apply_visitor: "공고 상세 유입 후 지원",
    job_detail_move_visitor: "공고 상세 유입 후 다른 화면 이동",
    job_detail_exit_visitor: "공고 상세 유입 후 이탈",
    job_detail_pending_visitor: "공고 상세 유입 후 판정 대기",
    job_detail_returning_visitor: "공고 상세 재방문자",
  };
  return labels[value] || value;
}

function formatChannel(value: string | null) {
  const labels: Record<string, string> = {
    instagram: "인스타그램",
    blog: "블로그",
    threads: "스레드",
    search: "검색",
    direct: "직접유입",
    "인스타그램": "인스타그램",
    "블로그": "블로그",
    "스레드": "스레드",
    "검색": "검색",
    "직접유입": "직접유입",
  };
  return labels[value || ""] || "직접유입";
}

function formatScreen(value: string | null) {
  const labels: Record<string, string> = {
    home: "홈",
    jobs: "공고 목록",
    job_detail: "공고 상세",
    ai_tools: "AI 도구",
    resume_coaching: "AI NCS 자소서 코칭",
    interview_coaching: "AI NCS 면접 코칭",
    diagnosis: "강점·성향 진단",
    community: "커뮤니티",
    calendar: "캘린더",
    my: "마이페이지",
    login: "로그인",
    other: "기타",
  };
  return labels[value || ""] || "기타";
}

function screenKeyFromPath(path: string) {
  const pathname = path.split("?")[0];
  if (pathname === "/") return "home";
  if (pathname === "/jobs") return "jobs";
  if (/^\/jobs\/[^/]+/.test(pathname)) return "job_detail";
  if (pathname.startsWith("/ai-tools/interview-coaching")) return "interview_coaching";
  if (pathname.startsWith("/ai-tools/coaching")) return "resume_coaching";
  if (pathname.startsWith("/ai-tools")) return "ai_tools";
  if (pathname.startsWith("/events/diagnosis")) return "diagnosis";
  if (pathname.startsWith("/community")) return "community";
  if (pathname.startsWith("/calendar")) return "calendar";
  if (pathname.startsWith("/my")) return "my";
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) return "login";
  return "other";
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
    channel: formatChannel(row.acquisition_channel),
    screen: formatScreen(row.screen_key),
    device: getDeviceLabel(row.user_agent),
  }));
}

function jobCohortSql() {
  const trafficCtes = trafficFactsCtes(
    "($1::date AT TIME ZONE 'Asia/Seoul')",
    "(($2::date + 1) AT TIME ZONE 'Asia/Seoul')",
    "($1::date AT TIME ZONE 'Asia/Seoul')",
    "(($2::date + 1) AT TIME ZONE 'Asia/Seoul')",
  );

  return `
    WITH ${trafficCtes},
    job_people AS (
      SELECT people.*, page.user_id, page.anonymous_id, page.ip_address,
        page.user_agent, page.path AS entry_path
      FROM analytics_job_people people
      JOIN analytics_pages page ON 'p:' || page.id = people.entry_id
      WHERE people.day BETWEEN $1::date AND $2::date
    ),
    cohort_rows AS (
      SELECT
        'job-' || $6::text || ':' || people.day::text || ':' || people.visitor_key AS id,
        CASE WHEN people.outcome IN ('apply', 'move') THEN people.outcome_at ELSE people.session_start END AS event_at,
        CASE $6::text
          WHEN 'job_apply' THEN 'job_detail_apply_visitor'
          WHEN 'job_move' THEN 'job_detail_move_visitor'
          WHEN 'job_exit' THEN 'job_detail_exit_visitor'
          WHEN 'job_pending' THEN 'job_detail_pending_visitor'
          WHEN 'job_returning' THEN 'job_detail_returning_visitor'
          ELSE 'job_detail_entry_visitor'
        END AS event_type,
        people.user_id,
        people.anonymous_id,
        NULL::uuid AS session_id,
        people.ip_address,
        people.user_agent,
        CASE WHEN people.outcome = 'move' THEN people.outcome_path ELSE people.entry_path END AS path,
        CASE $6::text
          WHEN 'job_apply' THEN '첫 후속 결과: 지원 버튼 클릭'
          WHEN 'job_move' THEN '첫 후속 결과: 다른 화면 이동'
          WHEN 'job_exit' THEN '후속 지원 또는 화면 이동 없이 세션 종료'
          WHEN 'job_pending' THEN '세션 종료 전 판정 대기'
          WHEN 'job_returning' THEN '이전 30일 이내 방문 이력'
          ELSE '세션의 첫 화면이 공고 상세'
        END AS detail,
        people.channel
      FROM job_people people
      WHERE $6::text = 'job_entry'
         OR ($6::text = 'job_apply' AND people.outcome = 'apply')
         OR ($6::text = 'job_move' AND people.outcome = 'move')
         OR ($6::text = 'job_exit' AND people.outcome = 'exit')
         OR ($6::text = 'job_pending' AND people.outcome = 'pending')
         OR ($6::text = 'job_returning' AND people.returning)
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
      c.channel AS acquisition_channel,
      ${screenSql("split_part(c.path, '?', 1)")} AS screen_key,
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

function dashboardChannelLabel(value: string) {
  const labels: Record<string, string> = {
    instagram: "인스타그램",
    blog: "블로그",
    threads: "스레드",
    search: "검색",
    direct: "직접유입",
  };
  return labels[value] || value;
}

function dashboardFactDetailSelector({
  cohort,
  bannerKey,
  screen,
  event,
  channel,
  funnelProduct,
  funnelStep,
}: {
  cohort: string;
  bannerKey: string;
  screen: string;
  event: string;
  channel: string;
  funnelProduct: string;
  funnelStep: string;
}): DashboardFactDetailSelector | null {
  if (funnelProduct && funnelStep) {
    const metricByStep: Record<string, string> = {
      visit: "product_visit",
      start: "product_start",
      complete: "product_complete",
      start_drop: "product_start_drop",
    };
    const productLabels: Record<string, string> = {
      diagnosis: "강점·성향 진단",
      resume_coaching: "AI NCS 자소서 코칭",
      interview_coaching: "AI NCS 면접 코칭",
    };
    const stepLabels: Record<string, string> = {
      visit: "방문",
      start: "시작",
      complete: "완료",
      start_drop: "시작 후 미완료",
    };
    const metric = metricByStep[funnelStep];
    if (!metric) return null;
    return {
      scope: funnelProduct,
      metric,
      channel: "",
      dimension: "",
      funnelLabel: `${productLabels[funnelProduct] || funnelProduct} ${stepLabels[funnelStep]}`,
    };
  }

  if (cohort) {
    return {
      scope: "traffic",
      metric: cohort,
      channel: channel === "all" ? "" : dashboardChannelLabel(channel),
      dimension: "",
      funnelLabel: "",
    };
  }

  if (bannerKey) {
    return {
      scope: "traffic",
      metric: "banner",
      channel: "",
      dimension: bannerKey,
      funnelLabel: "",
    };
  }

  if (event === "visit" && screen !== "all") {
    return {
      scope: "traffic",
      metric: "screen",
      channel: channel === "all" ? "" : dashboardChannelLabel(channel),
      dimension: screen,
      funnelLabel: "",
    };
  }

  return null;
}

async function hasCompleteDashboardFactDetails(
  selector: DashboardFactDetailSelector,
  startDate: string,
  endDate: string,
) {
  if (process.env.ANALYTICS_FACT_SOURCE !== "facts") {
    return false;
  }

  const now = Date.now();
  if (!factDetailSchemaCache || factDetailSchemaCache.expiresAt <= now) {
    const relation = await query<{ details: string | null; status: string | null }>(
      `SELECT to_regclass('public.analytics_dashboard_fact_details')::text AS details,
        to_regclass('public.analytics_dashboard_fact_detail_status')::text AS status`,
    );
    const schemaReady = Boolean(relation.rows[0]?.details && relation.rows[0]?.status);
    factDetailSchemaCache = {
      ready: schemaReady,
      expiresAt: now + (schemaReady ? 300_000 : 5_000),
    };
  }
  if (!factDetailSchemaCache.ready) return false;

  const cacheKey = `${selector.scope}:${startDate}:${endDate}`;
  const cached = factDetailReadinessCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.ready;

  const ready = await query<{ ready: boolean }>(
    `
      SELECT NOT EXISTS (
        SELECT DISTINCT facts.day
        FROM public.analytics_dashboard_facts facts
        WHERE facts.scope = $1
          AND facts.day BETWEEN $2::date AND $3::date
        EXCEPT
        SELECT status.day
        FROM public.analytics_dashboard_fact_detail_status status
        WHERE status.scope = $1
          AND status.day BETWEEN $2::date AND $3::date
      ) AS ready
    `,
    [selector.scope, startDate, endDate],
  );
  const isReady = ready.rows[0]?.ready === true;
  factDetailReadinessCache.set(cacheKey, {
    ready: isReady,
    expiresAt: now + (isReady ? 60_000 : 5_000),
  });
  return isReady;
}

async function getDashboardFactDetailRows({
  selector,
  startDate,
  endDate,
  page,
  pageSize: requestedPageSize,
}: {
  selector: DashboardFactDetailSelector;
  startDate: string;
  endDate: string;
  page: number;
  pageSize: number;
}) {
  const values = [
    selector.scope,
    startDate,
    endDate,
    selector.metric,
    selector.channel,
    selector.dimension,
  ];
  const whereSql = `
    details.scope = $1
    AND details.day BETWEEN $2::date AND $3::date
    AND details.metric = $4
    AND ($5::text = '' OR details.channel = $5)
    AND ($6::text = '' OR details.dimension = $6)
  `;
  const countPromise = selector.metric === "product_start_drop"
    ? query<{ count: string }>(
        `SELECT GREATEST(
            COALESCE(SUM(facts.value) FILTER (WHERE facts.metric = 'product_start'), 0)
            - COALESCE(SUM(facts.value) FILTER (WHERE facts.metric = 'product_complete'), 0),
            0
          )::text AS count
          FROM public.analytics_dashboard_facts facts
          WHERE facts.scope = $1
            AND facts.day BETWEEN $2::date AND $3::date
            AND $4::text = 'product_start_drop'
            AND facts.metric IN ('product_start', 'product_complete')
            AND ($5::text = '' OR facts.channel = $5)
            AND ($6::text = '' OR facts.dimension = $6)`,
        values,
      )
    : query<{ count: string }>(
        `SELECT COALESCE(SUM(facts.value), 0)::text AS count
          FROM public.analytics_dashboard_facts facts
          WHERE facts.scope = $1
            AND facts.day BETWEEN $2::date AND $3::date
            AND facts.metric = $4
            AND ($5::text = '' OR facts.channel = $5)
            AND ($6::text = '' OR facts.dimension = $6)`,
        values,
      );
  const queryRows = (targetPage: number) => query<ActivityLogDbRow>(
    `
      SELECT
        details.scope || ':' || details.day::text || ':' || details.metric || ':' || details.entity_key AS id,
        details.event_at,
        details.metric AS event_type,
        COALESCE(users.nickname, users.display_name) AS user_name,
        users.email::text AS user_email,
        details.anonymous_id,
        NULL::uuid AS session_id,
        details.ip_address,
        details.user_agent,
        details.path,
        details.detail,
        details.channel AS acquisition_channel,
        ${screenSql("split_part(details.path, '?', 1)")} AS screen_key,
        NULL::text AS total_count
      FROM public.analytics_dashboard_fact_details details
      LEFT JOIN public.users users ON users.id = details.user_id
      WHERE ${whereSql}
      ORDER BY details.event_at DESC, details.entity_key DESC
      LIMIT $7 OFFSET $8
    `,
    [...values, requestedPageSize, (targetPage - 1) * requestedPageSize],
  );
  let [countResult, rowsResult] = await Promise.all([countPromise, queryRows(page)]);
  const totalCount = Number(countResult.rows[0]?.count || 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / requestedPageSize));
  const effectivePage = Math.min(page, totalPages);
  if (effectivePage !== page) rowsResult = await queryRows(effectivePage);

  return {
    rows: rowsResult.rows,
    totalCount,
    totalPages,
    page: effectivePage,
  };
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
  const cohort = args?.cohort && ["job_entry", "job_apply", "job_move", "job_exit", "job_pending", "job_returning"].includes(args.cohort)
    ? args.cohort
    : "";
  const screen = args?.screen === "coaching" ? "resume_coaching" : args?.screen || "all";
  const bannerKey = args?.bannerKey || "";
  const keyword = (args?.keyword || "").trim();
  const ip = normalizeIp(args?.ip);
  const keywordIp = isIpSearch(keyword) ? normalizeIp(keyword) : "";
  const channel = args?.channel || "all";
  const from = args?.from || "";
  const funnelProduct = ["diagnosis", "resume_coaching", "interview_coaching"].includes(args?.funnelProduct || "")
    ? args?.funnelProduct || ""
    : "";
  const funnelStep = ["visit", "start", "complete", "visit_drop", "start_drop"].includes(args?.funnelStep || "")
    ? args?.funnelStep || ""
    : "";
  const uniqueOnly = args?.unique === "1";
  const includeExcluded = args?.includeExcluded === "1";
  const userId = args?.userId || null;
  const resultPageSize = Math.min(10000, Math.max(1, Number(args?.limit || pageSize)));
  const page = Math.max(1, Number(args?.page || 1));
  const pattern = keyword ? `%${keyword}%` : "";
  const offset = (page - 1) * resultPageSize;
  await ensureAnalyticsExclusionSchema();

  const factDetailSelector = dashboardFactDetailSelector({
    cohort,
    bannerKey,
    screen,
    event,
    channel,
    funnelProduct,
    funnelStep,
  });
  if (
    factDetailSelector &&
    await hasCompleteDashboardFactDetails(factDetailSelector, startDate, endDate)
  ) {
    const stored = await getDashboardFactDetailRows({
      selector: factDetailSelector,
      startDate,
      endDate,
      page,
      pageSize: resultPageSize,
    });
    return {
      startDate,
      endDate,
      event: funnelProduct ? "activity" : event,
      eventType,
      cohort,
      bannerKey,
      screen,
      keyword,
      ip,
      channel,
      uniqueOnly,
      includeExcluded,
      from,
      funnelProduct,
      funnelStep,
      funnelLabel: factDetailSelector.funnelLabel,
      page: stored.page,
      totalPages: stored.totalPages,
      totalCount: stored.totalCount,
      userId: userId || "",
      rows: mapActivityRows(stored.rows),
    };
  }

  if (funnelProduct && funnelStep) {
    const funnel = await getFunnelLogData({
      product: funnelProduct,
      step: funnelStep,
      startDate,
      endDate,
      keyword,
      page,
    });

    return {
      startDate,
      endDate,
      event: "activity",
      eventType: "",
      cohort: "",
      bannerKey,
      screen,
      keyword,
      ip,
      channel,
      uniqueOnly: false,
      includeExcluded,
      from,
      funnelProduct,
      funnelStep,
      funnelLabel: `${funnel.productLabel} ${funnel.stepLabel}`,
      page: funnel.page,
      totalPages: funnel.totalPages,
      totalCount: funnel.totalCount,
      userId: userId || "",
      rows: funnel.rows.map((row) => ({
        id: row.id,
        eventAt: row.eventAt,
        event: funnel.stepLabel,
        userName: row.userName,
        userEmail: row.userEmail === "-" ? "" : row.userEmail,
        identity: row.anonymousId,
        ipAddress: row.ipAddress,
        path: row.path,
        detail: row.lastAction,
        channel: formatChannel(row.channel),
        screen: formatScreen(screenKeyFromPath(row.path)),
        device: row.device,
      })),
    };
  }

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
      includeExcluded,
      from,
      funnelProduct,
      funnelStep,
      funnelLabel: "",
      page,
      totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
      totalCount,
      userId: userId || "",
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
        COALESCE(access.anonymous_id::text, access.user_id::text) AS visitor_key,
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
        NULL::text AS banner_key,
        access.metadata AS metadata
      FROM public.access_logs access
      WHERE access.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND access.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR access.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(access.ip_address::text, '/', 1) = $10::text)
        AND (${includeExcluded ? "TRUE" : excludedEventCondition("access.user_id", "access.ip_address")})
        AND ${nonAutomatedUserAgentCondition("access.user_agent")}
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
          events.anonymous_id::text,
          events.user_id::text,
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
        END,
        events.properties AS metadata
      FROM public.product_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.properties->>'ip_address', '/', 1) = $10::text)
        AND (${includeExcluded ? "TRUE" : excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")})
        AND ${nonAutomatedUserAgentCondition("NULLIF(events.properties->>'user_agent', '')")}
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
        NULL::text,
        '{}'::jsonb AS metadata
      FROM public.attribution_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND (${includeExcluded ? "TRUE" : excludedEventCondition("events.user_id", "events.ip_address")})
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
        NULL::text,
        '{}'::jsonb AS metadata
      FROM public.auth_login_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND (${includeExcluded ? "TRUE" : excludedEventCondition("events.user_id", "events.ip_address")})
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
        NULL::text,
        '{}'::jsonb AS metadata
      FROM public.user_entry_events events
      WHERE events.created_at >= ($1::date AT TIME ZONE 'Asia/Seoul')
        AND events.created_at < (($2::date + 1) AT TIME ZONE 'Asia/Seoul')
        AND ($11::uuid IS NULL OR events.user_id = $11::uuid)
        AND ($10::text = '' OR SPLIT_PART(events.ip_address::text, '/', 1) = $10::text)
        AND (${includeExcluded ? "TRUE" : excludedEventCondition("events.user_id", "events.ip_address")})
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
        ${trafficChannelKeySql(
          "COALESCE(daily_channels.source_value, raw_events.source_value)",
          "raw_events.metadata",
        )} AS acquisition_channel
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
      acquisition_channel, normalized_screen_key AS screen_key,
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
    includeExcluded,
    from,
    funnelProduct,
    funnelStep,
    funnelLabel: "",
    page,
    totalPages: Math.max(1, Math.ceil(totalCount / resultPageSize)),
    totalCount,
    userId: userId || "",
    rows: mapActivityRows(rowsResult.rows),
  };
}
