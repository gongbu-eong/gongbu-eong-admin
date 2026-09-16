import {
  BannerClickItem,
  BehaviorPatternItem,
  ChannelItem,
  DashboardProductOption,
  FunnelItem,
  LinePoint,
  MetricItem,
  ScreenInflowItem,
} from "@/features/admin/data/dashboard";
import { query } from "@/features/admin/server/db";

type DashboardData = {
  metrics: MetricItem[];
  visitorTrend: LinePoint[];
  coachingTrend: LinePoint[];
  signupTrend: LinePoint[];
  productRateTrend: LinePoint[];
  productVisitTrend: LinePoint[];
  productStartTrend: LinePoint[];
  productCompleteTrend: LinePoint[];
  funnelItems: FunnelItem[];
  channels: ChannelItem[];
  channelTotal: string;
  bannerClicks: BannerClickItem[];
  bannerClickTotal: string;
  behaviorPatterns: BehaviorPatternItem[];
  screenInflows: ScreenInflowItem[];
  screenInflowTotal: string;
  selectedChannelKey: string;
  selectedChannelLabel: string;
  selectedProductKey: string;
  selectedProductLabel: string;
  dashboardStartDate: string;
  dashboardEndDate: string;
  dashboardPeriodLabel: string;
  productOptions: DashboardProductOption[];
  productFunnelTitle: string;
  productFunnelDescription: string;
  productRateTrendTitle: string;
};

type MetricsRow = {
  today_visitors: string;
  yesterday_visitors: string;
  today_signups: string;
  yesterday_signups: string;
};

type ProductRangeMetricsRow = {
  current_starts: string;
  previous_starts: string;
  current_completes: string;
  previous_completes: string;
};

type TrendRow = {
  label: string;
  value: string;
};

type ConversionTrendRow = {
  label: string;
  visits: string;
  starts: string;
  completes: string;
};

type FunnelRow = {
  page_visits: string;
  coaching_started: string;
  coaching_completed: string;
};

type ChannelRow = {
  label: string;
  count: string;
};

type BannerClickRow = {
  banner_key: string | null;
  banner_name: string | null;
  click_count: string;
  unique_count: string;
};

type ScreenInflowRow = {
  channel_source: string | null;
  screen_key: string;
  inflow_count: string;
};

type BehaviorPatternRow = {
  channel_label: string;
  visitors: string;
  bounce_count: string;
  revisit_count: string;
  action_count: string;
  page_move_count: string;
};

const channelAssets: Record<string, Pick<ChannelItem, "icon" | "iconClass">> = {
  "인스타그램": { icon: "/admin-assets/channel-instagram.svg" },
  "블로그": { icon: "/admin-assets/channel-blog.png", iconClass: "blog" },
  "스레드": { icon: "/admin-assets/channel-threads.png", iconClass: "threads" },
  "검색": { icon: "/admin-assets/channel-search.png", iconClass: "search" },
  "페이지 이동": { icon: "/admin-assets/channel-direct.png", iconClass: "direct" },
  "직접유입": { icon: "/admin-assets/channel-direct.png", iconClass: "direct" },
};

const dashboardChannelOptions = [
  { key: "all", label: "전체" },
  { key: "instagram", label: "인스타그램" },
  { key: "blog", label: "블로그" },
  { key: "threads", label: "스레드" },
  { key: "search", label: "검색" },
  { key: "page_move", label: "페이지 이동" },
  { key: "direct", label: "직접유입" },
];

const dashboardProductOptions = [
  { key: "diagnosis", label: "강점·성향 유형" },
  { key: "resume_coaching", label: "AI NCS 자소서" },
  { key: "interview_coaching", label: "AI NCS 면접" },
] satisfies DashboardProductOption[];

const bannerLabels: Record<string, string> = {
  job_detail_resume_a: "자소서 배너 A",
  job_detail_resume_b: "자소서 배너 B",
  job_detail_strength_a: "강약점 배너 A",
  job_detail_strength_b: "강약점 배너 B",
  job_detail_bookmark_click: "공고 찜하고 준비하기",
  job_detail_apply_click: "지원하기/이메일 지원하기",
};

const dashboardScreenKeys = [
  { key: "home", label: "홈" },
  { key: "job_detail", label: "공고상세" },
  { key: "diagnosis", label: "강약점" },
  { key: "community", label: "커뮤니티" },
  { key: "my", label: "마이페이지" },
  { key: "calendar", label: "캘린더" },
  { key: "login", label: "로그인" },
  { key: "other", label: "기타" },
];

const visitorKeySql =
  "COALESCE(user_id::TEXT, session_id::TEXT, anonymous_id::TEXT, NULLIF(CONCAT_WS('|', ip_address::TEXT, NULLIF(user_agent, '')), ''))";

const trafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
    session_id,
    ip_address,
    id,
    event_name,
    user_agent,
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

const coachingStartEventsSql = `
  SELECT id::TEXT AS request_key, COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.resume_coaching_requests
`;

const coachingCompleteEventsSql = `
  SELECT results.id::TEXT AS result_key, results.created_at AS event_at
  FROM public.resume_coaching_results results
`;

const coachingPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND split_part(path, '?', 1) = '/ai-tools/coaching'
`;

const diagnosisStartEventsSql = `
  SELECT
    id::TEXT AS request_key,
    COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key,
    created_at AS event_at
  FROM public.product_events
  WHERE event_type = 'diagnosis_start'
    AND properties->>'action' = 'start_button_click'
`;

const diagnosisCompleteEventsSql = `
  SELECT
    results.id::TEXT AS result_key,
    COALESCE(results.user_id::TEXT, results.id::TEXT) AS visitor_key,
    COALESCE(runs.completed_at, results.created_at) AS event_at
  FROM public.diagnosis_results results
  JOIN public.diagnosis_runs runs ON runs.id = results.diagnosis_run_id
`;

const diagnosisPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND split_part(path, '?', 1) IN ('/ai-tools/diagnosis', '/events/diagnosis')
`;

const interviewStartEventsSql = `
  SELECT
    sessions.id::TEXT AS request_key,
    COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
    sessions.started_at AS event_at
  FROM public.interview_coaching_sessions sessions
`;

const interviewCompleteEventsSql = `
  SELECT
    sessions.id::TEXT AS result_key,
    COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
    COALESCE(sessions.completed_at, sessions.updated_at, sessions.started_at) AS event_at
  FROM public.interview_coaching_sessions sessions
  WHERE sessions.completed_at IS NOT NULL OR sessions.result IS NOT NULL
`;

const interviewPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND split_part(path, '?', 1) = '/ai-tools/interview-coaching'
`;

type DashboardProductConfig = {
  key: string;
  label: string;
  metricLabel: string;
  completionRateLabel: string;
  startStepLabel: string;
  completeStepLabel: string;
  funnelTitle: string;
  funnelDescription: string;
  rateTrendTitle: string;
  pageVisitEventsSql: string;
  startEventsSql: string;
  completeEventsSql: string;
};

const productAnalyticsConfigs: Record<string, DashboardProductConfig> = {
  diagnosis: {
    key: "diagnosis",
    label: "강점·성향 유형",
    metricLabel: "강점·성향 유형",
    completionRateLabel: "진단 완료율",
    startStepLabel: "진단 시작",
    completeStepLabel: "진단 완료",
    funnelTitle: "강점·성향 유형 전환 퍼널",
    funnelDescription: "방문부터 결과 확인까지 유저의 이탈률을 봅니다.",
    rateTrendTitle: "강점·성향 진단 완료 추이",
    pageVisitEventsSql: diagnosisPageVisitEventsSql,
    startEventsSql: diagnosisStartEventsSql,
    completeEventsSql: diagnosisCompleteEventsSql,
  },
  resume_coaching: {
    key: "resume_coaching",
    label: "AI NCS 자소서 코칭",
    metricLabel: "AI NCS 자소서 코칭",
    completionRateLabel: "코칭 완료율",
    startStepLabel: "코칭 시작",
    completeStepLabel: "코칭 완료",
    funnelTitle: "AI NCS 자소서 코칭 전환 퍼널",
    funnelDescription: "방문부터 결과 확인까지 유저의 이탈률을 봅니다.",
    rateTrendTitle: "AI NCS 자소서 코칭 완료 추이",
    pageVisitEventsSql: coachingPageVisitEventsSql,
    startEventsSql: coachingStartEventsSql,
    completeEventsSql: coachingCompleteEventsSql,
  },
  interview_coaching: {
    key: "interview_coaching",
    label: "AI NCS 면접 코칭",
    metricLabel: "AI NCS 면접 코칭",
    completionRateLabel: "코칭 완료율",
    startStepLabel: "코칭 시작",
    completeStepLabel: "코칭 완료",
    funnelTitle: "AI NCS 면접 코칭 전환 퍼널",
    funnelDescription: "방문부터 결과 확인까지 유저의 이탈률을 봅니다.",
    rateTrendTitle: "AI NCS 면접 코칭 완료 추이",
    pageVisitEventsSql: interviewPageVisitEventsSql,
    startEventsSql: interviewStartEventsSql,
    completeEventsSql: interviewCompleteEventsSql,
  },
};

function numberValue(value: string | number | null | undefined) {
  return Number(value || 0);
}

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function createDelta(current: number, previous: number) {
  if (previous <= 0) {
    return {
      text: current > 0 ? "▲ 100% 어제보다" : "0% 어제보다",
      trend: current > 0 ? ("up" as const) : ("down" as const),
    };
  }

  const diff = ((current - previous) / previous) * 100;
  const direction = diff >= 0 ? "▲" : "▼";

  return {
    text: `${direction} ${Math.abs(diff).toFixed(1).replace(/\.0$/, "")}% 어제보다`,
    trend: diff >= 0 ? ("up" as const) : ("down" as const),
  };
}

function createPeriodDelta(current: number, previous: number) {
  const delta = createDelta(current, previous);

  return {
    ...delta,
    text: delta.text.replace("어제보다", "이전 기간 대비"),
  };
}

function toLinePoints(rows: TrendRow[]) {
  return rows.map((row) => ({
    label: row.label,
    value: numberValue(row.value),
  }));
}

function fillPercent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function createFunnel(
  step: number,
  label: string,
  value: number,
  previousValue: number | null,
  baseValue: number,
  href?: string,
  dropHref?: string,
): FunnelItem {
  if (!previousValue) {
    return {
      step,
      label,
      value: `${formatCount(value)}명`,
      fill: fillPercent(value, baseValue),
      href,
    };
  }

  const conversion = previousValue > 0 ? (value / previousValue) * 100 : 0;
  const dropped = Math.max(0, previousValue - value);

  return {
    step,
    label,
    value: `${formatCount(value)}명`,
    fill: fillPercent(value, baseValue),
    href,
    conversion: `(전환 ${formatPercent(conversion)})`,
    drop: `(이탈 ${formatCount(dropped)}명)`,
    dropHref,
  };
}

function mapChannelLabel(source: string | null) {
  const trimmed = (source || "").trim();
  if (channelAssets[trimmed]) return trimmed;

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

function normalizeDashboardChannel(value: string | null | undefined) {
  const key = (value || "all").trim().toLowerCase();

  return dashboardChannelOptions.some((item) => item.key === key) ? key : "all";
}

function normalizeDashboardProduct(value: string | null | undefined) {
  const key = (value || "diagnosis").trim().toLowerCase();

  return productAnalyticsConfigs[key]?.key || "diagnosis";
}

function toKstDateInput(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(date);
}

function normalizeDateInput(value: string | null | undefined) {
  const trimmed = (value || "").trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function createDashboardDateRange({
  startDate,
  endDate,
}: {
  startDate?: string | null;
  endDate?: string | null;
} = {}) {
  const today = toKstDateInput();
  const normalizedStartDate = normalizeDateInput(startDate) || today;
  const normalizedEndDate = normalizeDateInput(endDate) || today;
  const [rangeStartDate, rangeEndDate] =
    normalizedStartDate <= normalizedEndDate
      ? [normalizedStartDate, normalizedEndDate]
      : [normalizedEndDate, normalizedStartDate];

  return {
    startDate: rangeStartDate,
    endDate: rangeEndDate,
    label:
      rangeStartDate === rangeEndDate
        ? rangeStartDate
        : `${rangeStartDate} ~ ${rangeEndDate}`,
  };
}

const dashboardRangeSql = `
  WITH input_range AS (
    SELECT $1::date AS requested_start, $2::date AS requested_end
  ),
  ranges AS (
    SELECT
      LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul' AS range_start,
      (GREATEST(requested_start, requested_end)::timestamp + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS range_end,
      (
        LEAST(requested_start, requested_end)::timestamp
        - ((GREATEST(requested_start, requested_end) - LEAST(requested_start, requested_end) + 1) * INTERVAL '1 day')
      ) AT TIME ZONE 'Asia/Seoul' AS previous_start,
      LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul' AS previous_end
    FROM input_range
  )
`;

function mapBannerLabel(key: string | null, name: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedKey = key?.trim();
  if (!trimmedKey) return "알 수 없는 배너";

  return bannerLabels[trimmedKey] || trimmedKey;
}

export async function getDashboardData({
  selectedChannel,
  selectedProduct,
  startDate,
  endDate,
}: {
  selectedChannel?: string | null;
  selectedProduct?: string | null;
  startDate?: string | null;
  endDate?: string | null;
} = {}): Promise<DashboardData> {
  const selectedChannelKey = normalizeDashboardChannel(selectedChannel);
  const selectedChannelLabel =
    dashboardChannelOptions.find((item) => item.key === selectedChannelKey)
      ?.label || "전체";
  const selectedProductKey = normalizeDashboardProduct(selectedProduct);
  const selectedProductConfig = productAnalyticsConfigs[selectedProductKey];
  const dashboardDateRange = createDashboardDateRange({ startDate, endDate });
  const dashboardDateParams = [
    dashboardDateRange.startDate,
    dashboardDateRange.endDate,
  ];

  const metricsResult = await query<MetricsRow>(`
    WITH bounds AS (
      SELECT date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AS today_kst
    ),
    ranges AS (
      SELECT
        today_kst AT TIME ZONE 'Asia/Seoul' AS today_start,
        (today_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start,
        (today_kst - INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS yesterday_start
      FROM bounds
    )
    SELECT
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_visitors,
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= yesterday_start AND event_at < today_start
      ) AS yesterday_visitors,
      (
        SELECT COUNT(*)
        FROM public.users, ranges
        WHERE status = 'active'
          AND COALESCE(signup_completed_at, created_at) >= today_start
          AND COALESCE(signup_completed_at, created_at) < tomorrow_start
      ) AS today_signups,
      (
        SELECT COUNT(*)
        FROM public.users, ranges
        WHERE status = 'active'
          AND COALESCE(signup_completed_at, created_at) >= yesterday_start
          AND COALESCE(signup_completed_at, created_at) < today_start
      ) AS yesterday_signups
    FROM ranges
  `);

  const metricsRow = metricsResult.rows[0];
  const todayVisitors = numberValue(metricsRow?.today_visitors);
  const yesterdayVisitors = numberValue(metricsRow?.yesterday_visitors);
  const todaySignups = numberValue(metricsRow?.today_signups);
  const yesterdaySignups = numberValue(metricsRow?.yesterday_signups);
  const productRangeMetricsResult = await query<ProductRangeMetricsRow>(
    `
      ${dashboardRangeSql}
      SELECT
        (
          SELECT COUNT(DISTINCT request_key)
          FROM (${selectedProductConfig.startEventsSql}) starts, ranges
          WHERE event_at >= range_start AND event_at < range_end
        ) AS current_starts,
        (
          SELECT COUNT(DISTINCT request_key)
          FROM (${selectedProductConfig.startEventsSql}) starts, ranges
          WHERE event_at >= previous_start AND event_at < previous_end
        ) AS previous_starts,
        (
          SELECT COUNT(DISTINCT result_key)
          FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
          WHERE event_at >= range_start AND event_at < range_end
        ) AS current_completes,
        (
          SELECT COUNT(DISTINCT result_key)
          FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
          WHERE event_at >= previous_start AND event_at < previous_end
        ) AS previous_completes
      FROM ranges
    `,
    dashboardDateParams,
  );
  const productRangeMetricsRow = productRangeMetricsResult.rows[0];
  const rangeCoachingRequests = numberValue(
    productRangeMetricsRow?.current_starts,
  );
  const previousRangeCoachingRequests = numberValue(
    productRangeMetricsRow?.previous_starts,
  );
  const rangeCoachingCompleted = numberValue(
    productRangeMetricsRow?.current_completes,
  );
  const previousRangeCoachingCompleted = numberValue(
    productRangeMetricsRow?.previous_completes,
  );
  const todayCompletionRate =
    rangeCoachingRequests > 0
      ? (rangeCoachingCompleted / rangeCoachingRequests) * 100
      : 0;
  const yesterdayCompletionRate =
    previousRangeCoachingRequests > 0
      ? (previousRangeCoachingCompleted / previousRangeCoachingRequests) * 100
      : 0;

  const visitorDelta = createDelta(todayVisitors, yesterdayVisitors);
  const signupDelta = createDelta(todaySignups, yesterdaySignups);
  const coachingDelta = createPeriodDelta(
    rangeCoachingRequests,
    previousRangeCoachingRequests,
  );
  const completionDelta = createPeriodDelta(
    todayCompletionRate,
    yesterdayCompletionRate,
  );

  const [
    visitorTrendResult,
    coachingTrendResult,
    signupTrendResult,
    productRateTrendResult,
    productConversionTrendResult,
  ] =
    await Promise.all([
      query<TrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          ) AS day_kst
        )
        SELECT
          to_char(days.day_kst, 'MM/DD') AS label,
          COUNT(DISTINCT traffic_events.visitor_key) AS value
        FROM days
        LEFT JOIN (${trafficEventsSql}) traffic_events
          ON traffic_events.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
         AND traffic_events.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
        GROUP BY days.day_kst
        ORDER BY days.day_kst
      `),
      query<TrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          ) AS day_kst
        )
        SELECT to_char(days.day_kst, 'MM/DD') AS label, COUNT(DISTINCT starts.request_key) AS value
        FROM days
        LEFT JOIN (${selectedProductConfig.startEventsSql}) starts
          ON starts.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
         AND starts.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
        GROUP BY days.day_kst
        ORDER BY days.day_kst
      `),
      query<TrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          ) AS day_kst
        )
        SELECT to_char(days.day_kst, 'MM/DD') AS label, COUNT(users.id) AS value
        FROM days
        LEFT JOIN public.users users
          ON users.status = 'active'
         AND COALESCE(users.signup_completed_at, users.created_at) >= days.day_kst AT TIME ZONE 'Asia/Seoul'
         AND COALESCE(users.signup_completed_at, users.created_at) < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
        GROUP BY days.day_kst
        ORDER BY days.day_kst
      `),
      query<TrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          ) AS day_kst
        )
        SELECT
          to_char(days.day_kst, 'MM/DD') AS label,
          COUNT(DISTINCT completes.result_key) AS value
        FROM days
        LEFT JOIN (${selectedProductConfig.completeEventsSql}) completes
            ON completes.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
           AND completes.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
        GROUP BY days.day_kst
        ORDER BY days.day_kst
      `),
      query<ConversionTrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          ) AS day_kst
        ),
        visits AS (
          SELECT
            days.day_kst,
            COUNT(DISTINCT page_visits.visitor_key) AS value
          FROM days
          LEFT JOIN (${selectedProductConfig.pageVisitEventsSql}) page_visits
            ON page_visits.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
           AND page_visits.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
          GROUP BY days.day_kst
        ),
        starts AS (
          SELECT
            days.day_kst,
            COUNT(DISTINCT starts.request_key) AS value
          FROM days
          LEFT JOIN (${selectedProductConfig.startEventsSql}) starts
            ON starts.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
           AND starts.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
          GROUP BY days.day_kst
        ),
        completes AS (
          SELECT
            days.day_kst,
            COUNT(DISTINCT completes.result_key) AS value
          FROM days
          LEFT JOIN (${selectedProductConfig.completeEventsSql}) completes
            ON completes.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
           AND completes.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
          GROUP BY days.day_kst
        )
        SELECT
          to_char(days.day_kst, 'MM/DD') AS label,
          COALESCE(visits.value, 0)::TEXT AS visits,
          COALESCE(starts.value, 0)::TEXT AS starts,
          COALESCE(completes.value, 0)::TEXT AS completes
        FROM days
        LEFT JOIN visits ON visits.day_kst = days.day_kst
        LEFT JOIN starts ON starts.day_kst = days.day_kst
        LEFT JOIN completes ON completes.day_kst = days.day_kst
        ORDER BY days.day_kst
      `),
    ]);

  const funnelResult = await query<FunnelRow>(
    `
      ${dashboardRangeSql}
      SELECT
        (
          SELECT COUNT(DISTINCT visitor_key)
          FROM (${selectedProductConfig.pageVisitEventsSql}) page_visits, ranges
          WHERE event_at >= range_start AND event_at < range_end
        ) AS page_visits,
        (
          SELECT COUNT(DISTINCT request_key)
          FROM (${selectedProductConfig.startEventsSql}) starts, ranges
          WHERE event_at >= range_start AND event_at < range_end
        ) AS coaching_started,
        (
          SELECT COUNT(DISTINCT result_key)
          FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
          WHERE event_at >= range_start AND event_at < range_end
        ) AS coaching_completed
    `,
    dashboardDateParams,
  );

  const funnelRow = funnelResult.rows[0];
  const pageVisits = numberValue(funnelRow?.page_visits);
  const started = numberValue(funnelRow?.coaching_started);
  const completed = numberValue(funnelRow?.coaching_completed);
  const base = Math.max(pageVisits, started, completed, 1);
  const createFunnelHref = (step: string) => {
    const params = new URLSearchParams({
      product: selectedProductKey,
      step,
      startDate: dashboardDateRange.startDate,
      endDate: dashboardDateRange.endDate,
      from: "dashboard",
    });

    return `/traffic/funnel?${params.toString()}`;
  };

  const channelResult = await query<ChannelRow>(
    `
      ${dashboardRangeSql}
      SELECT
        source_value AS label,
        COUNT(DISTINCT visitor_key) AS count
      FROM (${trafficEventsSql}) traffic_events, ranges
      WHERE event_at >= range_start AND event_at < range_end
      GROUP BY source_value
    `,
    dashboardDateParams,
  );

  const groupedChannels = new Map<string, number>();
  for (const row of channelResult.rows) {
    const label = mapChannelLabel(row.label);
    groupedChannels.set(label, (groupedChannels.get(label) || 0) + numberValue(row.count));
  }

  const sortedChannels = dashboardChannelOptions
    .slice(1)
    .map((item) => [item.label, groupedChannels.get(item.label) || 0] as const)
    .sort((a, b) => b[1] - a[1]);
  const maxChannelCount = Math.max(
    ...sortedChannels.map(([, count]) => count),
    1,
  );
  const totalChannelCount = sortedChannels.reduce(
    (sum, [, count]) => sum + count,
    0,
  );

  const bannerClickResult = await query<BannerClickRow>(
    `
    ${dashboardRangeSql},
    click_items AS (
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
        COUNT(*) AS click_count,
        COUNT(DISTINCT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT)) AS unique_count
      FROM public.product_events, ranges
      WHERE created_at >= range_start
        AND created_at < range_end
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
      COALESCE(counts.click_count, 0)::TEXT AS click_count,
      COALESCE(counts.unique_count, 0)::TEXT AS unique_count
    FROM click_items
    LEFT JOIN counts ON counts.item_key = click_items.item_key
    ORDER BY click_items.sort_order
    `,
    dashboardDateParams,
  );
  const screenInflowResult = await query<ScreenInflowRow>(
    `
    ${dashboardRangeSql},
    normalized_events AS (
      SELECT
        source_value,
        CASE
          WHEN screen_key IN ('home', 'job_detail', 'diagnosis', 'community', 'my', 'calendar', 'login')
            THEN screen_key
          WHEN split_part(landing_path, '?', 1) = '/' THEN 'home'
          WHEN split_part(landing_path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
          WHEN split_part(landing_path, '?', 1) LIKE '/ai-tools/diagnosis%'
            OR split_part(landing_path, '?', 1) LIKE '/events/diagnosis%'
            THEN 'diagnosis'
          WHEN split_part(landing_path, '?', 1) LIKE '/community%' THEN 'community'
          WHEN split_part(landing_path, '?', 1) LIKE '/my%' THEN 'my'
          WHEN split_part(landing_path, '?', 1) LIKE '/calendar%' THEN 'calendar'
          WHEN split_part(landing_path, '?', 1) LIKE '/login%'
            OR split_part(landing_path, '?', 1) LIKE '/auth%'
            THEN 'login'
          ELSE 'other'
        END AS normalized_screen_key
      FROM (${trafficEventsSql}) traffic_events, ranges
      WHERE event_at >= range_start AND event_at < range_end
    )
    SELECT
      source_value AS channel_source,
      normalized_screen_key AS screen_key,
      COUNT(*) AS inflow_count
    FROM normalized_events
    GROUP BY source_value, normalized_screen_key
    `,
    dashboardDateParams,
  );
  const behaviorPatternResult = await query<BehaviorPatternRow>(
    `
      ${dashboardRangeSql},
      page_events AS (
        SELECT
          traffic_events.id::TEXT AS visit_id,
          traffic_events.visitor_key,
          CASE
            WHEN traffic_events.source_value = '인스타그램'
              OR traffic_events.source_value ILIKE '%instagram%'
              OR LOWER(traffic_events.source_value) = 'ig'
              THEN '인스타그램'
            WHEN traffic_events.source_value = '블로그'
              OR traffic_events.source_value ILIKE '%blog%'
              OR traffic_events.source_value ILIKE '%블로그%'
              THEN '블로그'
            WHEN traffic_events.source_value = '스레드'
              OR traffic_events.source_value ILIKE '%thread%'
              THEN '스레드'
            WHEN traffic_events.source_value ILIKE '%page_move%'
              OR traffic_events.source_value ILIKE '%page move%'
              OR traffic_events.source_value ILIKE '%internal%'
              OR traffic_events.source_value = '페이지 이동'
              THEN '페이지 이동'
            WHEN traffic_events.source_value = '검색'
              OR traffic_events.source_value ILIKE '%naver%'
              OR traffic_events.source_value ILIKE '%google%'
              OR traffic_events.source_value ILIKE '%daum%'
              OR traffic_events.source_value ILIKE '%search%'
              THEN '검색'
            WHEN traffic_events.source_value = '직접유입'
              OR LOWER(traffic_events.source_value) = 'direct'
              THEN '직접유입'
            ELSE '직접유입'
          END AS source_label,
          traffic_events.landing_path,
          traffic_events.screen_key,
          traffic_events.event_at
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE traffic_events.visitor_key IS NOT NULL
          AND traffic_events.event_at >= ranges.range_start
          AND traffic_events.event_at < ranges.range_end
      ),
      all_page_events AS (
        SELECT
          traffic_events.visitor_key,
          traffic_events.landing_path,
          traffic_events.screen_key,
          traffic_events.event_at
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE traffic_events.visitor_key IS NOT NULL
          AND traffic_events.event_at >= ranges.range_start
          AND traffic_events.event_at < ranges.range_end + INTERVAL '7 days'
      ),
      channel_defs AS (
        SELECT *
        FROM (VALUES
          ('블로그', 1),
          ('검색', 2),
          ('인스타그램', 3),
          ('스레드', 4),
          ('페이지 이동', 5),
          ('직접유입', 6)
        ) AS channels(label, sort_order)
      ),
      job_detail_visits AS (
        SELECT
          page_events.visit_id,
          page_events.visitor_key,
          page_events.source_label,
          page_events.event_at
        FROM page_events
        WHERE page_events.screen_key = 'job_detail'
          OR split_part(page_events.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
      ),
      job_detail_channel_visitors AS (
        SELECT DISTINCT ON (visit_id)
          visit_id,
          visitor_key,
          source_label,
          event_at
        FROM job_detail_visits
        ORDER BY visit_id, event_at
      ),
      product_actions AS (
        SELECT
          COALESCE(
            events.user_id::TEXT,
            events.anonymous_id::TEXT,
            NULLIF(CONCAT_WS('|', NULLIF(events.properties->>'ip_address', ''), NULLIF(events.properties->>'user_agent', '')), '')
          ) AS visitor_key,
          events.event_type,
          COALESCE(NULLIF(events.properties->>'banner_key', ''), '') AS banner_key,
          events.created_at AS event_at
        FROM public.product_events events, ranges
        WHERE events.created_at >= ranges.range_start
          AND events.created_at < ranges.range_end + INTERVAL '30 minutes'
      ),
      later_page_events AS (
        SELECT DISTINCT
          job_detail_visits.visit_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key
        FROM job_detail_channel_visitors job_detail_visits
        JOIN all_page_events page_events
          ON page_events.visitor_key = job_detail_visits.visitor_key
         AND page_events.event_at > job_detail_visits.event_at
         AND page_events.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
      ),
      later_action_events AS (
        SELECT DISTINCT
          job_detail_visits.visit_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key
        FROM job_detail_channel_visitors job_detail_visits
        JOIN product_actions actions
          ON actions.visitor_key = job_detail_visits.visitor_key
         AND actions.event_at > job_detail_visits.event_at
         AND actions.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
      ),
      job_action_events AS (
        SELECT DISTINCT
          job_detail_visits.visit_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key
        FROM job_detail_channel_visitors job_detail_visits
        JOIN product_actions actions
          ON actions.visitor_key = job_detail_visits.visitor_key
         AND actions.event_at > job_detail_visits.event_at
         AND actions.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
         AND actions.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
      ),
      other_page_move_events AS (
        SELECT DISTINCT
          job_detail_visits.visit_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key
        FROM job_detail_channel_visitors job_detail_visits
        JOIN all_page_events page_events
          ON page_events.visitor_key = job_detail_visits.visitor_key
         AND page_events.event_at > job_detail_visits.event_at
         AND page_events.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
         AND NOT (
              page_events.screen_key = 'job_detail'
           OR split_part(page_events.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
         )
      ),
      revisit_events AS (
        SELECT DISTINCT
          job_detail_visits.visit_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key
        FROM job_detail_channel_visitors job_detail_visits
        JOIN all_page_events page_events
          ON page_events.visitor_key = job_detail_visits.visitor_key
         AND page_events.event_at >= job_detail_visits.event_at + INTERVAL '1 day'
         AND page_events.event_at <= job_detail_visits.event_at + INTERVAL '7 days'
      ),
      stats AS (
        SELECT
          job_detail_channel_visitors.source_label,
          COUNT(DISTINCT job_detail_channel_visitors.visit_id) AS visitors,
          COUNT(DISTINCT job_detail_channel_visitors.visit_id) FILTER (
            WHERE later_page_events.visitor_key IS NULL
              AND later_action_events.visitor_key IS NULL
          ) AS bounce_count,
          COUNT(DISTINCT revisit_events.visit_id) AS revisit_count,
          COUNT(DISTINCT job_action_events.visit_id) AS action_count,
          COUNT(DISTINCT other_page_move_events.visit_id) AS page_move_count
        FROM job_detail_channel_visitors
        LEFT JOIN later_page_events
          ON later_page_events.source_label = job_detail_channel_visitors.source_label
         AND later_page_events.visit_id = job_detail_channel_visitors.visit_id
        LEFT JOIN later_action_events
          ON later_action_events.source_label = job_detail_channel_visitors.source_label
         AND later_action_events.visit_id = job_detail_channel_visitors.visit_id
        LEFT JOIN revisit_events
          ON revisit_events.source_label = job_detail_channel_visitors.source_label
         AND revisit_events.visit_id = job_detail_channel_visitors.visit_id
        LEFT JOIN job_action_events
          ON job_action_events.source_label = job_detail_channel_visitors.source_label
         AND job_action_events.visit_id = job_detail_channel_visitors.visit_id
        LEFT JOIN other_page_move_events
          ON other_page_move_events.source_label = job_detail_channel_visitors.source_label
         AND other_page_move_events.visit_id = job_detail_channel_visitors.visit_id
        GROUP BY job_detail_channel_visitors.source_label
      )
      SELECT
        channel_defs.label AS channel_label,
        COALESCE(stats.visitors, 0)::TEXT AS visitors,
        COALESCE(stats.bounce_count, 0)::TEXT AS bounce_count,
        COALESCE(stats.revisit_count, 0)::TEXT AS revisit_count,
        COALESCE(stats.action_count, 0)::TEXT AS action_count,
        COALESCE(stats.page_move_count, 0)::TEXT AS page_move_count
      FROM channel_defs
      LEFT JOIN stats ON stats.source_label = channel_defs.label
      ORDER BY channel_defs.sort_order
    `,
    dashboardDateParams,
  );
  const bannerClickRows = bannerClickResult.rows;
  const maxBannerClickCount = Math.max(
    ...bannerClickRows.map((row) => numberValue(row.click_count)),
    1,
  );
  const totalBannerClickCount = bannerClickRows.reduce(
    (sum, row) => sum + numberValue(row.click_count),
    0,
  );
  const groupedScreenInflows = new Map<string, number>();
  for (const row of screenInflowResult.rows) {
    const channelLabel = mapChannelLabel(row.channel_source);
    if (
      selectedChannelKey !== "all" &&
      channelLabel !== selectedChannelLabel
    ) {
      continue;
    }

    groupedScreenInflows.set(
      row.screen_key,
      (groupedScreenInflows.get(row.screen_key) || 0) +
        numberValue(row.inflow_count),
    );
  }
  const maxScreenInflowCount = Math.max(
    ...dashboardScreenKeys.map((screen) => groupedScreenInflows.get(screen.key) || 0),
    1,
  );
  const totalScreenInflowCount = dashboardScreenKeys.reduce(
    (sum, screen) => sum + (groupedScreenInflows.get(screen.key) || 0),
    0,
  );
  const behaviorPatterns = behaviorPatternResult.rows.map((row) => {
    const visitors = numberValue(row.visitors);
    const bounce = numberValue(row.bounce_count);
    const revisit = numberValue(row.revisit_count);
    const action = numberValue(row.action_count);
    const pageMove = numberValue(row.page_move_count);
    const formatBehaviorRate = (value: number) =>
      visitors > 0 ? formatPercent((value / visitors) * 100) : "0%";

    return {
      key: row.channel_label,
      channelLabel: row.channel_label,
      visitors: `${formatCount(visitors)}건`,
      bounce: `${formatCount(bounce)}건`,
      bounceRate: formatBehaviorRate(bounce),
      revisit: `${formatCount(revisit)}건`,
      revisitRate: formatBehaviorRate(revisit),
      action: `${formatCount(action)}건`,
      actionRate: formatBehaviorRate(action),
      pageMove: `${formatCount(pageMove)}건`,
      pageMoveRate: formatBehaviorRate(pageMove),
      fill: fillPercent(
        visitors,
        Math.max(
          ...behaviorPatternResult.rows.map((item) =>
            numberValue(item.visitors),
          ),
          1,
        ),
      ),
    };
  });
  const createDashboardHref = (channelKey: string) => {
    const params = new URLSearchParams();

    params.set("startDate", dashboardDateRange.startDate);
    params.set("endDate", dashboardDateRange.endDate);

    if (channelKey !== "all") {
      params.set("channel", channelKey);
    }

    if (selectedProductKey !== "diagnosis") {
      params.set("product", selectedProductKey);
    }

    const queryString = params.toString();

    return queryString ? `/?${queryString}` : "/";
  };
  const createDatedLogHref = (
    path: string,
    params: Record<string, string>,
  ) => {
    const searchParams = new URLSearchParams({
      ...params,
      startDate: dashboardDateRange.startDate,
      endDate: dashboardDateRange.endDate,
      from: "dashboard",
    });

    return `${path}?${searchParams.toString()}`;
  };

  return {
    metrics: [
      {
        label: "오늘 방문자",
        value: formatCount(todayVisitors),
        unit: "명",
        delta: visitorDelta.text,
        trend: visitorDelta.trend,
      },
      {
        label: "신규 가입",
        value: formatCount(todaySignups),
        delta: signupDelta.text,
        trend: signupDelta.trend,
      },
      {
        label: selectedProductConfig.metricLabel,
        value: formatCount(rangeCoachingRequests),
        delta: coachingDelta.text,
        trend: coachingDelta.trend,
      },
      {
        label: selectedProductConfig.completionRateLabel,
        value: formatPercent(todayCompletionRate),
        delta: completionDelta.text,
        trend: completionDelta.trend,
      },
    ],
    visitorTrend: toLinePoints(visitorTrendResult.rows),
    coachingTrend: toLinePoints(coachingTrendResult.rows),
    signupTrend: toLinePoints(signupTrendResult.rows),
    productRateTrend: toLinePoints(productRateTrendResult.rows),
    productVisitTrend: productConversionTrendResult.rows.map((row) => ({
      label: row.label,
      value: numberValue(row.visits),
    })),
    productStartTrend: productConversionTrendResult.rows.map((row) => ({
      label: row.label,
      value: numberValue(row.starts),
    })),
    productCompleteTrend: productConversionTrendResult.rows.map((row) => ({
      label: row.label,
      value: numberValue(row.completes),
    })),
    funnelItems: [
      createFunnel(1, "방문", pageVisits, null, base, createFunnelHref("visit")),
      createFunnel(
        2,
        selectedProductConfig.startStepLabel,
        started,
        pageVisits,
        base,
        createFunnelHref("start"),
        createFunnelHref("visit_drop"),
      ),
      createFunnel(
        3,
        selectedProductConfig.completeStepLabel,
        completed,
        started,
        base,
        createFunnelHref("complete"),
        createFunnelHref("start_drop"),
      ),
    ],
    channels: [
      {
        key: "all",
        label: "전체",
        value: "100%",
        count: `(${formatCount(totalChannelCount)}건)`,
        fill: 100,
        icon: channelAssets["직접유입"].icon,
        iconClass: channelAssets["직접유입"].iconClass,
        href: createDashboardHref("all"),
      },
      ...sortedChannels.map(([label, count]) => {
        const optionKey =
          dashboardChannelOptions.find((item) => item.label === label)?.key ||
          "direct";

        return {
          key: optionKey,
          label,
          value: formatPercent(
            totalChannelCount > 0 ? (count / totalChannelCount) * 100 : 0,
          ),
          count: `(${formatCount(count)}건)`,
          fill: fillPercent(count, maxChannelCount),
          icon: channelAssets[label]?.icon || channelAssets["직접유입"].icon,
          iconClass:
            channelAssets[label]?.iconClass ||
            channelAssets["직접유입"].iconClass,
          href: createDashboardHref(optionKey),
        };
      }),
    ],
    channelTotal: formatCount(totalChannelCount),
    bannerClicks: bannerClickRows.map((row) => ({
      key: row.banner_key || "unknown",
      label: mapBannerLabel(row.banner_key, row.banner_name),
      count: `${formatCount(numberValue(row.click_count))}건`,
      uniqueCount: `${formatCount(numberValue(row.unique_count))}명`,
      fill: fillPercent(numberValue(row.click_count), maxBannerClickCount),
      href: createDatedLogHref("/traffic/banner-clicks", {
        bannerKey: row.banner_key || "unknown",
      }),
    })),
    bannerClickTotal: formatCount(totalBannerClickCount),
    behaviorPatterns,
    screenInflows: dashboardScreenKeys.map((screen) => {
      const count = groupedScreenInflows.get(screen.key) || 0;

      return {
        key: screen.key,
        label: screen.label,
        count: `${formatCount(count)}건`,
        fill: fillPercent(count, maxScreenInflowCount),
        href: createDatedLogHref("/traffic/logs", { screen: screen.key }),
      };
    }),
    screenInflowTotal: formatCount(totalScreenInflowCount),
    selectedChannelKey,
    selectedChannelLabel,
    selectedProductKey,
    selectedProductLabel: selectedProductConfig.label,
    dashboardStartDate: dashboardDateRange.startDate,
    dashboardEndDate: dashboardDateRange.endDate,
    dashboardPeriodLabel: dashboardDateRange.label,
    productOptions: dashboardProductOptions,
    productFunnelTitle: selectedProductConfig.funnelTitle,
    productFunnelDescription: selectedProductConfig.funnelDescription,
    productRateTrendTitle: selectedProductConfig.rateTrendTitle,
  };
}
