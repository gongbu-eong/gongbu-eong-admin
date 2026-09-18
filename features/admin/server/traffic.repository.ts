import {
  BannerClickLogData,
  BannerClickLogQuery,
  CampaignPerformanceData,
  CampaignPerformanceRow,
  FunnelLogData,
  FunnelLogQuery,
  FunnelProductFilter,
  FunnelStepFilter,
  TrafficBannerClick,
  TrafficChannel,
  TrafficData,
  TrafficScreenInflow,
  TrafficLogChannelFilter,
  TrafficLogData,
  TrafficLogQuery,
  TrafficPeriodPreset,
  TrafficQuery,
  trafficChannelColors,
  trafficChannelOrder,
} from "@/features/admin/data/traffic";
import { query } from "@/features/admin/server/db";

type ChannelCountRow = {
  source_value: string | null;
  count: string;
};

type TrendRow = {
  label: string;
  source_value: string | null;
  count: string;
};

type PeriodRow = {
  start_date: string;
  end_date: string;
  start_label: string;
  end_label: string;
  day_count: string;
};

type CampaignRow = {
  campaign: string | null;
  link: string | null;
  source: string | null;
  medium: string | null;
  visitors: string;
  diagnosis_starts: string;
  diagnosis_completes: string;
  signups: string;
  last_seen_at: string | null;
};

type BannerClickRow = {
  banner_key: string | null;
  banner_name: string | null;
  clicks: string;
  unique_clicks: string;
};

type DailyBannerClickRow = {
  label: string;
  item_key: string;
  count: string;
};

type DailyScreenInflowRow = {
  label: string;
  screen_key: string;
  count: string;
};

type TrafficLogRow = {
  id: string;
  visited_at: string;
  source_value: string | null;
  user_name: string | null;
  user_email: string | null;
  provider: string | null;
  ip_address: string | null;
  user_agent: string | null;
  path: string | null;
  referrer: string | null;
};

type BannerClickLogRow = {
  id: string;
  clicked_at: string;
  banner_key: string | null;
  banner_name: string | null;
  placement: string | null;
  target_path: string | null;
  source_path: string | null;
  user_name: string | null;
  user_email: string | null;
  provider: string | null;
  anonymous_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
};

type FunnelLogRow = {
  id: string;
  event_at: string;
  user_name: string | null;
  user_email: string | null;
  provider: string | null;
  anonymous_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  channel: string | null;
  path: string | null;
  referrer: string | null;
  last_action: string;
};

type CountRow = {
  count: string;
};

type JobDetailInsightRow = {
  visitors: string;
  activity_visitors: string;
};

const presetLabels: Record<TrafficPeriodPreset, string> = {
  today: "오늘",
  "7d": "최근 7일",
  "30d": "최근 30일",
  custom: "직접 선택",
};

const periodBoundsSql = `
  WITH input AS (
    SELECT
      $1::text AS preset,
      NULLIF($2::text, '')::date AS requested_start,
      NULLIF($3::text, '')::date AS requested_end
  ),
  today AS (
    SELECT date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul')::date AS today_kst
  ),
  normalized AS (
    SELECT
      CASE
        WHEN input.preset = 'today' THEN today.today_kst
        WHEN input.preset = '30d' THEN today.today_kst - 29
        WHEN input.preset = 'custom' AND input.requested_start IS NOT NULL THEN input.requested_start
        ELSE today.today_kst - 6
      END AS raw_start,
      CASE
        WHEN input.preset = 'custom' AND input.requested_end IS NOT NULL THEN input.requested_end
        ELSE today.today_kst
      END AS raw_end
    FROM input
    CROSS JOIN today
  ),
  bounds AS (
    SELECT
      LEAST(raw_start, raw_end) AS start_day,
      GREATEST(raw_start, raw_end) AS end_day
    FROM normalized
  ),
  ranges AS (
    SELECT
      start_day,
      end_day,
      (start_day::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
      ((end_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
      ((start_day - (end_day - start_day + 1))::timestamp AT TIME ZONE 'Asia/Seoul') AS previous_start,
      (start_day::timestamp AT TIME ZONE 'Asia/Seoul') AS previous_end,
      (end_day - start_day + 1) AS day_count
    FROM bounds
  )
`;

const visitorKeySql =
  "COALESCE(user_id::TEXT, anonymous_id::TEXT, session_id::TEXT, NULLIF(CONCAT_WS('|', ip_address::TEXT, NULLIF(user_agent, '')), ''))";

const trafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
    session_id,
    ip_address,
    id,
    event_name,
    title,
    user_agent,
    path,
    metadata,
    COALESCE(
      NULLIF(traffic_channel, ''),
      NULLIF(metadata->>'trafficChannel', ''),
      NULLIF(substring(path from '[?&]utm_source=([^&]+)'), ''),
      CASE
        WHEN referrer ILIKE '%gongbueong.career.co.kr%' OR referrer ILIKE '%localhost%' THEN NULL
        ELSE NULLIF(referrer, '')
      END,
      'direct'
    ) AS source_value,
    COALESCE(NULLIF(substring(path from '[?&]utm_medium=([^&]+)'), ''), '-') AS medium,
    COALESCE(NULLIF(substring(path from '[?&]utm_campaign=([^&]+)'), ''), '캠페인 없음') AS campaign,
    COALESCE(NULLIF(substring(path from '[?&]utm_content=([^&]+)'), ''), path, '-') AS link,
    path AS landing_path,
    COALESCE(NULLIF(screen_key, ''), NULLIF(metadata->>'screenKey', '')) AS screen_key,
    COALESCE(NULLIF(canonical_path, ''), NULLIF(metadata->>'canonicalPath', '')) AS canonical_path,
    COALESCE(NULLIF(previous_path, ''), NULLIF(metadata->>'previousPath', '')) AS previous_path,
    ${visitorKeySql} AS visitor_key,
    referrer,
    created_at AS event_at,
    created_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
`;

const campaignTrafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
    session_id,
    ip_address,
    id,
    COALESCE(
      NULLIF(substring(path from '[?&]utm_source=([^&]+)'), ''),
      NULLIF(NULLIF(metadata #>> '{attribution,current,source}', 'direct'), ''),
      NULLIF(metadata #>> '{attribution,last,source}', ''),
      NULLIF(referrer, ''),
      'direct'
    ) AS source_value,
    COALESCE(
      NULLIF(substring(path from '[?&]utm_medium=([^&]+)'), ''),
      NULLIF(NULLIF(metadata #>> '{attribution,current,medium}', 'direct'), ''),
      NULLIF(metadata #>> '{attribution,last,medium}', ''),
      '-'
    ) AS medium,
    COALESCE(
      NULLIF(substring(path from '[?&]utm_campaign=([^&]+)'), ''),
      NULLIF(metadata #>> '{attribution,current,campaign}', ''),
      NULLIF(metadata #>> '{attribution,last,campaign}', ''),
      '캠페인 없음'
    ) AS campaign,
    COALESCE(
      NULLIF(substring(path from '[?&]utm_content=([^&]+)'), ''),
      NULLIF(metadata #>> '{attribution,current,content}', ''),
      NULLIF(metadata #>> '{attribution,last,content}', ''),
      path,
      '-'
    ) AS link,
    path AS landing_path,
    referrer,
    created_at AS event_at,
    created_at
  FROM public.access_logs
  UNION ALL
  SELECT
    user_id,
    anonymous_id,
    NULL::uuid AS session_id,
    ip_address,
    id,
    COALESCE(NULLIF(source, ''), NULLIF(referrer, ''), 'direct') AS source_value,
    COALESCE(NULLIF(medium, ''), '-') AS medium,
    COALESCE(NULLIF(campaign, ''), '캠페인 없음') AS campaign,
    COALESCE(NULLIF(content, ''), NULLIF(term, ''), NULLIF(landing_path, ''), '-') AS link,
    landing_path,
    referrer,
    captured_at AS event_at,
    created_at
  FROM public.attribution_events
`;

const bannerLabels: Record<string, string> = {
  job_detail_resume_a: "자소서 배너 A",
  job_detail_resume_b: "자소서 배너 B",
  job_detail_strength_a: "강약점 배너 A",
  job_detail_strength_b: "강약점 배너 B",
  job_detail_bookmark_click: "공고 찜하고 준비하기",
  job_detail_apply_click: "지원하기/이메일 지원하기",
};

const trafficScreenDefinitions = [
  { key: "home", label: "홈" },
  { key: "jobs", label: "공고 목록" },
  { key: "job_detail", label: "공고 상세" },
  { key: "ai_tools", label: "AI 도구" },
  { key: "coaching", label: "AI NCS 자소서 코칭" },
  { key: "interview_coaching", label: "AI NCS 면접 코칭" },
  { key: "diagnosis", label: "강약점" },
  { key: "community", label: "커뮤니티" },
  { key: "calendar", label: "캘린더" },
  { key: "my", label: "마이페이지" },
  { key: "login", label: "로그인" },
  { key: "other", label: "기타" },
];

const funnelProductOptions: Record<
  FunnelProductFilter,
  {
    label: string;
    visitWhere: string;
    startSql: string;
    completeSql: string;
    startAction: string;
    completeAction: string;
  }
> = {
  diagnosis: {
    label: "강점·성향 유형",
    visitWhere:
      "split_part(logs.path, '?', 1) IN ('/ai-tools/diagnosis', '/events/diagnosis')",
    startAction: "진단 시작",
    completeAction: "진단 완료",
    startSql: `
      SELECT
        events.id::TEXT AS id,
        COALESCE(events.user_id::TEXT, events.anonymous_id::TEXT, events.id::TEXT) AS visitor_key,
        events.user_id,
        events.anonymous_id,
        events.created_at AS event_at,
        COALESCE(NULLIF(events.properties->>'path', ''), events.current_landing_path, '-') AS path,
        COALESCE(NULLIF(events.properties->>'previous_path', ''), events.current_referrer, '-') AS referrer,
        COALESCE(NULLIF(events.properties->>'traffic_channel', ''), events.current_source, '직접유입') AS channel,
        NULLIF(events.properties->>'ip_address', '') AS ip_address,
        NULLIF(events.properties->>'user_agent', '') AS user_agent
      FROM public.product_events events
      WHERE events.event_type = 'diagnosis_start'
        AND events.properties->>'action' IN ('question_1_view', 'start_button_click')
    `,
    completeSql: `
      SELECT
        results.id::TEXT AS id,
        COALESCE(results.user_id::TEXT, runs.anonymous_id::TEXT, results.id::TEXT) AS visitor_key,
        results.user_id,
        runs.anonymous_id,
        COALESCE(runs.completed_at, results.created_at) AS event_at,
        '/ai-tools/diagnosis/result' AS path,
        COALESCE(runs.referer, '-') AS referrer,
        '직접유입' AS channel,
        runs.ip_address::TEXT AS ip_address,
        runs.user_agent
      FROM public.diagnosis_results results
      JOIN public.diagnosis_runs runs ON runs.id = results.diagnosis_run_id
    `,
  },
  resume_coaching: {
    label: "AI NCS 자소서 코칭",
    visitWhere: "split_part(logs.path, '?', 1) = '/ai-tools/coaching'",
    startAction: "코칭 시작",
    completeAction: "코칭 완료",
    startSql: `
      SELECT
        requests.id::TEXT AS id,
        COALESCE(requests.user_id::TEXT, requests.anonymous_id::TEXT, requests.id::TEXT) AS visitor_key,
        requests.user_id,
        requests.anonymous_id,
        requests.created_at AS event_at,
        '/ai-tools/coaching' AS path,
        '-' AS referrer,
        requests.entry_source::TEXT AS channel,
        requests.ip_address::TEXT AS ip_address,
        requests.user_agent
      FROM public.resume_coaching_requests requests
    `,
    completeSql: `
      SELECT
        results.id::TEXT AS id,
        COALESCE(requests.user_id::TEXT, requests.anonymous_id::TEXT, requests.id::TEXT) AS visitor_key,
        requests.user_id,
        requests.anonymous_id,
        results.created_at AS event_at,
        '/ai-tools/coaching/result/' || results.id::TEXT AS path,
        '-' AS referrer,
        requests.entry_source::TEXT AS channel,
        requests.ip_address::TEXT AS ip_address,
        requests.user_agent
      FROM public.resume_coaching_results results
      JOIN public.resume_coaching_requests requests ON requests.id = results.request_id
    `,
  },
  interview_coaching: {
    label: "AI NCS 면접 코칭",
    visitWhere: "split_part(logs.path, '?', 1) = '/ai-tools/interview-coaching'",
    startAction: "코칭 시작",
    completeAction: "코칭 완료",
    startSql: `
      SELECT
        sessions.id::TEXT AS id,
        COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
        sessions.user_id,
        sessions.anonymous_id,
        sessions.started_at AS event_at,
        '/ai-tools/interview-coaching' AS path,
        '-' AS referrer,
        sessions.entry_source::TEXT AS channel,
        sessions.ip_address::TEXT AS ip_address,
        sessions.user_agent
      FROM public.interview_coaching_sessions sessions
    `,
    completeSql: `
      SELECT
        sessions.id::TEXT AS id,
        COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
        sessions.user_id,
        sessions.anonymous_id,
        COALESCE(sessions.completed_at, sessions.updated_at, sessions.started_at) AS event_at,
        '/ai-tools/interview-coaching/result/' || sessions.id::TEXT AS path,
        '-' AS referrer,
        sessions.entry_source::TEXT AS channel,
        sessions.ip_address::TEXT AS ip_address,
        sessions.user_agent
      FROM public.interview_coaching_sessions sessions
      WHERE sessions.completed_at IS NOT NULL OR sessions.result IS NOT NULL
    `,
  },
};

const funnelStepLabels: Record<FunnelStepFilter, string> = {
  visit: "방문",
  start: "시작",
  complete: "완료",
  visit_drop: "방문 후 이탈",
  start_drop: "시작 후 이탈",
};

function numberValue(value: string | number | null | undefined) {
  return Number(value || 0);
}

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatPercent(value: number) {
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  })}%`;
}

function normalizePreset(value?: TrafficQuery["preset"]): TrafficPeriodPreset {
  return value === "today" || value === "30d" || value === "custom"
    ? value
    : "today";
}

function normalizeDate(value?: string | null) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
  return value;
}

function normalizeLogChannel(
  value?: TrafficLogQuery["channel"],
): TrafficLogChannelFilter {
  return value === "instagram" ||
    value === "blog" ||
    value === "threads" ||
    value === "search" ||
    value === "page_move" ||
    value === "direct"
    ? value
    : "all";
}

function normalizeFunnelProduct(
  value?: FunnelLogQuery["product"],
): FunnelProductFilter {
  return value === "resume_coaching" || value === "interview_coaching"
    ? value
    : "diagnosis";
}

function normalizeFunnelStep(value?: FunnelLogQuery["step"]): FunnelStepFilter {
  return value === "start" ||
    value === "complete" ||
    value === "visit_drop" ||
    value === "start_drop"
    ? value
    : "visit";
}

function normalizeDiagnosisFunnelStep(
  product: FunnelProductFilter,
  step: FunnelStepFilter,
) {
  if (product !== "diagnosis") return step;
  if (step === "visit") return "start" as const;
  if (step === "visit_drop") return "start_drop" as const;
  return step;
}

function normalizePage(value?: TrafficLogQuery["page"]) {
  const page = Number(value || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeKeyword(value?: string | null) {
  return (value || "").trim().slice(0, 100);
}

function normalizeScreenFilter(value?: string | null) {
  const normalized = (value || "").trim();
  if (!normalized || normalized === "all") return "all";
  return trafficScreenDefinitions.some((screen) => screen.key === normalized)
    ? normalized
    : "all";
}

function normalizeBannerKey(value?: string | null) {
  return (value || "").trim().slice(0, 120);
}

function toKstDateInput(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function createDefaultLogDates(args?: TrafficLogQuery) {
  const now = new Date();
  const endDate = normalizeDate(args?.endDate) || toKstDateInput(now);
  const defaultStart = new Date(now);
  defaultStart.setDate(defaultStart.getDate() - 6);
  const startDate = normalizeDate(args?.startDate) || toKstDateInput(defaultStart);

  return { startDate, endDate };
}

function createParams(args?: TrafficQuery) {
  const preset = normalizePreset(args?.preset);
  return [
    preset,
    preset === "custom" ? normalizeDate(args?.startDate) : "",
    preset === "custom" ? normalizeDate(args?.endDate) : "",
  ];
}

function createDelta(current: number, previous: number, suffix: string) {
  if (previous <= 0) {
    return {
      text: current > 0 ? `▲ 100% ${suffix}` : `0% ${suffix}`,
      trend: current > 0 ? ("up" as const) : ("down" as const),
      value: current > 0 ? 100 : 0,
    };
  }

  const diff = ((current - previous) / previous) * 100;
  const direction = diff >= 0 ? "▲" : "▼";

  return {
    text: `${direction} ${formatPercent(Math.abs(diff))} ${suffix}`,
    trend: diff >= 0 ? ("up" as const) : ("down" as const),
    value: diff,
  };
}

function mapChannelLabel(source: string | null) {
  const trimmed = (source || "").trim();
  if (trafficChannelOrder.includes(trimmed)) return trimmed;

  const value = trimmed.toLowerCase();

  if (value.includes("instagram") || value === "ig") return "인스타그램";
  if (value.includes("blog")) return "블로그";
  if (value.includes("thread")) return "스레드";
  if (
    trimmed === "페이지 이동" ||
    value.includes("page_move") ||
    value.includes("page move") ||
    value.includes("internal")
  ) {
    return "페이지 이동";
  }
  if (
    value.includes("naver") ||
    value.includes("google") ||
    value.includes("daum") ||
    value.includes("search")
  ) {
    return "검색";
  }

  return "직접유입";
}

function mapChannelFilterToLabel(channel: TrafficLogChannelFilter) {
  if (channel === "instagram") return "인스타그램";
  if (channel === "blog") return "블로그";
  if (channel === "threads") return "스레드";
  if (channel === "search") return "검색";
  if (channel === "page_move") return "페이지 이동";
  if (channel === "direct") return "직접유입";
  return "";
}

function mapProvider(value?: string | null): "kakao" | "naver" | "unknown" {
  return value === "kakao" || value === "naver" ? value : "unknown";
}

function mapProviderLabel(value?: string | null) {
  if (value === "kakao") return "카카오";
  if (value === "naver") return "네이버";
  return "익명";
}

function mapBannerLabel(key: string | null, name: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedKey = key?.trim();
  if (!trimmedKey) return "알 수 없는 배너";

  return bannerLabels[trimmedKey] || trimmedKey;
}

function groupChannelRows(rows: ChannelCountRow[]) {
  const grouped = new Map<string, number>();

  for (const label of trafficChannelOrder) {
    grouped.set(label, 0);
  }

  for (const row of rows) {
    const label = mapChannelLabel(row.source_value);
    if (!trafficChannelOrder.includes(label)) continue;
    grouped.set(label, (grouped.get(label) || 0) + numberValue(row.count));
  }

  return grouped;
}

function createYLabels(maxValue: number) {
  const paddedMax = Math.max(1, maxValue * 1.15);
  const step = getNiceStep(paddedMax / 4);
  const roundedMax = step * 4;

  return Array.from({ length: 5 }, (_, index) =>
    Math.round(roundedMax - step * index).toLocaleString("ko-KR"),
  );
}

function getNiceStep(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

async function getPeriod(params: unknown[]) {
  const result = await query<PeriodRow>(
    `
      ${periodBoundsSql}
      SELECT
        to_char(start_day, 'YYYY-MM-DD') AS start_date,
        to_char(end_day, 'YYYY-MM-DD') AS end_date,
        to_char(start_day, 'YYYY. MM. DD') AS start_label,
        to_char(end_day, 'YYYY. MM. DD') AS end_label,
        day_count::text
      FROM ranges
    `,
    params,
  );

  return result.rows[0];
}

async function getDailyChannelTrendRows(params: unknown[]) {
  const result = await query<TrendRow>(
    `
      ${periodBoundsSql},
      days AS (
        SELECT generate_series(start_day, end_day, INTERVAL '1 day')::date AS day_kst
        FROM ranges
      ),
      channels AS (
        SELECT *
        FROM (VALUES
          ('인스타그램', 1),
          ('블로그', 2),
          ('스레드', 3),
          ('검색', 4),
          ('직접유입', 5)
        ) AS channel(label, sort_order)
      ),
      normalized_logs AS (
        SELECT
          days.day_kst,
          logs.visitor_key,
          CASE
            WHEN LOWER(logs.source_value) LIKE '%instagram%'
              OR LOWER(logs.source_value) = 'ig'
              THEN '인스타그램'
            WHEN LOWER(logs.source_value) LIKE '%blog%'
              THEN '블로그'
            WHEN LOWER(logs.source_value) LIKE '%thread%'
              THEN '스레드'
            WHEN logs.source_value = '페이지 이동'
              OR LOWER(logs.source_value) LIKE '%page_move%'
              OR LOWER(logs.source_value) LIKE '%page move%'
              OR LOWER(logs.source_value) LIKE '%internal%'
              THEN '직접유입'
            WHEN LOWER(logs.source_value) LIKE '%naver%'
              OR LOWER(logs.source_value) LIKE '%google%'
              OR LOWER(logs.source_value) LIKE '%daum%'
              OR LOWER(logs.source_value) LIKE '%search%'
              THEN '검색'
            ELSE '직접유입'
          END AS source_value
        FROM days
        JOIN (
          SELECT DISTINCT ON (
            date_trunc('day', event_at AT TIME ZONE 'Asia/Seoul')::date,
            visitor_key
          )
            date_trunc('day', event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
            CASE
              WHEN source_value = '페이지 이동'
                OR LOWER(source_value) LIKE '%page_move%'
                OR LOWER(source_value) LIKE '%page move%'
                OR LOWER(source_value) LIKE '%internal%'
                THEN COALESCE(
                  NULLIF(metadata #>> '{attribution,first,source}', ''),
                  NULLIF(metadata #>> '{attribution,current,source}', ''),
                  'direct'
                )
              ELSE source_value
            END AS source_value,
            visitor_key,
            event_at,
            id
          FROM (${trafficEventsSql}) traffic_events
          WHERE visitor_key IS NOT NULL
          ORDER BY
            date_trunc('day', event_at AT TIME ZONE 'Asia/Seoul')::date,
            visitor_key,
            event_at,
            id
        ) logs
          ON logs.event_at >= days.day_kst::timestamp AT TIME ZONE 'Asia/Seoul'
         AND logs.event_at < (days.day_kst + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
      ),
      grouped AS (
        SELECT day_kst, source_value, COUNT(DISTINCT visitor_key) AS count
        FROM normalized_logs
        GROUP BY day_kst, source_value
      )
      SELECT
        to_char(days.day_kst, 'MM/DD') AS label,
        channels.label AS source_value,
        COALESCE(grouped.count, 0) AS count
      FROM days
      CROSS JOIN channels
      LEFT JOIN grouped
        ON grouped.day_kst = days.day_kst
       AND grouped.source_value = channels.label
      ORDER BY days.day_kst, channels.sort_order
    `,
    params,
  );

  return result.rows;
}

async function getDailyScreenInflowRows(params: unknown[]) {
  const result = await query<DailyScreenInflowRow>(
    `
      ${periodBoundsSql},
      days AS (
        SELECT generate_series(start_day, end_day, INTERVAL '1 day')::date AS day_kst
        FROM ranges
      ),
      screens AS (
        SELECT *
        FROM (VALUES
          ('home', 1),
          ('jobs', 2),
          ('job_detail', 3),
          ('ai_tools', 4),
          ('coaching', 5),
          ('interview_coaching', 6),
          ('diagnosis', 7),
          ('community', 8),
          ('calendar', 9),
          ('my', 10),
          ('login', 11),
          ('other', 12)
        ) AS screen(screen_key, sort_order)
      ),
      normalized_logs AS (
        SELECT
          days.day_kst,
          logs.visitor_key,
          CASE
            WHEN logs.screen_key IN (
              'home',
              'jobs',
              'job_detail',
              'ai_tools',
              'coaching',
              'interview_coaching',
              'diagnosis',
              'community',
              'calendar',
              'my',
              'login'
            ) THEN logs.screen_key
            WHEN split_part(logs.landing_path, '?', 1) = '/' THEN 'home'
            WHEN split_part(logs.landing_path, '?', 1) = '/jobs' THEN 'jobs'
            WHEN split_part(logs.landing_path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/ai-tools/interview-coaching%' THEN 'interview_coaching'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/ai-tools/coaching%' THEN 'coaching'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/ai-tools/diagnosis%'
              OR split_part(logs.landing_path, '?', 1) LIKE '/events/diagnosis%'
              THEN 'diagnosis'
            WHEN split_part(logs.landing_path, '?', 1) = '/ai-tools'
              OR split_part(logs.landing_path, '?', 1) LIKE '/ai-tools/job-tools%'
              THEN 'ai_tools'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/community%' THEN 'community'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/calendar%' THEN 'calendar'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/my%' THEN 'my'
            WHEN split_part(logs.landing_path, '?', 1) LIKE '/login%'
              OR split_part(logs.landing_path, '?', 1) LIKE '/auth%'
              THEN 'login'
            ELSE 'other'
          END AS screen_key
        FROM days
        JOIN (${trafficEventsSql}) logs
          ON logs.event_at >= days.day_kst::timestamp AT TIME ZONE 'Asia/Seoul'
         AND logs.event_at < (days.day_kst + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
        WHERE logs.event_name = 'page_view'
      ),
      grouped AS (
        SELECT day_kst, screen_key, COUNT(DISTINCT visitor_key) AS count
        FROM normalized_logs
        GROUP BY day_kst, screen_key
      )
      SELECT
        to_char(days.day_kst, 'MM/DD') AS label,
        screens.screen_key,
        COALESCE(grouped.count, 0) AS count
      FROM days
      CROSS JOIN screens
      LEFT JOIN grouped
        ON grouped.day_kst = days.day_kst
       AND grouped.screen_key = screens.screen_key
      ORDER BY days.day_kst, screens.sort_order
    `,
    params,
  );

  return result.rows;
}

async function getDailyBannerClickRows(params: unknown[]) {
  const result = await query<DailyBannerClickRow>(
    `
      ${periodBoundsSql},
      days AS (
        SELECT generate_series(start_day, end_day, INTERVAL '1 day')::date AS day_kst
        FROM ranges
      ),
      click_items AS (
        SELECT *
        FROM (VALUES
          ('job_detail_resume_a', 'banner_click', 'job_detail_resume_a', 1),
          ('job_detail_resume_b', 'banner_click', 'job_detail_resume_b', 2),
          ('job_detail_strength_a', 'banner_click', 'job_detail_strength_a', 3),
          ('job_detail_strength_b', 'banner_click', 'job_detail_strength_b', 4),
          ('job_detail_bookmark_click', 'job_detail_bookmark_click', NULL::TEXT, 5),
          ('job_detail_apply_click', 'job_detail_apply_click', NULL::TEXT, 6)
        ) AS items(item_key, event_type, banner_key, sort_order)
      ),
      normalized_clicks AS (
        SELECT
          (events.created_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          CASE
            WHEN events.event_type = 'banner_click'
            THEN COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown')
            ELSE events.event_type
          END AS item_key,
          events.id
        FROM public.product_events events, ranges
        WHERE events.created_at >= current_start
          AND events.created_at < current_end
          AND (
            events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
            OR (
              events.event_type = 'banner_click'
              AND COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown') IN (
                'job_detail_resume_a',
                'job_detail_resume_b',
                'job_detail_strength_a',
                'job_detail_strength_b'
              )
            )
          )
      ),
      grouped AS (
        SELECT day_kst, item_key, COUNT(*) AS count
        FROM normalized_clicks
        GROUP BY day_kst, item_key
      )
      SELECT
        to_char(days.day_kst, 'MM/DD') AS label,
        click_items.item_key,
        COALESCE(grouped.count, 0) AS count
      FROM days
      CROSS JOIN click_items
      LEFT JOIN grouped
        ON grouped.day_kst = days.day_kst
       AND grouped.item_key = click_items.item_key
      ORDER BY days.day_kst, click_items.sort_order
    `,
    params,
  );

  return result.rows;
}

function createTrendData(rows: TrendRow[]) {
  const labels = Array.from(new Set(rows.map((row) => row.label)));
  const map = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const label = mapChannelLabel(row.source_value);
    const dateMap = map.get(label) || new Map<string, number>();
    dateMap.set(row.label, (dateMap.get(row.label) || 0) + numberValue(row.count));
    map.set(label, dateMap);
  }

  return { labels, map };
}

export async function getTrafficData(args?: TrafficQuery): Promise<TrafficData> {
  const normalizedArgs = { ...args, preset: args?.preset || args?.period };
  const preset = normalizePreset(normalizedArgs.preset);
  const params = createParams(normalizedArgs);
  const trendParams = createParams({ preset: "7d" });
  const period = await getPeriod(params);

  const currentResult = await query<ChannelCountRow>(
      `
        ${periodBoundsSql},
        acquisition_visitors AS (
          SELECT DISTINCT ON (visitor_key)
            visitor_key,
            CASE
              WHEN source_value = '페이지 이동'
                OR LOWER(source_value) LIKE '%page_move%'
                OR LOWER(source_value) LIKE '%page move%'
                OR LOWER(source_value) LIKE '%internal%'
                THEN COALESCE(
                  NULLIF(metadata #>> '{attribution,first,source}', ''),
                  NULLIF(metadata #>> '{attribution,current,source}', ''),
                  'direct'
                )
              ELSE source_value
            END AS source_value
          FROM (${trafficEventsSql}) traffic_events, ranges
          WHERE visitor_key IS NOT NULL
            AND event_at >= current_start
            AND event_at < current_end
          ORDER BY visitor_key, event_at, id
        )
        SELECT source_value, COUNT(*) AS count
        FROM acquisition_visitors
        GROUP BY source_value
      `,
      params,
    );
  const previousResult = await query<ChannelCountRow>(
      `
        ${periodBoundsSql},
        acquisition_visitors AS (
          SELECT DISTINCT ON (visitor_key)
            visitor_key,
            CASE
              WHEN source_value = '페이지 이동'
                OR LOWER(source_value) LIKE '%page_move%'
                OR LOWER(source_value) LIKE '%page move%'
                OR LOWER(source_value) LIKE '%internal%'
                THEN COALESCE(
                  NULLIF(metadata #>> '{attribution,first,source}', ''),
                  NULLIF(metadata #>> '{attribution,current,source}', ''),
                  'direct'
                )
              ELSE source_value
            END AS source_value
          FROM (${trafficEventsSql}) traffic_events, ranges
          WHERE visitor_key IS NOT NULL
            AND event_at >= previous_start
            AND event_at < previous_end
          ORDER BY visitor_key, event_at, id
        )
        SELECT source_value, COUNT(*) AS count
        FROM acquisition_visitors
        GROUP BY source_value
      `,
      params,
    );
  const jobDetailInsightResult = await query<JobDetailInsightRow>(
    `
      ${periodBoundsSql},
      job_detail_visits AS (
        SELECT DISTINCT ON (visitor_key)
          visitor_key,
          event_at
        FROM (${trafficEventsSql}) logs, ranges
        WHERE logs.visitor_key IS NOT NULL
          AND logs.event_at >= ranges.current_start
          AND logs.event_at < ranges.current_end
          AND (
            logs.screen_key = 'job_detail'
            OR split_part(logs.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
          )
        ORDER BY visitor_key, event_at, id
      ),
      later_page_views AS (
        SELECT DISTINCT visits.visitor_key
        FROM job_detail_visits visits
        JOIN (${trafficEventsSql}) logs
          ON logs.visitor_key = visits.visitor_key
         AND logs.event_at > visits.event_at
         AND logs.event_at <= visits.event_at + INTERVAL '30 minutes'
      ),
      later_product_actions AS (
        SELECT DISTINCT visits.visitor_key
        FROM job_detail_visits visits
        JOIN public.product_events events
          ON COALESCE(
               events.user_id::TEXT,
               events.anonymous_id::TEXT,
               NULLIF(events.properties->>'session_id', ''),
               NULLIF(CONCAT_WS('|', NULLIF(events.properties->>'ip_address', ''), NULLIF(events.properties->>'user_agent', '')), '')
             ) = visits.visitor_key
         AND events.created_at > visits.event_at
         AND events.created_at <= visits.event_at + INTERVAL '30 minutes'
         AND (
           events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
           OR (
             events.event_type = 'banner_click'
             AND events.properties->>'placement' = 'job_detail_bottom'
           )
         )
      )
      SELECT
        COUNT(DISTINCT visits.visitor_key)::TEXT AS visitors,
        COUNT(DISTINCT visits.visitor_key) FILTER (
          WHERE later_page_views.visitor_key IS NOT NULL
             OR later_product_actions.visitor_key IS NOT NULL
        )::TEXT AS activity_visitors
      FROM job_detail_visits visits
      LEFT JOIN later_page_views
        ON later_page_views.visitor_key = visits.visitor_key
      LEFT JOIN later_product_actions
        ON later_product_actions.visitor_key = visits.visitor_key
    `,
    params,
  );
  const trendRows = await getDailyChannelTrendRows(trendParams);
  const dailyTrendRows = await getDailyChannelTrendRows(params);
  const dailyScreenRowsResult = await getDailyScreenInflowRows(params);
  const dailyBannerClickRowsResult = await getDailyBannerClickRows(params);
  const bannerClickResult = await query<BannerClickRow>(
    `
      ${periodBoundsSql}
      , click_items AS (
        SELECT *
        FROM (VALUES
          ('job_detail_resume_a', '자소서 배너 A', 'banner_click', 'job_detail_resume_a', 1),
          ('job_detail_resume_b', '자소서 배너 B', 'banner_click', 'job_detail_resume_b', 2),
          ('job_detail_strength_a', '강약점 배너 A', 'banner_click', 'job_detail_strength_a', 3),
          ('job_detail_strength_b', '강약점 배너 B', 'banner_click', 'job_detail_strength_b', 4),
          ('job_detail_bookmark_click', '공고 찜하고 준비하기', 'job_detail_bookmark_click', NULL::TEXT, 5),
          ('job_detail_apply_click', '지원하기/이메일 지원하기', 'job_detail_apply_click', NULL::TEXT, 6)
        ) AS items(item_key, item_name, event_type, banner_key, sort_order)
      ),
      counts AS (
        SELECT
          CASE
            WHEN event_type = 'banner_click'
            THEN COALESCE(NULLIF(properties->>'banner_key', ''), 'unknown')
            ELSE event_type
          END AS item_key,
          COUNT(*) AS clicks,
          COUNT(DISTINCT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT)) AS unique_clicks
        FROM public.product_events, ranges
        WHERE created_at >= current_start
          AND created_at < current_end
          AND (
            event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
            OR (
              event_type = 'banner_click'
              AND COALESCE(NULLIF(properties->>'banner_key', ''), 'unknown') IN (
                'job_detail_resume_a',
                'job_detail_resume_b',
                'job_detail_strength_a',
                'job_detail_strength_b'
              )
            )
          )
        GROUP BY 1
      )
      SELECT
        click_items.item_key AS banner_key,
        click_items.item_name AS banner_name,
        COALESCE(counts.clicks, 0)::TEXT AS clicks,
        COALESCE(counts.unique_clicks, 0)::TEXT AS unique_clicks
      FROM click_items
      LEFT JOIN counts ON counts.item_key = click_items.item_key
      ORDER BY click_items.sort_order
    `,
    params,
  );

  const currentChannels = groupChannelRows(currentResult.rows);
  const previousChannels = groupChannelRows(previousResult.rows);
  const totalVisitors = Array.from(currentChannels.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const previousTotal = Array.from(previousChannels.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const totalDelta = createDelta(totalVisitors, previousTotal, "지난 기간 대비");
  const jobDetailVisitors = numberValue(
    jobDetailInsightResult.rows[0]?.visitors,
  );
  const jobDetailActivityVisitors = numberValue(
    jobDetailInsightResult.rows[0]?.activity_visitors,
  );

  const channels: TrafficChannel[] = trafficChannelOrder
    .map((label) => {
      const count = currentChannels.get(label) || 0;
      const previous = previousChannels.get(label) || 0;
      const delta = createDelta(count, previous, "");

      return {
        label,
        color: trafficChannelColors[label],
        count,
        percent: totalVisitors > 0 ? (count / totalVisitors) * 100 : 0,
        deltaPercent: delta.value,
      };
    })
    .sort((a, b) => b.count - a.count);

  const topChannel = channels[0];

  const { labels: trendLabels, map: trendMap } = createTrendData(trendRows);
  const { labels: dailyLabels, map: dailyMap } = createTrendData(dailyTrendRows);

  const maxTrendValue = Math.max(
    ...Array.from(trendMap.values()).flatMap((dateMap) =>
      Array.from(dateMap.values()),
    ),
    0,
  );
  const dailyRows = dailyLabels.map((day) => {
    const counts = trafficChannelOrder.reduce<Record<string, number>>(
      (accumulator, label) => {
        accumulator[label] = dailyMap.get(label)?.get(day) || 0;
        return accumulator;
      },
      {},
    );
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return { date: day, counts, total };
  }).reverse();
  const screenLabels = Array.from(
    new Set(dailyScreenRowsResult.map((row) => row.label)),
  );
  const screenInflows: TrafficScreenInflow[] = trafficScreenDefinitions.map(
    (screen) => ({
      key: screen.key,
      label: screen.label,
    }),
  );
  const dailyScreenMap = new Map<string, Map<string, number>>();

  for (const row of dailyScreenRowsResult) {
    const dateMap = dailyScreenMap.get(row.label) || new Map<string, number>();
    dateMap.set(row.screen_key, numberValue(row.count));
    dailyScreenMap.set(row.label, dateMap);
  }

  const dailyScreenRows = screenLabels.map((day) => {
    const counts = screenInflows.reduce<Record<string, number>>(
      (accumulator, screen) => {
        accumulator[screen.key] = dailyScreenMap.get(day)?.get(screen.key) || 0;
        return accumulator;
      },
      {},
    );
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return { date: day, counts, total };
  }).reverse();
  const maxValue = getNiceStep(Math.max(1, maxTrendValue * 1.15) / 4) * 4;
  const periodValue = `${period?.start_label || ""}~${period?.end_label || ""}`;
  const bannerClicks: TrafficBannerClick[] = bannerClickResult.rows.map(
    (row) => ({
      key: row.banner_key || "unknown",
      label: mapBannerLabel(row.banner_key, row.banner_name),
      clicks: numberValue(row.clicks),
      uniqueClicks: numberValue(row.unique_clicks),
    }),
  );
  const bannerDateLabels = Array.from(
    new Set(dailyBannerClickRowsResult.map((row) => row.label)),
  );
  const dailyBannerMap = new Map<string, Map<string, number>>();

  for (const row of dailyBannerClickRowsResult) {
    const dateMap = dailyBannerMap.get(row.label) || new Map<string, number>();
    dateMap.set(row.item_key, numberValue(row.count));
    dailyBannerMap.set(row.label, dateMap);
  }

  const dailyBannerClickRows = bannerDateLabels.map((day) => {
    const counts = bannerClicks.reduce<Record<string, number>>(
      (accumulator, item) => {
        accumulator[item.key] = dailyBannerMap.get(day)?.get(item.key) || 0;
        return accumulator;
      },
      {},
    );
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return { date: day, counts, total };
  }).reverse();

  return {
    metrics: [
      {
        label: "전체 방문자",
        value: formatCount(totalVisitors),
        unit: "명",
        delta: totalDelta.text,
        trend: totalDelta.trend,
      },
      {
        label: "최다 유입 채널",
        value: topChannel?.count ? topChannel.label : "없음",
        delta: `전체의 ${formatPercent(topChannel?.percent || 0)}`,
        trend: "down",
      },
      {
        label: "공고 상세 방문자",
        value: formatCount(jobDetailVisitors),
        unit: "명",
        delta:
          totalVisitors > 0
            ? `전체의 ${formatPercent((jobDetailVisitors / totalVisitors) * 100)}`
            : "전체의 0%",
        trend: "down",
      },
      {
        label: "공고 상세 후속 행동률",
        value:
          jobDetailVisitors > 0
            ? formatPercent((jobDetailActivityVisitors / jobDetailVisitors) * 100)
            : "0%",
        delta: "30분 내 페이지 이동·클릭 포함",
        trend: "down",
      },
    ],
    periodLabel: `조회 기간: ${periodValue}`,
    periodValue,
    preset,
    startDate: period?.start_date || "",
    endDate: period?.end_date || "",
    channels,
    trendSeries: trafficChannelOrder.map((label) => ({
      label,
      color: trafficChannelColors[label],
      data: trendLabels.map((day) => ({
        label: day,
        value: trendMap.get(label)?.get(day) || 0,
      })),
    })),
    dailyRows,
    screenInflows,
    dailyScreenRows,
    bannerClicks,
    dailyBannerClickRows,
    yLabels: createYLabels(maxValue),
    maxValue,
    totalVisitors,
    jobDetailVisitors,
    jobDetailActivityVisitors,
  };
}

export async function getTrafficLogData(
  args?: TrafficLogQuery,
): Promise<TrafficLogData> {
  const { startDate, endDate } = createDefaultLogDates(args);
  const channel = normalizeLogChannel(args?.channel);
  const channelLabel = mapChannelFilterToLabel(channel);
  const screen = normalizeScreenFilter(args?.screen);
  const keyword = normalizeKeyword(args?.keyword);
  const page = normalizePage(args?.page);
  const pageSize = 20;
  const filterParams = [startDate, endDate, channelLabel, keyword, screen];
  const baseSql = `
    WITH input AS (
      SELECT
        $1::date AS requested_start,
        $2::date AS requested_end,
        $3::text AS requested_channel,
        $4::text AS keyword,
        $5::text AS requested_screen
    ),
    ranges AS (
      SELECT
        (LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
        ((GREATEST(requested_start, requested_end) + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
        requested_channel,
        keyword,
        requested_screen
      FROM input
    ),
    normalized_logs AS (
      SELECT
        logs.id::text AS id,
        logs.created_at AS visited_at,
        logs.ip_address::text AS ip_address,
        logs.user_agent,
        logs.path,
        COALESCE(NULLIF(logs.previous_path, ''), logs.referrer) AS referrer,
        CASE
          WHEN logs.screen_key IN (
            'home',
            'jobs',
            'job_detail',
            'ai_tools',
            'coaching',
            'interview_coaching',
            'diagnosis',
            'community',
            'calendar',
            'my',
            'login'
          ) THEN logs.screen_key
          WHEN split_part(logs.path, '?', 1) = '/' THEN 'home'
          WHEN split_part(logs.path, '?', 1) = '/jobs' THEN 'jobs'
          WHEN split_part(logs.path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
          WHEN split_part(logs.path, '?', 1) LIKE '/ai-tools/interview-coaching%' THEN 'interview_coaching'
          WHEN split_part(logs.path, '?', 1) LIKE '/ai-tools/coaching%' THEN 'coaching'
          WHEN split_part(logs.path, '?', 1) LIKE '/ai-tools/diagnosis%'
            OR split_part(logs.path, '?', 1) LIKE '/events/diagnosis%'
            THEN 'diagnosis'
          WHEN split_part(logs.path, '?', 1) = '/ai-tools'
            OR split_part(logs.path, '?', 1) LIKE '/ai-tools/job-tools%'
            THEN 'ai_tools'
          WHEN split_part(logs.path, '?', 1) LIKE '/community%' THEN 'community'
          WHEN split_part(logs.path, '?', 1) LIKE '/calendar%' THEN 'calendar'
          WHEN split_part(logs.path, '?', 1) LIKE '/my%' THEN 'my'
          WHEN split_part(logs.path, '?', 1) LIKE '/login%'
            OR split_part(logs.path, '?', 1) LIKE '/auth%'
            THEN 'login'
          ELSE 'other'
        END AS screen_key,
        CASE
          WHEN LOWER(source_value) LIKE '%instagram%'
            OR LOWER(source_value) = 'ig'
            THEN '인스타그램'
          WHEN LOWER(source_value) LIKE '%blog%'
            THEN '블로그'
          WHEN LOWER(source_value) LIKE '%thread%'
            THEN '스레드'
          WHEN source_value = '페이지 이동'
            OR LOWER(source_value) LIKE '%page_move%'
            OR LOWER(source_value) LIKE '%page move%'
            OR LOWER(source_value) LIKE '%internal%'
            THEN '페이지 이동'
          WHEN LOWER(source_value) LIKE '%naver%'
            OR LOWER(source_value) LIKE '%google%'
            OR LOWER(source_value) LIKE '%daum%'
            OR LOWER(source_value) LIKE '%search%'
            THEN '검색'
          ELSE '직접유입'
        END AS source_value,
        COALESCE(
          NULLIF(users.community_nickname, ''),
          NULLIF(users.nickname, ''),
          NULLIF(users.display_name, ''),
          NULLIF(users.email::text, ''),
          '익명'
        ) AS user_name,
        COALESCE(users.email::text, oauth.provider_email::text, '-') AS user_email,
        oauth.provider::text AS provider
      FROM (${trafficEventsSql}) logs
      LEFT JOIN public.users users ON users.id = logs.user_id
      LEFT JOIN LATERAL (
        SELECT
          account.provider,
          account.provider_email
        FROM public.user_oauth_accounts account
        WHERE account.user_id = users.id
        ORDER BY account.last_used_at DESC NULLS LAST, account.linked_at DESC
        LIMIT 1
      ) oauth ON TRUE
      CROSS JOIN ranges
      WHERE logs.event_at >= ranges.current_start
        AND logs.event_at < ranges.current_end
    ),
    filtered_logs AS (
      SELECT normalized_logs.*
      FROM normalized_logs
      CROSS JOIN ranges
      WHERE (ranges.requested_channel = '' OR normalized_logs.source_value = ranges.requested_channel)
        AND (ranges.requested_screen = 'all' OR normalized_logs.screen_key = ranges.requested_screen)
        AND (
          ranges.keyword = ''
          OR normalized_logs.path ILIKE '%' || ranges.keyword || '%'
          OR normalized_logs.referrer ILIKE '%' || ranges.keyword || '%'
          OR normalized_logs.ip_address ILIKE '%' || ranges.keyword || '%'
          OR normalized_logs.user_name ILIKE '%' || ranges.keyword || '%'
          OR normalized_logs.user_email ILIKE '%' || ranges.keyword || '%'
        )
    )
  `;
  const countResult = await query<CountRow>(
    `
      ${baseSql}
      SELECT COUNT(*) AS count
      FROM filtered_logs
    `,
    filterParams,
  );
  const totalCount = numberValue(countResult.rows[0]?.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const rowsResult = await query<TrafficLogRow>(
    `
      ${baseSql}
      SELECT *
      FROM filtered_logs
      ORDER BY visited_at DESC, id DESC
      LIMIT $6::integer OFFSET $7::integer
    `,
    [...filterParams, pageSize, (effectivePage - 1) * pageSize],
  );

  return {
    rows: rowsResult.rows.map((row) => ({
      id: row.id,
      visitedAt: formatLogDateTime(row.visited_at),
      channel: mapChannelLabel(row.source_value),
      userName: row.user_name || "익명",
      userEmail: row.user_email || "-",
      provider: mapProvider(row.provider),
      providerLabel: mapProviderLabel(row.provider),
      ipAddress: row.ip_address || "-",
      path: row.path || "-",
      referrer: row.referrer || "-",
      device: isMobileUserAgent(row.user_agent) ? "모바일" : "웹",
    })),
    totalCount,
    totalPages,
    page: effectivePage,
    pageSize,
    startDate,
    endDate,
    channel,
    screen,
    keyword,
  };
}

export async function getFunnelLogData(
  args?: FunnelLogQuery,
): Promise<FunnelLogData> {
  const { startDate, endDate } = createDefaultLogDates(args);
  const product = normalizeFunnelProduct(args?.product);
  const step = normalizeDiagnosisFunnelStep(
    product,
    normalizeFunnelStep(args?.step),
  );
  const keyword = normalizeKeyword(args?.keyword);
  const page = normalizePage(args?.page);
  const pageSize = 20;
  const productConfig = funnelProductOptions[product];
  const filterParams = [startDate, endDate, keyword, step];
  const baseSql = `
    WITH input AS (
      SELECT
        $1::date AS requested_start,
        $2::date AS requested_end,
        $3::text AS keyword,
        $4::text AS requested_step
    ),
    ranges AS (
      SELECT
        (LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
        ((GREATEST(requested_start, requested_end) + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
        keyword,
        requested_step
      FROM input
    ),
    visits AS (
      SELECT
        logs.id::TEXT AS id,
        logs.visitor_key,
        logs.user_id,
        logs.anonymous_id,
        logs.event_at,
        logs.landing_path AS path,
        COALESCE(NULLIF(logs.previous_path, ''), logs.referrer, '-') AS referrer,
        logs.source_value AS channel,
        logs.ip_address::TEXT AS ip_address,
        logs.user_agent
      FROM (${trafficEventsSql}) logs, ranges
      WHERE logs.event_at >= ranges.current_start
        AND logs.event_at < ranges.current_end
        AND ${productConfig.visitWhere}
    ),
    starts AS (
      SELECT start_events.*
      FROM (${productConfig.startSql}) start_events, ranges
      WHERE start_events.event_at >= ranges.current_start
        AND start_events.event_at < ranges.current_end
    ),
    completes AS (
      SELECT complete_events.*
      FROM (${productConfig.completeSql}) complete_events, ranges
      WHERE complete_events.event_at >= ranges.current_start
        AND complete_events.event_at < ranges.current_end
    ),
    selected_events AS (
      SELECT visits.*, '방문' AS last_action
      FROM visits, ranges
      WHERE ranges.requested_step = 'visit'
      UNION ALL
      SELECT starts.*, $5::text AS last_action
      FROM starts, ranges
      WHERE ranges.requested_step = 'start'
      UNION ALL
      SELECT completes.*, $6::text AS last_action
      FROM completes, ranges
      WHERE ranges.requested_step = 'complete'
      UNION ALL
      SELECT visits.*, '방문 후 이탈' AS last_action
      FROM visits
      CROSS JOIN ranges
      LEFT JOIN starts ON starts.visitor_key = visits.visitor_key
      WHERE ranges.requested_step = 'visit_drop'
        AND starts.visitor_key IS NULL
      UNION ALL
      SELECT starts.*, '시작 후 이탈' AS last_action
      FROM starts
      CROSS JOIN ranges
      LEFT JOIN completes ON completes.visitor_key = starts.visitor_key
      WHERE ranges.requested_step = 'start_drop'
        AND completes.visitor_key IS NULL
    ),
    deduped_events AS (
      SELECT *
      FROM (
        SELECT
          selected_events.*,
          ROW_NUMBER() OVER (
            PARTITION BY selected_events.visitor_key
            ORDER BY selected_events.event_at DESC, selected_events.id DESC
          ) AS row_no
        FROM selected_events
      ) ranked
      WHERE ranked.row_no = 1
    ),
    enriched_events AS (
      SELECT
        deduped_events.id,
        deduped_events.event_at,
        COALESCE(
          NULLIF(users.community_nickname, ''),
          NULLIF(users.nickname, ''),
          NULLIF(users.display_name, ''),
          NULLIF(users.email::text, ''),
          '익명'
        ) AS user_name,
        COALESCE(users.email::text, oauth.provider_email::text, '-') AS user_email,
        oauth.provider::text AS provider,
        deduped_events.anonymous_id::TEXT AS anonymous_id,
        deduped_events.ip_address,
        deduped_events.user_agent,
        deduped_events.channel,
        deduped_events.path,
        deduped_events.referrer,
        deduped_events.last_action
      FROM deduped_events
      LEFT JOIN public.users users ON users.id = deduped_events.user_id
      LEFT JOIN LATERAL (
        SELECT
          account.provider,
          account.provider_email
        FROM public.user_oauth_accounts account
        WHERE account.user_id = users.id
        ORDER BY account.last_used_at DESC NULLS LAST, account.linked_at DESC
        LIMIT 1
      ) oauth ON TRUE
    ),
    filtered_events AS (
      SELECT enriched_events.*
      FROM enriched_events
      CROSS JOIN ranges
      WHERE ranges.keyword = ''
        OR enriched_events.user_name ILIKE '%' || ranges.keyword || '%'
        OR enriched_events.user_email ILIKE '%' || ranges.keyword || '%'
        OR enriched_events.ip_address ILIKE '%' || ranges.keyword || '%'
        OR enriched_events.path ILIKE '%' || ranges.keyword || '%'
        OR enriched_events.referrer ILIKE '%' || ranges.keyword || '%'
    )
  `;
  const countResult = await query<CountRow>(
    `
      ${baseSql}
      SELECT COUNT(*) AS count
      FROM filtered_events
    `,
    [...filterParams, productConfig.startAction, productConfig.completeAction],
  );
  const totalCount = numberValue(countResult.rows[0]?.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const rowsResult = await query<FunnelLogRow>(
    `
      ${baseSql}
      SELECT *
      FROM filtered_events
      ORDER BY event_at DESC, id DESC
      LIMIT $7::integer OFFSET $8::integer
    `,
    [
      ...filterParams,
      productConfig.startAction,
      productConfig.completeAction,
      pageSize,
      (effectivePage - 1) * pageSize,
    ],
  );

  return {
    rows: rowsResult.rows.map((row) => ({
      id: row.id,
      eventAt: formatLogDateTime(row.event_at),
      userName: row.user_name || "익명",
      userEmail: row.user_email || "-",
      provider: mapProvider(row.provider),
      providerLabel: mapProviderLabel(row.provider),
      anonymousId: row.anonymous_id || "-",
      ipAddress: row.ip_address || "-",
      device: row.user_agent
        ? isMobileUserAgent(row.user_agent)
          ? "모바일"
          : "웹"
        : "알 수 없음",
      channel: mapChannelLabel(row.channel),
      path: row.path || "-",
      referrer: row.referrer || "-",
      lastAction: row.last_action,
    })),
    totalCount,
    totalPages,
    page: effectivePage,
    pageSize,
    product,
    productLabel: productConfig.label,
    step,
    stepLabel:
      step === "start"
        ? productConfig.startAction
        : step === "complete"
          ? productConfig.completeAction
          : funnelStepLabels[step],
    startDate,
    endDate,
    keyword,
  };
}

export async function getBannerClickLogData(
  args?: BannerClickLogQuery,
): Promise<BannerClickLogData> {
  const { startDate, endDate } = createDefaultLogDates(args);
  const bannerKey = normalizeBannerKey(args?.bannerKey);
  const keyword = normalizeKeyword(args?.keyword);
  const page = normalizePage(args?.page);
  const pageSize = 20;
  const filterParams = [startDate, endDate, keyword, bannerKey];
  const baseSql = `
    WITH input AS (
      SELECT
        $1::date AS requested_start,
        $2::date AS requested_end,
        $3::text AS keyword,
        $4::text AS requested_banner_key
    ),
    ranges AS (
      SELECT
        (LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
        ((GREATEST(requested_start, requested_end) + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
        keyword,
        requested_banner_key
      FROM input
    ),
    normalized_clicks AS (
      SELECT
        events.id::text AS id,
        events.created_at AS clicked_at,
        CASE
          WHEN events.event_type = 'banner_click'
          THEN COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown')
          ELSE events.event_type
        END AS banner_key,
        CASE
          WHEN events.event_type = 'job_detail_bookmark_click' THEN '공고 찜하고 준비하기'
          WHEN events.event_type = 'job_detail_apply_click' THEN '지원하기/이메일 지원하기'
          ELSE NULLIF(events.properties->>'banner_name', '')
        END AS banner_name,
        COALESCE(
          NULLIF(events.properties->>'placement', ''),
          CASE
            WHEN events.event_type = 'banner_click' THEN '-'
            ELSE 'job_detail_action'
          END
        ) AS placement,
        COALESCE(NULLIF(events.properties->>'target_path', ''), '-') AS target_path,
        COALESCE(NULLIF(events.properties->>'path', ''), '-') AS source_path,
        COALESCE(
          NULLIF(users.community_nickname, ''),
          NULLIF(users.nickname, ''),
          NULLIF(users.display_name, ''),
          NULLIF(users.email::text, ''),
          '익명'
        ) AS user_name,
        COALESCE(users.email::text, oauth.provider_email::text, '-') AS user_email,
        oauth.provider::text AS provider,
        events.anonymous_id::text AS anonymous_id,
        COALESCE(NULLIF(events.properties->>'ip_address', ''), '-') AS ip_address,
        NULLIF(events.properties->>'user_agent', '') AS user_agent
      FROM public.product_events events
      LEFT JOIN public.users users ON users.id = events.user_id
      LEFT JOIN LATERAL (
        SELECT
          account.provider,
          account.provider_email
        FROM public.user_oauth_accounts account
        WHERE account.user_id = users.id
        ORDER BY account.last_used_at DESC NULLS LAST, account.linked_at DESC
        LIMIT 1
      ) oauth ON TRUE
      CROSS JOIN ranges
      WHERE (
          events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
          OR (
            events.event_type = 'banner_click'
            AND COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown') IN (
              'job_detail_resume_a',
              'job_detail_resume_b',
              'job_detail_strength_a',
              'job_detail_strength_b'
            )
          )
        )
        AND events.created_at >= ranges.current_start
        AND events.created_at < ranges.current_end
    ),
    filtered_clicks AS (
      SELECT normalized_clicks.*
      FROM normalized_clicks
      CROSS JOIN ranges
      WHERE (
        ranges.keyword = ''
        OR normalized_clicks.banner_key ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.banner_name ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.placement ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.target_path ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.source_path ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.user_name ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.user_email ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.anonymous_id ILIKE '%' || ranges.keyword || '%'
        OR normalized_clicks.ip_address ILIKE '%' || ranges.keyword || '%'
      )
      AND (
        ranges.requested_banner_key = ''
        OR normalized_clicks.banner_key = ranges.requested_banner_key
      )
    )
  `;
  const countResult = await query<CountRow>(
    `
      ${baseSql}
      SELECT COUNT(*) AS count
      FROM filtered_clicks
    `,
    filterParams,
  );
  const totalCount = numberValue(countResult.rows[0]?.count);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const effectivePage = Math.min(page, totalPages);
  const rowsResult = await query<BannerClickLogRow>(
    `
      ${baseSql}
      SELECT *
      FROM filtered_clicks
      ORDER BY clicked_at DESC, id DESC
      LIMIT $5::integer OFFSET $6::integer
    `,
    [...filterParams, pageSize, (effectivePage - 1) * pageSize],
  );

  return {
    rows: rowsResult.rows.map((row) => ({
      id: row.id,
      clickedAt: formatLogDateTime(row.clicked_at),
      bannerKey: row.banner_key || "unknown",
      bannerName: mapBannerLabel(row.banner_key, row.banner_name),
      placement: row.placement || "-",
      targetPath: row.target_path || "-",
      sourcePath: row.source_path || "-",
      userName: row.user_name || "익명",
      userEmail: row.user_email || "-",
      provider: mapProvider(row.provider),
      providerLabel: mapProviderLabel(row.provider),
      anonymousId: row.anonymous_id ? row.anonymous_id.slice(0, 8) : "-",
      ipAddress: row.ip_address || "-",
      device: getDeviceLabel(row.user_agent),
    })),
    totalCount,
    totalPages,
    page: effectivePage,
    pageSize,
    startDate,
    endDate,
    bannerKey,
    keyword,
  };
}

export async function getCampaignPerformanceData(
  args?: TrafficQuery,
): Promise<CampaignPerformanceData> {
  const normalizedArgs = { ...args, preset: args?.preset || args?.period };
  const preset = normalizePreset(normalizedArgs.preset);
  const params = createParams(normalizedArgs);
  const period = await getPeriod(params);

  const result = await query<CampaignRow>(
    `
      ${periodBoundsSql},
      traffic_ranked AS (
        SELECT
          campaign,
          link,
          source_value AS source,
          medium,
          ${visitorKeySql} AS visitor_key,
          landing_path,
          event_at,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY ${visitorKeySql}
            ORDER BY
              CASE
                WHEN campaign <> '캠페인 없음' OR source_value <> 'direct' THEN 0
                ELSE 1
              END,
              event_at ASC,
              created_at ASC
          ) AS row_no
        FROM (${campaignTrafficEventsSql}) traffic_events, ranges
        WHERE event_at >= current_start
          AND event_at < current_end
      ),
      traffic AS (
        SELECT
          campaign,
          link,
          source,
          medium,
          COUNT(*) FILTER (WHERE row_no = 1) AS visitors,
          0::BIGINT AS diagnosis_starts,
          MAX(event_at) AS last_seen_at
        FROM traffic_ranked
        GROUP BY campaign, link, source, medium
      ),
      diagnosis AS (
        SELECT
          COALESCE(NULLIF(current_campaign, ''), NULLIF(first_campaign, ''), '캠페인 없음') AS campaign,
          COALESCE(NULLIF(current_content, ''), NULLIF(current_term, ''), NULLIF(current_landing_path, ''), NULLIF(first_content, ''), NULLIF(first_term, ''), NULLIF(first_landing_path, ''), '-') AS link,
          COALESCE(NULLIF(current_source, ''), NULLIF(first_source, ''), 'direct') AS source,
          COALESCE(NULLIF(current_medium, ''), NULLIF(first_medium, ''), '-') AS medium,
          COUNT(*) FILTER (
            WHERE event_type = 'diagnosis_start'
              AND properties->>'action' IN ('question_1_view', 'start_button_click')
          ) AS diagnosis_starts,
          COUNT(*) FILTER (WHERE event_type = 'diagnosis_complete') AS diagnosis_completes,
          MAX(created_at) AS last_seen_at
        FROM public.product_events, ranges
        WHERE created_at >= current_start
          AND created_at < current_end
          AND event_type IN ('diagnosis_start', 'diagnosis_complete')
        GROUP BY campaign, link, source, medium
      ),
      signup AS (
        SELECT
          COALESCE(NULLIF(attribution.first_campaign, ''), '캠페인 없음') AS campaign,
          COALESCE(NULLIF(attribution.first_content, ''), NULLIF(attribution.first_term, ''), NULLIF(attribution.first_landing_path, ''), '-') AS link,
          COALESCE(NULLIF(attribution.first_source, ''), 'direct') AS source,
          COALESCE(NULLIF(attribution.first_medium, ''), '-') AS medium,
          COUNT(*) AS signups,
          MAX(users.created_at) AS last_seen_at
        FROM public.users users
        LEFT JOIN public.user_attributions attribution
          ON attribution.user_id = users.id
        CROSS JOIN ranges
        WHERE users.created_at >= current_start
          AND users.created_at < current_end
        GROUP BY campaign, link, source, medium
      ),
      keys AS (
        SELECT campaign, link, source, medium FROM traffic
        UNION
        SELECT campaign, link, source, medium FROM diagnosis
        UNION
        SELECT campaign, link, source, medium FROM signup
      )
      SELECT
        keys.campaign,
        keys.link,
        keys.source,
        keys.medium,
        COALESCE(traffic.visitors, 0) AS visitors,
        GREATEST(
          COALESCE(traffic.diagnosis_starts, 0),
          COALESCE(diagnosis.diagnosis_starts, 0),
          COALESCE(diagnosis.diagnosis_completes, 0)
        ) AS diagnosis_starts,
        COALESCE(diagnosis.diagnosis_completes, 0) AS diagnosis_completes,
        COALESCE(signup.signups, 0) AS signups,
        GREATEST(
          COALESCE(traffic.last_seen_at, '-infinity'::timestamptz),
          COALESCE(diagnosis.last_seen_at, '-infinity'::timestamptz),
          COALESCE(signup.last_seen_at, '-infinity'::timestamptz)
        )::text AS last_seen_at
      FROM keys
      LEFT JOIN traffic
        ON traffic.campaign = keys.campaign
       AND traffic.link = keys.link
       AND traffic.source = keys.source
       AND traffic.medium = keys.medium
      LEFT JOIN diagnosis
        ON diagnosis.campaign = keys.campaign
       AND diagnosis.link = keys.link
       AND diagnosis.source = keys.source
       AND diagnosis.medium = keys.medium
      LEFT JOIN signup
        ON signup.campaign = keys.campaign
       AND signup.link = keys.link
       AND signup.source = keys.source
       AND signup.medium = keys.medium
      ORDER BY COALESCE(traffic.visitors, 0) DESC, COALESCE(diagnosis.diagnosis_completes, 0) DESC, keys.campaign ASC
      LIMIT 50
    `,
    params,
  );

  const rows: CampaignPerformanceRow[] = result.rows.map((row, index) => {
    const visitors = numberValue(row.visitors);
    const diagnosisStarts = numberValue(row.diagnosis_starts);
    const diagnosisCompletes = numberValue(row.diagnosis_completes);
    const conversionBase = Math.max(visitors, diagnosisStarts, diagnosisCompletes);

    return {
      id: `${row.campaign || "none"}-${row.link || "none"}-${index}`,
      campaign: row.campaign || "캠페인 없음",
      link: row.link || "-",
      source: mapChannelLabel(row.source),
      medium: row.medium || "-",
      visitors,
      diagnosisStarts,
      diagnosisCompletes,
      signups: numberValue(row.signups),
      conversionRate:
        conversionBase > 0 ? (diagnosisCompletes / conversionBase) * 100 : 0,
      lastSeenAt: formatDateTime(row.last_seen_at),
    };
  });
  const totalVisitors = rows.reduce((sum, row) => sum + row.visitors, 0);
  const totalCompletes = rows.reduce((sum, row) => sum + row.diagnosisCompletes, 0);
  const totalSignups = rows.reduce((sum, row) => sum + row.signups, 0);
  const totalConversionBase = Math.max(totalVisitors, totalCompletes);
  const topRow = rows[0];
  const periodValue = `${period?.start_label || ""}~${period?.end_label || ""}`;

  return {
    metrics: [
      {
        label: "캠페인 유입",
        value: formatCount(totalVisitors),
        unit: "명",
        delta: `${presetLabels[preset]} 기준`,
        trend: "down",
      },
      {
        label: "진단 완료",
        value: formatCount(totalCompletes),
        unit: "건",
        delta: `완료율 ${formatPercent(totalConversionBase > 0 ? (totalCompletes / totalConversionBase) * 100 : 0)}`,
        trend: "down",
      },
      {
        label: "신규 가입",
        value: formatCount(totalSignups),
        unit: "명",
        delta: "캠페인 최초 유입 기준",
        trend: "down",
      },
      {
        label: "최고 성과 링크",
        value: topRow ? topRow.campaign : "없음",
        delta: topRow ? `${formatCount(topRow.visitors)}명 유입` : "0명 유입",
        trend: "down",
      },
    ],
    periodLabel: `조회 기간: ${periodValue}`,
    periodValue,
    preset,
    startDate: period?.start_date || "",
    endDate: period?.end_date || "",
    rows,
    totalVisitors,
  };
}

function formatDateTime(value?: string | null) {
  if (!value || value === "-infinity") return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\.\s?/g, "/")
    .replace(/\/$/, "");
}

function formatLogDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\.\s?/g, ".")
    .replace(/\.$/, "");
}

function isMobileUserAgent(value?: string | null) {
  return /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    value || "",
  );
}

function getDeviceLabel(value?: string | null): "모바일" | "웹" | "알 수 없음" {
  if (!value) return "알 수 없음";
  return isMobileUserAgent(value) ? "모바일" : "웹";
}
