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
  dashboardFactsSql,
  type AnalyticsFact,
} from "./analytics-facts";

type DashboardData = {
  metrics: MetricItem[];
  jobDetailMetrics: MetricItem[];
  visitorTrend: LinePoint[];
  coachingTrend: LinePoint[];
  signupTrend: LinePoint[];
  newSignupTrend: LinePoint[];
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
  unidentifiedPageCount: number;
  unidentifiedStartCount: number;
  unmatchedCompletionCount: number;
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
  { key: "jobs", label: "채용공고 목록" },
  { key: "resume_coaching", label: "자소서 코칭" },
  { key: "interview_coaching", label: "면접 코칭" },
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
  { key: "screen:jobs", label: "채용공고 목록", color: "#647048" },
  { key: "screen:resume_coaching", label: "자소서 코칭", color: "#ae5169" },
  { key: "screen:interview_coaching", label: "면접 코칭", color: "#247e8a" },
  { key: "screen:other", label: "기타", color: "#9aa7bb" },
];

const screenChartDefinitions = screenTrendDefinitions;

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
      text: current > 0 ? "신규 발생 (이전 기간 0)" : "변동 없음",
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

function toLinePoints(rows: Array<{ label: string; value: number }>) {
  return rows.map((row) => ({
    label: row.label,
    value: numberValue(row.value),
  }));
}

function createTrendSeries(
  rows: Array<{ label: string; metric_key: string; count: number }>,
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
    valueSuffix: definition.key === "behavior:apply_clicks" || definition.key.startsWith("banner:") || definition.key.startsWith("screen:") ? "건" : "명",
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
    drop: `(미완료 ${formatCount(dropped)}명)`,
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const date = new Date(trimmed + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
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

function mapBannerLabel(key: string | null, name: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedKey = key?.trim();
  if (!trimmedKey) return "알 수 없는 배너";

  return bannerLabels[trimmedKey] || trimmedKey;
}

async function getDashboardFacts(
  product: string,
  startDate: string,
  endDate: string,
) {
  const startedAt = Date.now();
  // The SQL contract tests exercise the raw-fact builder directly. Production
  // always reads the materialized daily facts below.
  if (process.env.NODE_ENV === "test") {
    const result = await query<AnalyticsFact>(dashboardFactsSql(product), [startDate, endDate]);
    return result.rows;
  }

  const today = toKstDateInput();
  const periodDays = Math.round(
    (Date.parse(endDate) - Date.parse(startDate)) / 86_400_000,
  ) + 1;
  const shiftDay = (day: string, offset: number) => {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const firstDay = [shiftDay(startDate, -periodDays), shiftDay(today, -6)]
    .sort()[0];
  const lastDay = [endDate, today].sort().at(-1)!;
  const result = await query<AnalyticsFact>(
    `
      SELECT day::text AS day, metric, channel, dimension, value::text AS value
      FROM public.analytics_dashboard_facts
      WHERE scope IN ('traffic', 'accounts', $3)
        AND day BETWEEN $1::date AND $2::date
      ORDER BY day, metric, channel, dimension
    `,
    [firstDay, lastDay, product],
  );

  if (process.env.ADMIN_ANALYTICS_TIMING === "1") {
    console.info(
      `[dashboard analytics] fact read ${Date.now() - startedAt}ms (${result.rows.length} rows)`,
    );
  }

  return result.rows;
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

  const storedFacts = await getDashboardFacts(
    selectedProductKey,
    dashboardDateParams[0],
    dashboardDateParams[1],
  );
  const shiftDay = (day: string, offset: number) => {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const periodDays = Math.round((Date.parse(dashboardDateRange.endDate) - Date.parse(dashboardDateRange.startDate)) / 86400000) + 1;
  const todayForCalendar = toKstDateInput();
  const firstCalendarDay = [
    shiftDay(dashboardDateRange.startDate, -periodDays),
    shiftDay(todayForCalendar, -6),
  ].sort()[0];
  const lastCalendarDay = [dashboardDateRange.endDate, todayForCalendar].sort().at(-1)!;
  const factDays = new Set(storedFacts.map((fact) => fact.day));
  const calendarFacts: AnalyticsFact[] = [];
  for (let day = firstCalendarDay; day <= lastCalendarDay; day = shiftDay(day, 1)) {
    if (!factDays.has(day)) {
      calendarFacts.push({ day, metric: "calendar", channel: "", dimension: "", value: "0" });
    }
  }
  const facts = [...storedFacts, ...calendarFacts];
  const selectedFacts = facts.filter(f => f.day >= dashboardDateRange.startDate && f.day <= dashboardDateRange.endDate);
  const previousFacts = facts.filter(f => f.day >= shiftDay(dashboardDateRange.startDate, -periodDays) && f.day < dashboardDateRange.startDate);
  const today = facts.find(f => f.metric === "clock")?.day || toKstDateInput();
  const graphFacts = facts.filter(f => f.day >= shiftDay(today, -6) && f.day <= today);
  const sum = (rows: AnalyticsFact[], metric: string, dimension?: string) => rows.reduce((n, f) =>
    n + (f.metric === metric && (dimension === undefined || f.dimension === dimension) ? Number(f.value) : 0), 0);
  const todayVisitors = sum(selectedFacts, "visitor");
  const yesterdayVisitors = sum(previousFacts, "visitor");
  const todaySignups = sum(selectedFacts, "new_signup");
  const yesterdaySignups = sum(previousFacts, "new_signup");
  const rangeCoachingRequests = sum(selectedFacts, "product_start");
  const rangeCoachingCompleted = sum(selectedFacts, "product_complete");
  const previousRangeCoachingRequests = sum(previousFacts, "product_start");
  const previousRangeCoachingCompleted = sum(previousFacts, "product_complete");
  const todayCompletionRate = rangeCoachingRequests ? rangeCoachingCompleted / rangeCoachingRequests * 100 : 0;
  const yesterdayCompletionRate = previousRangeCoachingRequests ? previousRangeCoachingCompleted / previousRangeCoachingRequests * 100 : 0;
  const visitorDelta = createPeriodDelta(todayVisitors, yesterdayVisitors);
  const signupDelta = createPeriodDelta(todaySignups, yesterdaySignups);
  const coachingDelta = createPeriodDelta(rangeCoachingRequests, previousRangeCoachingRequests);
  const completionDelta = createPeriodDelta(todayCompletionRate, yesterdayCompletionRate);
  const metricAliases: Record<string, string> = {
    product_visit: "product:visit", product_start: "product:start", product_complete: "product:complete",
    job_visitor: "behavior:job_detail_visitors", job_activity: "behavior:activity_visitors", job_returning: "behavior:revisit_visitors",
  };
  const trendRows = (rows: AnalyticsFact[]) => {
    const values = new Map<string, { label: string; metric_key: string; count: number }>();
    const add = (day: string, key: string, value: number) => {
      const id = day + "|" + key;
      const row = values.get(id) || { label: day, metric_key: key, count: 0 };
      row.count += value;
      values.set(id, row);
    };
    for (const f of rows) {
      const value = Number(f.value);
      if (f.metric === "screen") {
        if (selectedChannelKey === "all" || f.channel === selectedChannelLabel) add(f.day, "screen:" + f.dimension, value);
      } else if (f.metric === "visitor") {
        add(f.day, "channel:" + f.channel, value);
        add(f.day, "visitor", value);
      } else if (f.metric === "banner") {
        add(f.day, "banner:" + f.dimension, value);
        add(f.day, "banner:total", value);
        if (f.dimension === "job_detail_apply_click") add(f.day, "behavior:apply_clicks", value);
      } else if (f.metric === "signup" || f.metric === "new_signup" || f.metric === "calendar" || metricAliases[f.metric]) {
        add(f.day, metricAliases[f.metric] || f.metric, value);
      }
    }
    return [...values.values()].sort((a, b) => a.label.localeCompare(b.label));
  };
  const trafficTrendResult = { rows: trendRows(graphFacts) };
  const listTrendResult = { rows: trendRows(selectedFacts) };
  const daily = (rows: AnalyticsFact[], metric: string) => [...new Set(rows.map(f => f.day))].sort().map(day => ({
    label: day, value: sum(rows.filter(f => f.day === day), metric),
  }));
  const visitorTrendResult = { rows: daily(graphFacts, "visitor") };
  const coachingTrendResult = { rows: daily(graphFacts, "product_start") };
  const signupTrendResult = { rows: daily(graphFacts, "signup") };
  const newSignupTrendResult = { rows: daily(graphFacts, "new_signup") };
  const productRateTrendResult = { rows: daily(graphFacts, "product_complete") };
  const productConversionTrendResult = { rows: daily(graphFacts, "calendar").map(({ label }) => {
    const rows = graphFacts.filter(f => f.day === label);
    return { label, visits: sum(rows, "product_visit"), starts: sum(rows, "product_start"), completes: sum(rows, "product_complete") };
  }) };
  const pageVisits = sum(selectedFacts, "product_visit");
  const started = rangeCoachingRequests;
  const completed = rangeCoachingCompleted;
  const visitStarted = sum(selectedFacts, "product_visit_start");
  const base = Math.max(selectedProductConfig.hasVisitStep ? pageVisits : started, started, 1);
  const createFunnelHref = (step: string) => {
    if (step !== "visit" && step !== "start" && step !== "complete") {
      return undefined;
    }
    const params = new URLSearchParams({
      startDate: dashboardDateRange.startDate,
      endDate: dashboardDateRange.endDate,
      event: "activity",
      from: "dashboard",
    });
    const screenByProduct = {
      diagnosis: "diagnosis",
      resume_coaching: "resume_coaching",
      interview_coaching: "interview_coaching",
    } as const;
    const eventByProduct = {
      diagnosis: { start: "diagnosis_start", complete: "diagnosis_complete" },
      resume_coaching: { start: "coaching_start", complete: "coaching_complete" },
      interview_coaching: {
        start: "interview_coaching_start",
        complete: "interview_coaching_complete",
      },
    } as const;

    if (step === "visit") {
      params.set("event", "visit");
      params.set("screen", screenByProduct[selectedProductKey as keyof typeof screenByProduct]);
    } else {
      params.set("eventType", eventByProduct[selectedProductKey as keyof typeof eventByProduct][step === "complete" ? "complete" : "start"]);
    }

    return "/activity-logs?" + params.toString();
  };
  const sortedChannels = dashboardChannelOptions.slice(1).map(item =>
    [item.label, sum(selectedFacts.filter(f => f.channel === item.label), "visitor")] as const,
  ).sort((a, b) => b[1] - a[1]);
  const maxChannelCount = Math.max(...sortedChannels.map(([, n]) => n), 1);
  const totalChannelCount = sortedChannels.reduce((n, [, count]) => n + count, 0);
  const bannerClickResult = { rows: Object.keys(bannerLabels).map(key => ({
    banner_key: key, banner_name: bannerLabels[key],
    click_count: sum(selectedFacts, "banner", key), unique_count: sum(selectedFacts, "banner_uv", key),
  })) };
  const screenInflowResult = { rows: selectedFacts.filter(f => f.metric === "screen").map(f => ({
    channel_source: f.channel, screen_key: f.dimension, inflow_count: Number(f.value),
  })) };
  const behaviorPatternResult = { rows: [...new Set(selectedFacts.filter(f =>
    f.metric.startsWith("job_") || (f.metric === "banner" && f.dimension === "job_detail_apply_click"),
  ).map(f => f.channel))].map(channel => {
    const rows = selectedFacts.filter(f => f.channel === channel);
    return {
      channel_label: channel, visitors: sum(rows, "job_visitor"), activity_count: sum(rows, "job_activity"),
      revisit_count: sum(rows, "job_returning"), apply_count: sum(rows, "banner", "job_detail_apply_click"),
      page_move_count: sum(rows, "job_page_moves"),
    };
  }).sort((a, b) => b.visitors - a.visitors) };
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
  const createBehaviorLogHref = (params: Record<string, string>) => {
    const searchParams = new URLSearchParams({
      ...params,
      startDate: dashboardDateRange.startDate,
      endDate: dashboardDateRange.endDate,
      from: "dashboard",
    });
    return `/activity-logs?${searchParams.toString()}`;
  };
  const behaviorPatterns = behaviorPatternResult.rows.map((row) => {
    const visitors = numberValue(row.visitors);
    const activity = numberValue(row.activity_count);
    const revisit = numberValue(row.revisit_count);
    const apply = numberValue(row.apply_count);
    const pageMove = numberValue(row.page_move_count);
    const channelKey =
      dashboardChannelOptions.find((option) => option.label === row.channel_label)?.key ||
      "direct";
    const channelParam: Record<string, string> =
      channelKey === "all" ? {} : { channel: channelKey };
    const formatBehaviorRate = (value: number) =>
      visitors > 0 ? formatPercent((value / visitors) * 100) : "0%";

    return {
      key: row.channel_label,
      channelLabel: row.channel_label,
      visitors: `${formatCount(visitors)}명`,
      visitorHref: createBehaviorLogHref({
        event: "activity",
        cohort: "job_visitor",
        ...channelParam,
      }),
      activity: `${formatCount(activity)}명`,
      activityHref: createBehaviorLogHref({
        event: "activity",
        cohort: "job_activity",
        ...channelParam,
      }),
      activityRate: formatBehaviorRate(activity),
      revisit: `${formatCount(revisit)}명`,
      revisitHref: createBehaviorLogHref({
        event: "activity",
        cohort: "job_returning",
        ...channelParam,
      }),
      revisitRate: formatBehaviorRate(revisit),
      apply: `${formatCount(apply)}건`,
      applyHref: createBehaviorLogHref({
        event: "product",
        eventType: "job_detail_apply_click",
        ...channelParam,
      }),
      pageMove: `${formatCount(pageMove)}건`,
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
        key: "behavior:apply_clicks",
        label: "지원 클릭",
        color: "#f5b91e",
      },
      {
        key: "behavior:revisit_visitors",
        label: "재방문자",
        color: "#e65c5c",
      },
    ],
  );
  const visitorSignupListTrend = createTrendSeries(
    listTrendResult.rows,
    [
      { key: "visitor", label: "방문자", color: "#2f7ff0" },
      { key: "signup", label: "전체 가입자", color: "#20bf7a" },
      { key: "new_signup", label: "신규 가입자", color: "#ffb000" },
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
        key: "behavior:apply_clicks",
        label: "지원 클릭",
        color: "#f5b91e",
      },
      {
        key: "behavior:revisit_visitors",
        label: "재방문자",
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
    params.set("period", dashboardDateRange.preset);

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
        label: "조회 기간 방문자 (일별 합산)",
        value: formatCount(todayVisitors),
        unit: "명",
        delta: visitorDelta.text,
        trend: visitorDelta.trend,
      },
      {
        label: "신규 가입",
        unit: "명",
        value: formatCount(todaySignups),
        delta: signupDelta.text,
        trend: signupDelta.trend,
      },
      {
        label: selectedProductConfig.metricLabel,
        unit: "명",
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
        delta: "일별 순 방문자 합산",
        trend: "down",
      },
      {
        label: "공고 상세 후 행동",
        value: formatCount(jobDetailActivityVisitors),
        unit: "명",
        delta: "같은 세션 내 페이지 이동·클릭 포함",
        trend: "down",
      },
    ],
    visitorTrend: toLinePoints(visitorTrendResult.rows),
    coachingTrend: toLinePoints(coachingTrendResult.rows),
    signupTrend: toLinePoints(signupTrendResult.rows),
    newSignupTrend: toLinePoints(newSignupTrendResult.rows),
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
            null,
            base,
            createFunnelHref("start"),
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
        value: totalChannelCount > 0 ? "100%" : "0%",
        count: `(${formatCount(totalChannelCount)}명)`,
        fill: totalChannelCount > 0 ? 100 : 0,
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
    unidentifiedPageCount: sum(selectedFacts, "unidentified_page"),
    unidentifiedStartCount: sum(selectedFacts, "unidentified_start"),
    unmatchedCompletionCount: sum(selectedFacts, "unmatched_completion"),
    productOptions: dashboardProductOptions,
    productFunnelTitle: selectedProductConfig.funnelTitle,
    productFunnelDescription: `시작일 기준 일별 인원 합산. 완료는 현재까지 확인된 결과입니다.${selectedProductConfig.hasVisitStep ? ` 방문 후 시작 ${formatCount(visitStarted)}명 / 선행 방문 기록 없는 시작 ${formatCount(started - visitStarted)}명.` : " 진단은 같은 브라우저 익명 ID의 직전 Q1 진입에 연결합니다."}`,
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
