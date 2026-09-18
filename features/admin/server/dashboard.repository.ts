import {
  BannerClickItem,
  BehaviorPatternItem,
  ChannelItem,
  DashboardProductOption,
  DashboardTrendSeries,
  FunnelItem,
  LinePoint,
  MetricItem,
  ScreenInflowItem,
} from "@/features/admin/data/dashboard";
import { query } from "@/features/admin/server/db";
import {
  ensureAnalyticsExclusionSchema,
  excludedEventCondition,
  excludedUserCondition,
} from "@/features/admin/server/analytics-exclusion.repository";

type DashboardData = {
  metrics: MetricItem[];
  jobDetailMetrics: MetricItem[];
  visitorTrend: LinePoint[];
  coachingTrend: LinePoint[];
  signupTrend: LinePoint[];
  visitorSignupListTrend: DashboardTrendSeries[];
  productRateTrend: LinePoint[];
  productVisitTrend: LinePoint[];
  productStartTrend: LinePoint[];
  productCompleteTrend: LinePoint[];
  productConversionTrend: DashboardTrendSeries[];
  productConversionListTrend: DashboardTrendSeries[];
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
  dashboardPreset: string;
  dashboardPeriodLabel: string;
  dashboardPeriodText: string;
  productOptions: DashboardProductOption[];
  productFunnelTitle: string;
  productFunnelDescription: string;
  productRateTrendTitle: string;
  productHasVisitStep: boolean;
  trafficChannelTrend: DashboardTrendSeries[];
  trafficChannelListTrend: DashboardTrendSeries[];
  screenTrend: DashboardTrendSeries[];
  screenListTrend: DashboardTrendSeries[];
  bannerClickTrend: DashboardTrendSeries[];
  bannerClickListTrend: DashboardTrendSeries[];
  jobDetailBehaviorTrend: DashboardTrendSeries[];
  jobDetailBehaviorListTrend: DashboardTrendSeries[];
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

type TrafficTrendRow = {
  label: string;
  metric_key: string;
  count: string;
};

type DashboardListTrendRow = TrafficTrendRow;

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
  activity_count: string;
  bounce_count: string;
  revisit_count: string;
  bookmark_count: string;
  apply_count: string;
  page_move_count: string;
  unknown_count: string;
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

const screenTrendDefinitions = [
  { key: "screen:home", label: "홈", color: "#2f7ff0" },
  { key: "screen:job_detail", label: "공고상세", color: "#1fb573" },
  { key: "screen:diagnosis", label: "강약점", color: "#a54de8" },
  { key: "screen:community", label: "커뮤니티", color: "#f5b91e" },
  { key: "screen:my", label: "마이페이지", color: "#e65c5c" },
  { key: "screen:calendar", label: "캘린더", color: "#5a6580" },
  { key: "screen:login", label: "로그인", color: "#22a6b3" },
  { key: "screen:other", label: "기타", color: "#9aa7bb" },
];

const screenChartDefinitions = screenTrendDefinitions.slice(0, 4);

const visitorKeySql =
  "COALESCE(user_id::TEXT, anonymous_id::TEXT, session_id::TEXT, NULLIF(CONCAT_WS('|', ip_address::TEXT, NULLIF(user_agent, '')), ''))";

const trafficEventsSql = `
  SELECT
    access_logs.user_id,
    access_logs.anonymous_id,
    access_logs.session_id,
    access_logs.ip_address,
    access_logs.id,
    access_logs.event_name,
    access_logs.user_agent,
    access_logs.metadata,
    COALESCE(
      NULLIF(access_logs.traffic_channel, ''),
      NULLIF(access_logs.metadata->>'trafficChannel', ''),
      NULLIF(substring(access_logs.path from '[?&]utm_source=([^&]+)'), ''),
      CASE
        WHEN access_logs.referrer ILIKE '%gongbueong.career.co.kr%' OR access_logs.referrer ILIKE '%localhost%' THEN NULL
        ELSE NULLIF(access_logs.referrer, '')
      END,
      'direct'
    ) AS source_value,
    access_logs.path AS landing_path,
    COALESCE(NULLIF(access_logs.screen_key, ''), NULLIF(access_logs.metadata->>'screenKey', '')) AS screen_key,
    COALESCE(NULLIF(access_logs.canonical_path, ''), NULLIF(access_logs.metadata->>'canonicalPath', '')) AS canonical_path,
    COALESCE(NULLIF(access_logs.previous_path, ''), NULLIF(access_logs.metadata->>'previousPath', '')) AS previous_path,
    ${visitorKeySql} AS visitor_key,
    access_logs.referrer,
    access_logs.created_at AS event_at,
    access_logs.created_at
  FROM public.access_logs access_logs
  WHERE access_logs.event_name = 'page_view'
    AND ${excludedEventCondition("access_logs.user_id", "access_logs.ip_address")}
`;

const coachingStartEventsSql = `
  SELECT id::TEXT AS request_key, COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.resume_coaching_requests
  WHERE ${excludedEventCondition("user_id", "ip_address")}
`;

const coachingCompleteEventsSql = `
  SELECT
    results.id::TEXT AS result_key,
    COALESCE(
      requests.user_id::TEXT,
      requests.anonymous_id::TEXT,
      requests.id::TEXT
    ) AS visitor_key,
    results.created_at AS event_at
  FROM public.resume_coaching_results results
  JOIN public.resume_coaching_requests requests
    ON requests.id = results.request_id
  WHERE ${excludedEventCondition("requests.user_id", "requests.ip_address")}
`;

const coachingPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs access_logs
  WHERE access_logs.event_name = 'page_view'
    AND split_part(access_logs.path, '?', 1) = '/ai-tools/coaching'
    AND ${excludedEventCondition("access_logs.user_id", "access_logs.ip_address")}
`;

const diagnosisStartEventsSql = `
  SELECT
    id::TEXT AS request_key,
    COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key,
    created_at AS event_at
  FROM public.product_events
  WHERE event_type = 'diagnosis_start'
    AND properties->>'action' IN ('question_1_view', 'start_button_click')
    AND ${excludedEventCondition("user_id", "NULLIF(properties->>'ip_address', '')")}
`;

const diagnosisCompleteEventsSql = `
  SELECT
    results.id::TEXT AS result_key,
    COALESCE(results.user_id::TEXT, results.id::TEXT) AS visitor_key,
    COALESCE(runs.completed_at, results.created_at) AS event_at
  FROM public.diagnosis_results results
  JOIN public.diagnosis_runs runs ON runs.id = results.diagnosis_run_id
  WHERE ${excludedEventCondition("results.user_id", "runs.ip_address")}
`;

const diagnosisPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs access_logs
  WHERE access_logs.event_name = 'page_view'
    AND split_part(access_logs.path, '?', 1) IN ('/ai-tools/diagnosis', '/events/diagnosis')
    AND ${excludedEventCondition("access_logs.user_id", "access_logs.ip_address")}
`;

const interviewStartEventsSql = `
  SELECT
    sessions.id::TEXT AS request_key,
    COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
    sessions.started_at AS event_at
  FROM public.interview_coaching_sessions sessions
  WHERE ${excludedEventCondition("sessions.user_id", "sessions.ip_address")}
`;

const interviewCompleteEventsSql = `
  SELECT
    sessions.id::TEXT AS result_key,
    COALESCE(sessions.user_id::TEXT, sessions.anonymous_id::TEXT, sessions.id::TEXT) AS visitor_key,
    COALESCE(sessions.completed_at, sessions.updated_at, sessions.started_at) AS event_at
  FROM public.interview_coaching_sessions sessions
  WHERE (sessions.completed_at IS NOT NULL OR sessions.result IS NOT NULL)
    AND ${excludedEventCondition("sessions.user_id", "sessions.ip_address")}
`;

const interviewPageVisitEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs access_logs
  WHERE access_logs.event_name = 'page_view'
    AND split_part(access_logs.path, '?', 1) = '/ai-tools/interview-coaching'
    AND ${excludedEventCondition("access_logs.user_id", "access_logs.ip_address")}
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
  hasVisitStep: boolean;
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
    funnelDescription: "Q1 진입부터 결과 확인까지 유저의 이탈률을 봅니다.",
    rateTrendTitle: "강점·성향 진단 완료 추이",
    hasVisitStep: false,
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
    hasVisitStep: true,
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
    hasVisitStep: true,
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

function createTrendSeries(
  rows: TrafficTrendRow[],
  definitions: Array<{ key: string; label: string; color: string }>,
) {
  const labels = Array.from(new Set(rows.map((row) => row.label)));
  const values = new Map<string, Map<string, number>>();

  for (const row of rows) {
    const metricValues = values.get(row.metric_key) || new Map<string, number>();
    metricValues.set(row.label, numberValue(row.count));
    values.set(row.metric_key, metricValues);
  }

  return definitions.map((definition) => ({
    label: definition.label,
    color: definition.color,
    data: labels.map((label) => ({
      label,
      value: values.get(definition.key)?.get(label) || 0,
    })),
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
  preset,
  startDate,
  endDate,
}: {
  preset?: string | null;
  startDate?: string | null;
  endDate?: string | null;
} = {}) {
  const today = toKstDateInput();
  const recentStart = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toKstDateInput(date);
  };
  const normalizedPreset = ["today", "7d", "30d", "custom"].includes(
    preset || "",
  )
    ? preset
    : startDate || endDate
      ? "custom"
      : "today";
  const defaultStartDate =
    normalizedPreset === "7d"
      ? recentStart(6)
      : normalizedPreset === "30d"
        ? recentStart(29)
        : today;
  const normalizedStartDate =
    normalizedPreset === "custom"
      ? normalizeDateInput(startDate) || today
      : defaultStartDate;
  const normalizedEndDate =
    normalizedPreset === "custom" ? normalizeDateInput(endDate) || today : today;
  const [rangeStartDate, rangeEndDate] =
    normalizedStartDate <= normalizedEndDate
      ? [normalizedStartDate, normalizedEndDate]
      : [normalizedEndDate, normalizedStartDate];

  return {
    startDate: rangeStartDate,
    endDate: rangeEndDate,
    preset: normalizedPreset || "today",
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
  period,
  selectedChannel,
  selectedProduct,
  startDate,
  endDate,
}: {
  period?: string | null;
  selectedChannel?: string | null;
  selectedProduct?: string | null;
  startDate?: string | null;
  endDate?: string | null;
} = {}): Promise<DashboardData> {
  await ensureAnalyticsExclusionSchema();
  const selectedChannelKey = normalizeDashboardChannel(selectedChannel);
  const selectedChannelLabel =
    dashboardChannelOptions.find((item) => item.key === selectedChannelKey)
      ?.label || "전체";
  const selectedProductKey = normalizeDashboardProduct(selectedProduct);
  const selectedProductConfig = productAnalyticsConfigs[selectedProductKey];
  const dashboardDateRange = createDashboardDateRange({
    preset: period,
    startDate,
    endDate,
  });
  const dashboardDateParams = [
    dashboardDateRange.startDate,
    dashboardDateRange.endDate,
  ];

  const metricsResult = await query<MetricsRow>(`
    ${dashboardRangeSql}
    SELECT
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= range_start AND event_at < range_end
      ) AS today_visitors,
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= previous_start AND event_at < previous_end
      ) AS yesterday_visitors,
      (
        SELECT COUNT(*)
        FROM public.users, ranges
        WHERE status = 'active'
          AND ${excludedUserCondition("users.id")}
          AND COALESCE(signup_completed_at, created_at) >= range_start
          AND COALESCE(signup_completed_at, created_at) < range_end
      ) AS today_signups,
      (
        SELECT COUNT(*)
        FROM public.users, ranges
        WHERE status = 'active'
          AND ${excludedUserCondition("users.id")}
          AND COALESCE(signup_completed_at, created_at) >= previous_start
          AND COALESCE(signup_completed_at, created_at) < previous_end
      ) AS yesterday_signups
    FROM ranges
  `, dashboardDateParams);

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
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (starts.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT starts.visitor_key) AS daily_count
            FROM (${selectedProductConfig.startEventsSql}) starts, ranges
            WHERE starts.event_at >= range_start AND starts.event_at < range_end
            GROUP BY 1
          ) daily_starts
        ) AS current_starts,
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (starts.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT starts.visitor_key) AS daily_count
            FROM (${selectedProductConfig.startEventsSql}) starts, ranges
            WHERE starts.event_at >= previous_start AND starts.event_at < previous_end
            GROUP BY 1
          ) daily_starts
        ) AS previous_starts,
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (completes.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT completes.visitor_key) AS daily_count
            FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
            WHERE completes.event_at >= range_start AND completes.event_at < range_end
            GROUP BY 1
          ) daily_completes
        ) AS current_completes,
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (completes.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT completes.visitor_key) AS daily_count
            FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
            WHERE completes.event_at >= previous_start AND completes.event_at < previous_end
            GROUP BY 1
          ) daily_completes
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

  const visitorDelta = createPeriodDelta(todayVisitors, yesterdayVisitors);
  const signupDelta = createPeriodDelta(todaySignups, yesterdaySignups);
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
    trafficTrendResult,
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
        SELECT to_char(days.day_kst, 'MM/DD') AS label, COUNT(DISTINCT starts.visitor_key) AS value
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
          ON users.status <> 'withdrawn'
         AND ${excludedUserCondition("users.id")}
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
          COUNT(DISTINCT completes.visitor_key) AS value
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
            COUNT(DISTINCT starts.visitor_key) AS value
          FROM days
          LEFT JOIN (${selectedProductConfig.startEventsSql}) starts
            ON starts.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
           AND starts.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
          GROUP BY days.day_kst
        ),
        completes AS (
          SELECT
            days.day_kst,
            COUNT(DISTINCT completes.visitor_key) AS value
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
      query<TrafficTrendRow>(`
        WITH days AS (
          SELECT generate_series(
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') - INTERVAL '6 days',
            date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul'),
            INTERVAL '1 day'
          )::date AS day_kst
        ),
        bounds AS (
          SELECT
            MIN(day_kst)::timestamp AT TIME ZONE 'Asia/Seoul' AS range_start,
            (MAX(day_kst) + 1)::timestamp AT TIME ZONE 'Asia/Seoul' AS range_end
          FROM days
        ),
        traffic_events AS MATERIALIZED (
          SELECT logs.*
          FROM (${trafficEventsSql}) logs
          CROSS JOIN bounds
          WHERE logs.event_at >= bounds.range_start
            AND logs.event_at < bounds.range_end + INTERVAL '30 minutes'
        ),
        metric_defs AS (
          SELECT *
          FROM (VALUES
            ('channel:인스타그램'),
            ('channel:블로그'),
            ('channel:스레드'),
            ('channel:검색'),
            ('channel:직접유입'),
            ('screen:home'),
            ('screen:job_detail'),
            ('screen:diagnosis'),
            ('screen:community'),
            ('screen:my'),
            ('screen:calendar'),
            ('screen:login'),
            ('screen:other'),
            ('banner:total'),
            ('banner:job_detail_bookmark_click'),
            ('banner:job_detail_apply_click'),
            ('behavior:job_detail_visitors'),
            ('behavior:activity_visitors'),
            ('behavior:bookmark_clicks'),
            ('behavior:apply_clicks')
          ) AS metrics(metric_key)
        ),
        raw_channel_visits AS (
          SELECT
            (traffic_events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
            traffic_events.visitor_key,
            traffic_events.event_at,
            traffic_events.id,
            CASE
              WHEN traffic_events.source_value = '페이지 이동'
                OR LOWER(traffic_events.source_value) LIKE '%page_move%'
                OR LOWER(traffic_events.source_value) LIKE '%page move%'
                OR LOWER(traffic_events.source_value) LIKE '%internal%'
                THEN COALESCE(
                  NULLIF(traffic_events.metadata #>> '{attribution,first,source}', ''),
                  NULLIF(traffic_events.metadata #>> '{attribution,current,source}', ''),
                  'direct'
                )
              ELSE traffic_events.source_value
            END AS source_value
          FROM traffic_events
          WHERE traffic_events.visitor_key IS NOT NULL
            AND traffic_events.event_at < (SELECT range_end FROM bounds)
        ),
        daily_channel_visits AS (
          SELECT DISTINCT ON (day_kst, visitor_key)
            day_kst,
            visitor_key,
            CASE
              WHEN source_value = '인스타그램'
                OR source_value ILIKE '%instagram%'
                OR LOWER(source_value) = 'ig'
                THEN '인스타그램'
              WHEN source_value = '블로그'
                OR source_value ILIKE '%blog%'
                OR source_value ILIKE '%블로그%'
                THEN '블로그'
              WHEN source_value = '스레드'
                OR source_value ILIKE '%thread%'
                THEN '스레드'
              WHEN source_value = '검색'
                OR source_value ILIKE '%naver%'
                OR source_value ILIKE '%google%'
                OR source_value ILIKE '%daum%'
                OR source_value ILIKE '%search%'
                THEN '검색'
              ELSE '직접유입'
            END AS channel_label
          FROM raw_channel_visits
          ORDER BY day_kst, visitor_key, event_at, id
        ),
        channel_counts AS (
          SELECT
            day_kst,
            'channel:' || channel_label AS metric_key,
            COUNT(*)::TEXT AS count
          FROM daily_channel_visits
          GROUP BY day_kst, channel_label
        ),
      screen_visits AS (
        SELECT
            (traffic_events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
            traffic_events.visitor_key,
            CASE
              WHEN traffic_events.screen_key IN ('home', 'job_detail', 'diagnosis', 'community', 'my', 'calendar', 'login')
                THEN traffic_events.screen_key
              WHEN split_part(traffic_events.landing_path, '?', 1) = '/' THEN 'home'
              WHEN split_part(traffic_events.landing_path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
              WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/ai-tools/diagnosis%'
                OR split_part(traffic_events.landing_path, '?', 1) LIKE '/events/diagnosis%' THEN 'diagnosis'
              WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/community%' THEN 'community'
              WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/my%' THEN 'my'
              WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/calendar%' THEN 'calendar'
              WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/login%'
                OR split_part(traffic_events.landing_path, '?', 1) LIKE '/auth%' THEN 'login'
              ELSE 'other'
            END AS screen_key
          FROM traffic_events
          WHERE traffic_events.visitor_key IS NOT NULL
            AND traffic_events.event_at < (SELECT range_end FROM bounds)
      ),
        screen_counts AS (
          SELECT
            day_kst,
            'screen:' || screen_key AS metric_key,
            COUNT(*)::TEXT AS count
          FROM screen_visits
          GROUP BY day_kst, screen_key
        ),
        raw_banner_events AS (
          SELECT
            (events.created_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
            CASE
              WHEN events.event_type = 'banner_click'
                THEN 'banner:' || COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown')
              ELSE 'banner:' || events.event_type
            END AS metric_key
          FROM public.product_events events
          CROSS JOIN bounds
          WHERE events.created_at >= bounds.range_start
            AND events.created_at < bounds.range_end
            AND ${excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")}
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
        banner_counts AS (
          SELECT day_kst, 'banner:total' AS metric_key, COUNT(*)::TEXT AS count
          FROM raw_banner_events
          GROUP BY day_kst
          UNION ALL
          SELECT day_kst, metric_key, COUNT(*)::TEXT AS count
          FROM raw_banner_events
          WHERE metric_key IN (
            'banner:job_detail_bookmark_click',
            'banner:job_detail_apply_click'
          )
          GROUP BY day_kst, metric_key
        ),
        page_event_gaps AS (
          SELECT
            traffic_events.*,
            LAG(traffic_events.event_at) OVER (
              PARTITION BY traffic_events.visitor_key
              ORDER BY traffic_events.event_at, traffic_events.id
            ) AS previous_event_at
          FROM traffic_events
          WHERE traffic_events.visitor_key IS NOT NULL
        ),
        page_event_sessions AS (
          SELECT
            page_event_gaps.*,
            SUM(
              CASE
                WHEN previous_event_at IS NULL
                  OR event_at > previous_event_at + INTERVAL '30 minutes'
                  THEN 1
                ELSE 0
              END
            ) OVER (
              PARTITION BY visitor_key
              ORDER BY event_at, id
              ROWS UNBOUNDED PRECEDING
            ) AS session_no
          FROM page_event_gaps
        ),
        job_detail_visits AS (
          SELECT DISTINCT ON (logs.visitor_key, logs.session_no)
            (logs.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
            logs.visitor_key,
            logs.visitor_key || ':' || logs.session_no::TEXT AS session_key,
            logs.event_at
          FROM page_event_sessions logs
          WHERE
              logs.screen_key = 'job_detail'
              OR split_part(logs.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
          ORDER BY logs.visitor_key, logs.session_no, logs.event_at, logs.id
        ),
        later_page_activity AS (
          SELECT DISTINCT visits.day_kst, visits.visitor_key, visits.session_key
          FROM job_detail_visits visits
          JOIN page_event_sessions logs
            ON logs.visitor_key = visits.visitor_key
           AND logs.event_at > visits.event_at
           AND logs.event_at <= visits.event_at + INTERVAL '30 minutes'
        ),
        later_action_activity AS (
          SELECT DISTINCT
            visits.day_kst,
            visits.visitor_key,
            visits.session_key,
            events.event_type
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
           AND events.created_at < (SELECT range_end FROM bounds)
           AND (
             events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
             OR (
               events.event_type = 'banner_click'
               AND events.properties->>'placement' = 'job_detail_bottom'
             )
            )
        ),
        later_action_events AS (
          SELECT day_kst, session_key, event_type
          FROM later_action_activity
        ),
        activity_visitors AS (
          SELECT day_kst, visitor_key FROM later_page_activity
          UNION
          SELECT day_kst, visitor_key FROM later_action_activity
        ),
        behavior_counts AS (
          SELECT day_kst, 'behavior:job_detail_visitors' AS metric_key, COUNT(DISTINCT visitor_key)::TEXT AS count
          FROM job_detail_visits
          GROUP BY day_kst
          UNION ALL
          SELECT day_kst, 'behavior:activity_visitors' AS metric_key, COUNT(DISTINCT visitor_key)::TEXT AS count
          FROM activity_visitors
          GROUP BY day_kst
          UNION ALL
          SELECT day_kst, 'behavior:bookmark_clicks' AS metric_key, COUNT(*)::TEXT AS count
          FROM later_action_events
          WHERE event_type = 'job_detail_bookmark_click'
          GROUP BY day_kst
          UNION ALL
          SELECT day_kst, 'behavior:apply_clicks' AS metric_key, COUNT(*)::TEXT AS count
          FROM later_action_events
          WHERE event_type = 'job_detail_apply_click'
          GROUP BY day_kst
        ),
        counts AS (
          SELECT * FROM channel_counts
          UNION ALL
          SELECT * FROM screen_counts
          UNION ALL
          SELECT * FROM banner_counts
          UNION ALL
          SELECT * FROM behavior_counts
        )
        SELECT
          to_char(days.day_kst, 'MM/DD') AS label,
          metric_defs.metric_key,
          COALESCE(counts.count, '0') AS count
        FROM days
        CROSS JOIN metric_defs
        LEFT JOIN counts
          ON counts.day_kst = days.day_kst
         AND counts.metric_key = metric_defs.metric_key
        ORDER BY days.day_kst, metric_defs.metric_key
      `),
    ]);

  const listTrendResult = await query<DashboardListTrendRow>(
    `
      ${dashboardRangeSql},
      days AS (
        SELECT generate_series(
          (SELECT requested_start FROM input_range),
          (SELECT requested_end FROM input_range),
          INTERVAL '1 day'
        )::date AS day_kst
      ),
      metric_defs AS (
        SELECT *
        FROM (VALUES
          ('visitor'),
          ('signup'),
          ('product:visit'),
          ('product:start'),
          ('product:complete'),
          ('channel:인스타그램'),
          ('channel:블로그'),
          ('channel:스레드'),
          ('channel:검색'),
          ('channel:직접유입'),
          ('screen:home'),
          ('screen:job_detail'),
          ('screen:diagnosis'),
          ('screen:community'),
          ('screen:my'),
          ('screen:calendar'),
          ('screen:login'),
          ('screen:other'),
          ('banner:total'),
          ('banner:job_detail_bookmark_click'),
          ('banner:job_detail_apply_click'),
          ('behavior:job_detail_visitors'),
          ('behavior:activity_visitors'),
          ('behavior:bookmark_clicks'),
          ('behavior:apply_clicks')
        ) AS metrics(metric_key)
      ),
      visitor_counts AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          'visitor' AS metric_key,
          COUNT(DISTINCT events.visitor_key)::TEXT AS count
        FROM (${trafficEventsSql}) events, ranges
        WHERE events.event_at >= range_start AND events.event_at < range_end
        GROUP BY 1
      ),
      signup_counts AS (
        SELECT
          days.day_kst,
          'signup' AS metric_key,
          COUNT(*)::TEXT AS count
        FROM days
        LEFT JOIN public.users users
          ON users.status <> 'withdrawn'
         AND ${excludedUserCondition("users.id")}
         AND COALESCE(users.signup_completed_at, users.created_at) < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
        GROUP BY days.day_kst
      ),
      product_visit_counts AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          'product:visit' AS metric_key,
          COUNT(DISTINCT events.visitor_key)::TEXT AS count
        FROM (${selectedProductConfig.pageVisitEventsSql}) events, ranges
        WHERE events.event_at >= range_start AND events.event_at < range_end
        GROUP BY 1
      ),
      product_start_counts AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          'product:start' AS metric_key,
          COUNT(DISTINCT events.visitor_key)::TEXT AS count
        FROM (${selectedProductConfig.startEventsSql}) events, ranges
        WHERE events.event_at >= range_start AND events.event_at < range_end
        GROUP BY 1
      ),
      product_complete_counts AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          'product:complete' AS metric_key,
          COUNT(DISTINCT events.visitor_key)::TEXT AS count
        FROM (${selectedProductConfig.completeEventsSql}) events, ranges
        WHERE events.event_at >= range_start AND events.event_at < range_end
        GROUP BY 1
      ),
      raw_channel_visits AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          events.visitor_key,
          events.event_at,
          events.id,
          CASE
            WHEN events.source_value = '페이지 이동'
              OR LOWER(events.source_value) LIKE '%page_move%'
              OR LOWER(events.source_value) LIKE '%page move%'
              OR LOWER(events.source_value) LIKE '%internal%'
              THEN COALESCE(
                NULLIF(events.metadata #>> '{attribution,first,source}', ''),
                NULLIF(events.metadata #>> '{attribution,current,source}', ''),
                'direct'
              )
            ELSE events.source_value
          END AS source_value
        FROM (${trafficEventsSql}) events, ranges
        WHERE events.visitor_key IS NOT NULL
          AND events.event_at >= range_start
          AND events.event_at < range_end
      ),
      daily_channel_visits AS (
        SELECT DISTINCT ON (day_kst, visitor_key)
          day_kst,
          visitor_key,
          CASE
            WHEN source_value = '인스타그램'
              OR source_value ILIKE '%instagram%'
              OR LOWER(source_value) = 'ig' THEN '인스타그램'
            WHEN source_value = '블로그'
              OR source_value ILIKE '%blog%'
              OR source_value ILIKE '%블로그%' THEN '블로그'
            WHEN source_value = '스레드'
              OR source_value ILIKE '%thread%' THEN '스레드'
            WHEN source_value = '검색'
              OR source_value ILIKE '%naver%'
              OR source_value ILIKE '%google%'
              OR source_value ILIKE '%daum%'
              OR source_value ILIKE '%search%' THEN '검색'
            ELSE '직접유입'
          END AS channel_label
        FROM raw_channel_visits
        ORDER BY day_kst, visitor_key, event_at, id
      ),
      channel_counts AS (
        SELECT
          day_kst,
          'channel:' || channel_label AS metric_key,
          COUNT(*)::TEXT AS count
        FROM daily_channel_visits
        GROUP BY day_kst, channel_label
      ),
      screen_visits AS (
        SELECT
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          events.visitor_key,
          CASE
            WHEN events.screen_key IN ('home', 'job_detail', 'diagnosis', 'community', 'my', 'calendar', 'login')
              THEN events.screen_key
            WHEN split_part(events.landing_path, '?', 1) = '/' THEN 'home'
            WHEN split_part(events.landing_path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
            WHEN split_part(events.landing_path, '?', 1) LIKE '/ai-tools/diagnosis%'
              OR split_part(events.landing_path, '?', 1) LIKE '/events/diagnosis%' THEN 'diagnosis'
            WHEN split_part(events.landing_path, '?', 1) LIKE '/community%' THEN 'community'
            WHEN split_part(events.landing_path, '?', 1) LIKE '/my%' THEN 'my'
            WHEN split_part(events.landing_path, '?', 1) LIKE '/calendar%' THEN 'calendar'
            WHEN split_part(events.landing_path, '?', 1) LIKE '/login%'
              OR split_part(events.landing_path, '?', 1) LIKE '/auth%' THEN 'login'
            ELSE 'other'
          END AS screen_key
        FROM (${trafficEventsSql}) events, ranges
        WHERE events.visitor_key IS NOT NULL
          AND events.event_at >= range_start
          AND events.event_at < range_end
      ),
      screen_counts AS (
        SELECT
          day_kst,
          'screen:' || screen_key AS metric_key,
          COUNT(*)::TEXT AS count
        FROM screen_visits
        GROUP BY day_kst, screen_key
      ),
      raw_banner_events AS (
        SELECT
          (events.created_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          CASE
            WHEN events.event_type = 'banner_click'
              THEN 'banner:' || COALESCE(NULLIF(events.properties->>'banner_key', ''), 'unknown')
            ELSE 'banner:' || events.event_type
          END AS metric_key
        FROM public.product_events events, ranges
        WHERE events.created_at >= range_start
          AND events.created_at < range_end
          AND ${excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")}
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
      banner_counts AS (
        SELECT day_kst, 'banner:total' AS metric_key, COUNT(*)::TEXT AS count
        FROM raw_banner_events
        GROUP BY day_kst
        UNION ALL
        SELECT day_kst, metric_key, COUNT(*)::TEXT AS count
        FROM raw_banner_events
        WHERE metric_key IN ('banner:job_detail_bookmark_click', 'banner:job_detail_apply_click')
        GROUP BY day_kst, metric_key
      ),
      all_page_events AS (
        SELECT * FROM (${trafficEventsSql}) events
      ),
      job_detail_visits AS (
        SELECT DISTINCT ON (
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date,
          events.visitor_key
        )
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
          events.visitor_key,
          events.event_at
        FROM all_page_events events, ranges
        WHERE events.visitor_key IS NOT NULL
          AND events.event_at >= range_start
          AND events.event_at < range_end
          AND (
            events.screen_key = 'job_detail'
            OR split_part(events.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
          )
        ORDER BY
          (events.event_at AT TIME ZONE 'Asia/Seoul')::date,
          events.visitor_key,
          events.event_at,
          events.id
      ),
      later_page_activity AS (
        SELECT DISTINCT visits.day_kst, visits.visitor_key
        FROM job_detail_visits visits
        JOIN all_page_events events
          ON events.visitor_key = visits.visitor_key
         AND events.event_at > visits.event_at
         AND events.event_at <= visits.event_at + INTERVAL '30 minutes'
      ),
      later_action_activity AS (
        SELECT DISTINCT visits.day_kst, visits.visitor_key
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
      ),
      activity_visitors AS (
        SELECT day_kst, visitor_key FROM later_page_activity
        UNION
        SELECT day_kst, visitor_key FROM later_action_activity
      ),
      behavior_counts AS (
        SELECT day_kst, 'behavior:job_detail_visitors' AS metric_key, COUNT(*)::TEXT AS count
        FROM job_detail_visits
        GROUP BY day_kst
        UNION ALL
        SELECT day_kst, 'behavior:activity_visitors' AS metric_key, COUNT(*)::TEXT AS count
        FROM activity_visitors
        GROUP BY day_kst
        UNION ALL
        SELECT day_kst, 'behavior:bookmark_clicks' AS metric_key, COUNT(*)::TEXT AS count
        FROM raw_banner_events
        WHERE metric_key = 'banner:job_detail_bookmark_click'
        GROUP BY day_kst
        UNION ALL
        SELECT day_kst, 'behavior:apply_clicks' AS metric_key, COUNT(*)::TEXT AS count
        FROM raw_banner_events
        WHERE metric_key = 'banner:job_detail_apply_click'
        GROUP BY day_kst
      ),
      counts AS (
        SELECT * FROM visitor_counts
        UNION ALL SELECT * FROM signup_counts
        UNION ALL SELECT * FROM product_visit_counts
        UNION ALL SELECT * FROM product_start_counts
        UNION ALL SELECT * FROM product_complete_counts
        UNION ALL SELECT * FROM channel_counts
        UNION ALL SELECT * FROM screen_counts
        UNION ALL SELECT * FROM banner_counts
        UNION ALL SELECT * FROM behavior_counts
      )
      SELECT
        to_char(days.day_kst, 'MM/DD') AS label,
        metric_defs.metric_key,
        COALESCE(counts.count, '0') AS count
      FROM days
      CROSS JOIN metric_defs
      LEFT JOIN counts
        ON counts.day_kst = days.day_kst
       AND counts.metric_key = metric_defs.metric_key
      ORDER BY days.day_kst, metric_defs.metric_key
    `,
    dashboardDateParams,
  );

  const funnelResult = await query<FunnelRow>(
    `
      ${dashboardRangeSql}
      SELECT
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (page_visits.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT page_visits.visitor_key) AS daily_count
            FROM (${selectedProductConfig.pageVisitEventsSql}) page_visits, ranges
            WHERE page_visits.event_at >= range_start AND page_visits.event_at < range_end
            GROUP BY 1
          ) daily_page_visits
        ) AS page_visits,
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (starts.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT starts.visitor_key) AS daily_count
            FROM (${selectedProductConfig.startEventsSql}) starts, ranges
            WHERE starts.event_at >= range_start AND starts.event_at < range_end
            GROUP BY 1
          ) daily_starts
        ) AS coaching_started,
        (
          SELECT COALESCE(SUM(daily_count), 0)
          FROM (
            SELECT (completes.event_at AT TIME ZONE 'Asia/Seoul')::date AS day_kst,
              COUNT(DISTINCT completes.visitor_key) AS daily_count
            FROM (${selectedProductConfig.completeEventsSql}) completes, ranges
            WHERE completes.event_at >= range_start AND completes.event_at < range_end
            GROUP BY 1
          ) daily_completes
        ) AS coaching_completed
    `,
    dashboardDateParams,
  );

  const funnelRow = funnelResult.rows[0];
  const pageVisits = numberValue(funnelRow?.page_visits);
  const started = numberValue(funnelRow?.coaching_started);
  const completed = numberValue(funnelRow?.coaching_completed);
  const base = Math.max(
    selectedProductConfig.hasVisitStep ? pageVisits : started,
    completed,
    1,
  );
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
      ${dashboardRangeSql},
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
          AND event_at >= range_start
          AND event_at < range_end
        ORDER BY visitor_key, event_at, id
      )
      SELECT
        source_value AS label,
        COUNT(*) AS count
      FROM acquisition_visitors
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
      FROM public.product_events events, ranges
      WHERE events.created_at >= range_start
        AND events.created_at < range_end
        AND ${excludedEventCondition("events.user_id", "NULLIF(events.properties->>'ip_address', '')")}
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
    acquisition_channels AS (
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
        AND event_at >= range_start
        AND event_at < range_end
      ORDER BY visitor_key, event_at, id
    ),
    normalized_events AS (
      SELECT
        traffic_events.visitor_key,
        COALESCE(acquisition_channels.source_value, traffic_events.source_value) AS source_value,
        CASE
          WHEN traffic_events.screen_key IN ('home', 'job_detail', 'diagnosis', 'community', 'my', 'calendar', 'login')
            THEN traffic_events.screen_key
          WHEN split_part(traffic_events.landing_path, '?', 1) = '/' THEN 'home'
          WHEN split_part(traffic_events.landing_path, '?', 1) ~ '^/jobs/[^/]+$' THEN 'job_detail'
          WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/ai-tools/diagnosis%'
            OR split_part(traffic_events.landing_path, '?', 1) LIKE '/events/diagnosis%'
            THEN 'diagnosis'
          WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/community%' THEN 'community'
          WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/my%' THEN 'my'
          WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/calendar%' THEN 'calendar'
          WHEN split_part(traffic_events.landing_path, '?', 1) LIKE '/login%'
            OR split_part(traffic_events.landing_path, '?', 1) LIKE '/auth%'
            THEN 'login'
          ELSE 'other'
        END AS normalized_screen_key
      FROM (${trafficEventsSql}) traffic_events
      LEFT JOIN acquisition_channels
        ON acquisition_channels.visitor_key = traffic_events.visitor_key
      CROSS JOIN ranges
      WHERE traffic_events.event_at >= ranges.range_start
        AND traffic_events.event_at < ranges.range_end
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
      acquisition_channels AS (
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
          AND event_at >= range_start
          AND event_at < range_end
        ORDER BY visitor_key, event_at, id
      ),
      page_event_source AS (
        SELECT traffic_events.*
        FROM (${trafficEventsSql}) traffic_events
        CROSS JOIN ranges
        WHERE traffic_events.visitor_key IS NOT NULL
          AND traffic_events.event_at >= ranges.range_start - INTERVAL '30 days'
          AND traffic_events.event_at < ranges.range_end + INTERVAL '30 days'
      ),
      page_event_gaps AS (
        SELECT
          page_event_source.*,
          LAG(page_event_source.event_at) OVER (
            PARTITION BY page_event_source.visitor_key
            ORDER BY page_event_source.event_at, page_event_source.id
          ) AS previous_event_at
        FROM page_event_source
      ),
      page_event_sessions AS (
        SELECT
          page_event_gaps.*,
          SUM(
            CASE
              WHEN previous_event_at IS NULL
                OR event_at > previous_event_at + INTERVAL '30 minutes'
                THEN 1
              ELSE 0
            END
          ) OVER (
            PARTITION BY visitor_key
            ORDER BY event_at, id
            ROWS UNBOUNDED PRECEDING
          ) AS session_no
        FROM page_event_gaps
      ),
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
          traffic_events.event_at,
          traffic_events.visitor_key || ':' || traffic_events.session_no::TEXT AS session_key
        FROM (
          SELECT
            traffic_events.id,
            traffic_events.visitor_key,
            traffic_events.landing_path,
            traffic_events.screen_key,
            traffic_events.event_at,
            traffic_events.session_no,
            COALESCE(acquisition_channels.source_value, traffic_events.source_value) AS source_value
          FROM page_event_sessions traffic_events
          LEFT JOIN acquisition_channels
            ON acquisition_channels.visitor_key = traffic_events.visitor_key
        ) traffic_events
      ),
      all_page_events AS (
        SELECT
          traffic_events.id::TEXT AS event_id,
          traffic_events.visitor_key,
          traffic_events.landing_path,
          traffic_events.screen_key,
          traffic_events.event_at
        FROM (${trafficEventsSql}) traffic_events
        CROSS JOIN ranges
        WHERE traffic_events.visitor_key IS NOT NULL
          AND traffic_events.event_at >= ranges.range_start - INTERVAL '30 days'
          AND traffic_events.event_at < ranges.range_end + INTERVAL '30 days'
      ),
      channel_defs AS (
        SELECT *
        FROM (VALUES
          ('블로그', 1),
          ('검색', 2),
          ('인스타그램', 3),
          ('스레드', 4),
          ('직접유입', 5)
        ) AS channels(label, sort_order)
      ),
      job_detail_visits AS (
        SELECT
          page_events.visit_id,
          page_events.visitor_key,
          page_events.source_label,
          page_events.event_at,
          page_events.session_key
        FROM page_events
        WHERE page_events.screen_key = 'job_detail'
          OR split_part(page_events.landing_path, '?', 1) ~ '^/jobs/[^/]+$'
      ),
      job_detail_channel_visitors AS (
        SELECT DISTINCT ON (session_key)
          visit_id,
          visitor_key,
          source_label,
          event_at,
          session_key
        FROM job_detail_visits
        CROSS JOIN ranges
        WHERE event_at >= ranges.range_start
          AND event_at < ranges.range_end
        ORDER BY session_key, event_at DESC, visit_id DESC
      ),
      product_actions AS (
        SELECT
          events.id::TEXT AS action_id,
          events.visitor_key,
          events.event_type,
          COALESCE(acquisition_channels.source_value, 'direct') AS source_value,
          events.created_at AS event_at
        FROM (
          SELECT
            product_events.id,
            COALESCE(
              product_events.user_id::TEXT,
              product_events.anonymous_id::TEXT,
              NULLIF(product_events.properties->>'session_id', ''),
              NULLIF(CONCAT_WS('|', NULLIF(product_events.properties->>'ip_address', ''), NULLIF(product_events.properties->>'user_agent', '')), '')
            ) AS visitor_key,
            product_events.event_type,
            product_events.created_at
          FROM public.product_events
          CROSS JOIN ranges
          WHERE product_events.created_at >= ranges.range_start
            AND product_events.created_at < ranges.range_end
            AND ${excludedEventCondition("product_events.user_id", "NULLIF(product_events.properties->>'ip_address', '')")}
            AND (
              product_events.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click')
              OR (
                product_events.event_type = 'banner_click'
                AND product_events.properties->>'placement' = 'job_detail_bottom'
              )
            )
        ) events
        LEFT JOIN acquisition_channels
          ON acquisition_channels.visitor_key = events.visitor_key
      ),
      normalized_action_events AS (
        SELECT
          product_actions.action_id,
          product_actions.visitor_key,
          product_actions.event_type,
          product_actions.event_at,
          CASE
            WHEN product_actions.source_value = '인스타그램'
              OR product_actions.source_value ILIKE '%instagram%'
              OR LOWER(product_actions.source_value) = 'ig'
              THEN '인스타그램'
            WHEN product_actions.source_value = '블로그'
              OR product_actions.source_value ILIKE '%blog%'
              OR product_actions.source_value ILIKE '%블로그%'
              THEN '블로그'
            WHEN product_actions.source_value = '스레드'
              OR product_actions.source_value ILIKE '%thread%'
              THEN '스레드'
            WHEN product_actions.source_value = '검색'
              OR product_actions.source_value ILIKE '%naver%'
              OR product_actions.source_value ILIKE '%google%'
              OR product_actions.source_value ILIKE '%daum%'
              OR product_actions.source_value ILIKE '%search%'
              THEN '검색'
            ELSE '직접유입'
          END AS source_label
        FROM product_actions
      ),
      attributed_page_events AS (
        SELECT DISTINCT ON (page_events.event_id)
          page_events.event_id,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key,
          page_events.screen_key,
          page_events.landing_path,
          page_events.event_at
        FROM job_detail_visits
        JOIN all_page_events page_events
          ON page_events.visitor_key = job_detail_visits.visitor_key
         AND page_events.event_at > job_detail_visits.event_at
         AND page_events.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
        ORDER BY page_events.event_id, job_detail_visits.event_at DESC, job_detail_visits.visit_id DESC
      ),
      attributed_action_events AS (
        SELECT DISTINCT ON (actions.action_id)
          actions.action_id,
          actions.event_type,
          job_detail_visits.source_label,
          job_detail_visits.visitor_key,
          actions.event_at
        FROM job_detail_visits
        JOIN normalized_action_events actions
          ON actions.visitor_key = job_detail_visits.visitor_key
         AND actions.event_at > job_detail_visits.event_at
         AND actions.event_at <= job_detail_visits.event_at + INTERVAL '30 minutes'
        ORDER BY actions.action_id, job_detail_visits.event_at DESC, job_detail_visits.visit_id DESC
      ),
      later_page_events AS (
        SELECT DISTINCT source_label, visitor_key
        FROM attributed_page_events
      ),
      later_action_events AS (
        SELECT DISTINCT source_label, visitor_key
        FROM attributed_action_events
      ),
      bookmark_counts AS (
        SELECT
          source_label,
          COUNT(*) FILTER (WHERE event_type = 'job_detail_bookmark_click') AS bookmark_count,
          COUNT(*) FILTER (WHERE event_type = 'job_detail_apply_click') AS apply_count
        FROM attributed_action_events
        GROUP BY source_label
      ),
      other_page_move_counts AS (
        SELECT
          source_label,
          COUNT(*) AS page_move_count
        FROM attributed_page_events
        WHERE NOT (
             screen_key = 'job_detail'
          OR split_part(landing_path, '?', 1) ~ '^/jobs/[^/]+$'
        )
        GROUP BY source_label
      ),
      other_page_visitors AS (
        SELECT
          source_label,
          COUNT(DISTINCT visitor_key) AS visitor_count
        FROM attributed_page_events
        WHERE NOT (
             screen_key = 'job_detail'
          OR split_part(landing_path, '?', 1) ~ '^/jobs/[^/]+$'
        )
        GROUP BY source_label
      ),
      recognized_action_or_page_visitors AS (
        SELECT DISTINCT source_label, visitor_key
        FROM attributed_action_events
        UNION
        SELECT DISTINCT source_label, visitor_key
        FROM attributed_page_events
        WHERE NOT (
             screen_key = 'job_detail'
          OR split_part(landing_path, '?', 1) ~ '^/jobs/[^/]+$'
        )
      ),
      revisit_events AS (
        SELECT DISTINCT
          current_visit.source_label,
          current_visit.visitor_key
        FROM job_detail_channel_visitors current_visit
        JOIN all_page_events page_events
          ON page_events.visitor_key = current_visit.visitor_key
         AND page_events.event_at > current_visit.event_at + INTERVAL '30 minutes'
         AND page_events.event_at <= current_visit.event_at + INTERVAL '30 days'
      ),
      stats AS (
        SELECT
          job_detail_channel_visitors.source_label,
          COUNT(DISTINCT job_detail_channel_visitors.visitor_key) AS visitors,
          COUNT(DISTINCT job_detail_channel_visitors.visitor_key) FILTER (
            WHERE later_page_events.visitor_key IS NULL
              AND later_action_events.visitor_key IS NULL
          ) AS bounce_count,
          COUNT(DISTINCT job_detail_channel_visitors.visitor_key) FILTER (
            WHERE later_page_events.visitor_key IS NOT NULL
               OR later_action_events.visitor_key IS NOT NULL
          ) AS activity_count,
          COUNT(DISTINCT revisit_events.visitor_key) AS revisit_count,
          COALESCE(bookmark_counts.bookmark_count, 0) AS bookmark_count,
          COALESCE(bookmark_counts.apply_count, 0) AS apply_count,
          COALESCE(other_page_move_counts.page_move_count, 0) AS page_move_count
          , GREATEST(
              COUNT(DISTINCT job_detail_channel_visitors.visitor_key)
              - COUNT(DISTINCT job_detail_channel_visitors.visitor_key) FILTER (
                  WHERE later_page_events.visitor_key IS NULL
                    AND later_action_events.visitor_key IS NULL
                )
              - COUNT(DISTINCT recognized_action_or_page_visitors.visitor_key),
              0
            ) AS unknown_count
        FROM job_detail_channel_visitors
        LEFT JOIN later_page_events
          ON later_page_events.source_label = job_detail_channel_visitors.source_label
         AND later_page_events.visitor_key = job_detail_channel_visitors.visitor_key
        LEFT JOIN later_action_events
          ON later_action_events.source_label = job_detail_channel_visitors.source_label
         AND later_action_events.visitor_key = job_detail_channel_visitors.visitor_key
        LEFT JOIN revisit_events
          ON revisit_events.source_label = job_detail_channel_visitors.source_label
         AND revisit_events.visitor_key = job_detail_channel_visitors.visitor_key
        LEFT JOIN bookmark_counts
          ON bookmark_counts.source_label = job_detail_channel_visitors.source_label
        LEFT JOIN other_page_move_counts
          ON other_page_move_counts.source_label = job_detail_channel_visitors.source_label
        LEFT JOIN other_page_visitors
          ON other_page_visitors.source_label = job_detail_channel_visitors.source_label
        LEFT JOIN recognized_action_or_page_visitors
          ON recognized_action_or_page_visitors.source_label = job_detail_channel_visitors.source_label
         AND recognized_action_or_page_visitors.visitor_key = job_detail_channel_visitors.visitor_key
        GROUP BY job_detail_channel_visitors.source_label
          , bookmark_counts.bookmark_count
          , bookmark_counts.apply_count
          , other_page_move_counts.page_move_count
          , other_page_visitors.visitor_count
      )
      SELECT
        channel_defs.label AS channel_label,
        COALESCE(stats.visitors, 0)::TEXT AS visitors,
        COALESCE(stats.activity_count, 0)::TEXT AS activity_count,
        COALESCE(stats.bounce_count, 0)::TEXT AS bounce_count,
        COALESCE(stats.revisit_count, 0)::TEXT AS revisit_count,
        COALESCE(stats.bookmark_count, 0)::TEXT AS bookmark_count,
        COALESCE(stats.apply_count, 0)::TEXT AS apply_count,
        COALESCE(stats.page_move_count, 0)::TEXT AS page_move_count
        , COALESCE(stats.unknown_count, 0)::TEXT AS unknown_count
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
    const bookmark = numberValue(row.bookmark_count);
    const apply = numberValue(row.apply_count);
    const pageMove = numberValue(row.page_move_count);
    const unknown = numberValue(row.unknown_count);
    const formatBehaviorRate = (value: number) =>
      visitors > 0 ? formatPercent((value / visitors) * 100) : "0%";

    return {
      key: row.channel_label,
      channelLabel: row.channel_label,
      visitors: `${formatCount(visitors)}명`,
      bounce: `${formatCount(bounce)}명`,
      bounceRate: formatBehaviorRate(bounce),
      revisit: `${formatCount(revisit)}명`,
      revisitRate: formatBehaviorRate(revisit),
      bookmark: `${formatCount(bookmark)}건`,
      bookmarkRate: visitors > 0 ? formatPercent((bookmark / visitors) * 100) : "0%",
      apply: `${formatCount(apply)}건`,
      applyRate: visitors > 0 ? formatPercent((apply / visitors) * 100) : "0%",
      pageMove: `${formatCount(pageMove)}건`,
      pageMoveRate: formatBehaviorRate(pageMove),
      unknown: `${formatCount(unknown)}명`,
      unknownRate: formatBehaviorRate(unknown),
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
  const productVisitTrend = productConversionTrendResult.rows.map((row) => ({
    label: row.label,
    value: numberValue(row.visits),
  }));
  const productStartTrend = productConversionTrendResult.rows.map((row) => ({
    label: row.label,
    value: numberValue(row.starts),
  }));
  const productCompleteTrend = productConversionTrendResult.rows.map((row) => ({
    label: row.label,
    value: numberValue(row.completes),
  }));
  const productRateTrend = toLinePoints(productRateTrendResult.rows);
  const productHasVisitStep = selectedProductConfig.hasVisitStep;
  const trafficChannelTrend = createTrendSeries(
    trafficTrendResult.rows,
    [
      { key: "channel:인스타그램", label: "인스타그램", color: "#2f7ff0" },
      { key: "channel:블로그", label: "블로그", color: "#1fb573" },
      { key: "channel:스레드", label: "스레드", color: "#a54de8" },
      { key: "channel:검색", label: "검색", color: "#f5b91e" },
      { key: "channel:직접유입", label: "직접유입", color: "#5a6580" },
    ],
  );
  const screenTrend = createTrendSeries(
    trafficTrendResult.rows,
    screenChartDefinitions,
  );
  const bannerClickTrend = createTrendSeries(
    trafficTrendResult.rows,
    [
      { key: "banner:total", label: "전체 클릭", color: "#2f7ff0" },
      {
        key: "banner:job_detail_bookmark_click",
        label: "찜",
        color: "#f5b91e",
      },
      {
        key: "banner:job_detail_apply_click",
        label: "지원",
        color: "#1fb573",
      },
    ],
  );
  const jobDetailBehaviorTrend = createTrendSeries(
    trafficTrendResult.rows,
    [
      {
        key: "behavior:job_detail_visitors",
        label: "공고 상세 방문자",
        color: "#2f7ff0",
      },
      {
        key: "behavior:activity_visitors",
        label: "후속 행동 방문자",
        color: "#1fb573",
      },
      {
        key: "behavior:bookmark_clicks",
        label: "찜 클릭",
        color: "#f5b91e",
      },
      {
        key: "behavior:apply_clicks",
        label: "지원 클릭",
        color: "#e65c5c",
      },
    ],
  );
  const visitorSignupListTrend = createTrendSeries(
    listTrendResult.rows,
    [
      { key: "visitor", label: "방문자", color: "#2f7ff0" },
      { key: "signup", label: "전체 신규 가입", color: "#ffb000" },
    ],
  );
  const productConversionTrend = productHasVisitStep
    ? [
        { label: "방문", color: "#2f7ff0", data: productVisitTrend },
        { label: "시작", color: "#ffb000", data: productStartTrend },
        {
          label: "완료",
          color: "#20bf7a",
          data: productCompleteTrend.length ? productCompleteTrend : productRateTrend,
        },
      ]
    : [
        { label: "진단 시작", color: "#ffb000", data: productStartTrend },
        {
          label: "진단 완료",
          color: "#20bf7a",
          data: productCompleteTrend.length ? productCompleteTrend : productRateTrend,
        },
      ];
  const productConversionListTrend = createTrendSeries(
    listTrendResult.rows,
    productHasVisitStep
      ? [
          { key: "product:visit", label: "방문", color: "#2f7ff0" },
          { key: "product:start", label: "시작", color: "#ffb000" },
          { key: "product:complete", label: "완료", color: "#20bf7a" },
        ]
      : [
          { key: "product:start", label: "진단 시작", color: "#ffb000" },
          { key: "product:complete", label: "진단 완료", color: "#20bf7a" },
        ],
  );
  const trafficChannelListTrend = createTrendSeries(
    listTrendResult.rows,
    [
      { key: "channel:인스타그램", label: "인스타그램", color: "#2f7ff0" },
      { key: "channel:블로그", label: "블로그", color: "#1fb573" },
      { key: "channel:스레드", label: "스레드", color: "#a54de8" },
      { key: "channel:검색", label: "검색", color: "#f5b91e" },
      { key: "channel:직접유입", label: "직접유입", color: "#5a6580" },
    ],
  );
  const screenListTrend = createTrendSeries(
    listTrendResult.rows,
    screenTrendDefinitions,
  );
  const bannerClickListTrend = createTrendSeries(
    listTrendResult.rows,
    [
      { key: "banner:total", label: "전체 클릭", color: "#2f7ff0" },
      {
        key: "banner:job_detail_bookmark_click",
        label: "찜",
        color: "#f5b91e",
      },
      {
        key: "banner:job_detail_apply_click",
        label: "지원",
        color: "#1fb573",
      },
    ],
  );
  const jobDetailBehaviorListTrend = createTrendSeries(
    listTrendResult.rows,
    [
      {
        key: "behavior:job_detail_visitors",
        label: "공고 상세 방문자",
        color: "#2f7ff0",
      },
      {
        key: "behavior:activity_visitors",
        label: "후속 행동 방문자",
        color: "#1fb573",
      },
      {
        key: "behavior:bookmark_clicks",
        label: "찜 클릭",
        color: "#f5b91e",
      },
      {
        key: "behavior:apply_clicks",
        label: "지원 클릭",
        color: "#e65c5c",
      },
    ],
  );
  const jobDetailVisitors = behaviorPatternResult.rows.reduce(
    (sum, row) => sum + numberValue(row.visitors),
    0,
  );
  const jobDetailActivityVisitors = behaviorPatternResult.rows.reduce(
    (sum, row) => sum + numberValue(row.activity_count),
    0,
  );
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
        label: "조회 기간 방문자",
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
    jobDetailMetrics: [
      {
        label: "공고 상세 방문자",
        value: formatCount(jobDetailVisitors),
        unit: "명",
        delta: "선택 기간 기준",
        trend: "down",
      },
      {
        label: "공고 상세 후 행동",
        value: formatCount(jobDetailActivityVisitors),
        unit: "명",
        delta: "30분 내 페이지 이동·클릭 포함",
        trend: "down",
      },
    ],
    visitorTrend: toLinePoints(visitorTrendResult.rows),
    coachingTrend: toLinePoints(coachingTrendResult.rows),
    signupTrend: toLinePoints(signupTrendResult.rows),
    visitorSignupListTrend,
    productRateTrend,
    productVisitTrend,
    productStartTrend,
    productCompleteTrend,
    productConversionTrend,
    productConversionListTrend,
    funnelItems: selectedProductConfig.hasVisitStep
      ? [
          createFunnel(
            1,
            "방문",
            pageVisits,
            null,
            base,
            createFunnelHref("visit"),
          ),
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
        ]
      : [
          createFunnel(
            1,
            selectedProductConfig.startStepLabel,
            started,
            null,
            base,
            createFunnelHref("start"),
          ),
          createFunnel(
            2,
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
        count: `(${formatCount(totalChannelCount)}명)`,
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
          count: `(${formatCount(count)}명)`,
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
      href: createDatedLogHref("/activity-logs", {
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
        href: createDatedLogHref("/activity-logs", {
          screen: screen.key,
          event: "visit",
          ...(selectedChannelKey !== "all"
            ? { channel: selectedChannelKey }
            : {}),
        }),
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
    dashboardPeriodText:
      dashboardDateRange.preset === "today"
        ? "오늘"
        : dashboardDateRange.preset === "7d"
          ? "최근 7일"
          : dashboardDateRange.preset === "30d"
            ? "최근 30일"
            : `직접 설정 · ${dashboardDateRange.label}`,
    dashboardPreset: dashboardDateRange.preset,
    productOptions: dashboardProductOptions,
    productFunnelTitle: selectedProductConfig.funnelTitle,
    productFunnelDescription: selectedProductConfig.funnelDescription,
    productRateTrendTitle: selectedProductConfig.rateTrendTitle,
    productHasVisitStep: selectedProductConfig.hasVisitStep,
    trafficChannelTrend,
    trafficChannelListTrend,
    screenTrend,
    screenListTrend,
    bannerClickTrend,
    bannerClickListTrend,
    jobDetailBehaviorTrend,
    jobDetailBehaviorListTrend,
  };
}
