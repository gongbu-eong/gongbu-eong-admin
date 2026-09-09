import {
  BannerClickItem,
  ChannelItem,
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
  funnelItems: FunnelItem[];
  channels: ChannelItem[];
  channelTotal: string;
  bannerClicks: BannerClickItem[];
  bannerClickTotal: string;
  screenInflows: ScreenInflowItem[];
  screenInflowTotal: string;
  selectedChannelKey: string;
  selectedChannelLabel: string;
};

type MetricsRow = {
  today_visitors: string;
  yesterday_visitors: string;
  today_signups: string;
  yesterday_signups: string;
  today_coaching_requests: string;
  yesterday_coaching_requests: string;
  today_coaching_completed: string;
  yesterday_coaching_completed: string;
};

type TrendRow = {
  label: string;
  value: string;
};

type FunnelRow = {
  visitors: string;
  coaching_started: string;
  coaching_completed: string;
  result_views: string;
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

const channelAssets: Record<string, Pick<ChannelItem, "icon" | "iconClass">> = {
  "인스타그램": { icon: "/admin-assets/channel-instagram.svg" },
  "블로그": { icon: "/admin-assets/channel-blog.png", iconClass: "blog" },
  "스레드": { icon: "/admin-assets/channel-threads.png", iconClass: "threads" },
  "검색": { icon: "/admin-assets/channel-search.png", iconClass: "search" },
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
  { key: "coaching", label: "AI NCS 자소서 코칭" },
  { key: "diagnosis", label: "강약점" },
  { key: "community", label: "커뮤니티" },
  { key: "my", label: "마이페이지" },
  { key: "calendar", label: "캘린더" },
  { key: "login", label: "로그인" },
  { key: "other", label: "기타" },
];

const visitorKeySql =
  "COALESCE(user_id::TEXT, anonymous_id::TEXT, ip_address::TEXT, id::TEXT)";

const trafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
    ip_address,
    id,
    COALESCE(
      NULLIF(substring(path from '[?&]utm_source=([^&]+)'), ''),
      CASE
        WHEN referrer ILIKE '%gongbueong.career.co.kr%' OR referrer ILIKE '%localhost%' THEN NULL
        ELSE NULLIF(referrer, '')
      END,
      'direct'
    ) AS source_value,
    path AS landing_path,
    referrer,
    created_at AS event_at,
    created_at
  FROM public.access_logs
`;

const coachingStartEventsSql = `
  SELECT id::TEXT AS request_key, COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.resume_coaching_requests
  UNION
  SELECT COALESCE(
    NULLIF(properties->>'request_id', ''),
    NULLIF(properties->>'coaching_request_id', ''),
    id::TEXT
  ) AS request_key, COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type IN ('coaching_start', 'resume_coaching_start')
`;

const coachingCompleteEventsSql = `
  SELECT results.id::TEXT AS result_key, results.created_at AS event_at
  FROM public.resume_coaching_results results
  UNION
  SELECT COALESCE(
    NULLIF(properties->>'result_id', ''),
    NULLIF(properties->>'coaching_result_id', ''),
    NULLIF(properties->>'request_id', ''),
    id::TEXT
  ) AS result_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type IN ('coaching_complete', 'resume_coaching_complete')
`;

const coachingResultViewEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND (
      path LIKE '%/ai-tools/coaching/result%'
      OR path LIKE '%/my/coaching/%'
      OR path LIKE '%coaching%result%'
    )
  UNION
  SELECT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type IN ('coaching_result_view', 'coaching_result_open', 'resume_coaching_result_view')
`;

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
): FunnelItem {
  if (!previousValue) {
    return {
      step,
      label,
      value: `${formatCount(value)}명`,
      fill: fillPercent(value, baseValue),
    };
  }

  const conversion = previousValue > 0 ? (value / previousValue) * 100 : 0;
  const dropped = Math.max(0, previousValue - value);

  return {
    step,
    label,
    value: `${formatCount(value)}명`,
    fill: fillPercent(value, baseValue),
    conversion: `(전환 ${formatPercent(conversion)})`,
    drop: `(이탈 ${formatCount(dropped)}명)`,
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

function mapBannerLabel(key: string | null, name: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedKey = key?.trim();
  if (!trimmedKey) return "알 수 없는 배너";

  return bannerLabels[trimmedKey] || trimmedKey;
}

export async function getDashboardData({
  selectedChannel,
}: {
  selectedChannel?: string | null;
} = {}): Promise<DashboardData> {
  const selectedChannelKey = normalizeDashboardChannel(selectedChannel);
  const selectedChannelLabel =
    dashboardChannelOptions.find((item) => item.key === selectedChannelKey)
      ?.label || "전체";

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
        SELECT COUNT(*)
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_visitors,
      (
        SELECT COUNT(*)
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
      ) AS yesterday_signups,
      (
        SELECT COUNT(DISTINCT request_key)
        FROM (${coachingStartEventsSql}) starts, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_coaching_requests,
      (
        SELECT COUNT(DISTINCT request_key)
        FROM (${coachingStartEventsSql}) starts, ranges
        WHERE event_at >= yesterday_start AND event_at < today_start
      ) AS yesterday_coaching_requests,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${coachingCompleteEventsSql}) completes, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_coaching_completed,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${coachingCompleteEventsSql}) completes, ranges
        WHERE event_at >= yesterday_start AND event_at < today_start
      ) AS yesterday_coaching_completed
    FROM ranges
  `);

  const metricsRow = metricsResult.rows[0];
  const todayVisitors = numberValue(metricsRow?.today_visitors);
  const yesterdayVisitors = numberValue(metricsRow?.yesterday_visitors);
  const todaySignups = numberValue(metricsRow?.today_signups);
  const yesterdaySignups = numberValue(metricsRow?.yesterday_signups);
  const todayCoachingRequests = numberValue(metricsRow?.today_coaching_requests);
  const yesterdayCoachingRequests = numberValue(
    metricsRow?.yesterday_coaching_requests,
  );
  const todayCoachingCompleted = numberValue(
    metricsRow?.today_coaching_completed,
  );
  const yesterdayCoachingCompleted = numberValue(
    metricsRow?.yesterday_coaching_completed,
  );
  const todayCompletionRate =
    todayCoachingRequests > 0
      ? (todayCoachingCompleted / todayCoachingRequests) * 100
      : 0;
  const yesterdayCompletionRate =
    yesterdayCoachingRequests > 0
      ? (yesterdayCoachingCompleted / yesterdayCoachingRequests) * 100
      : 0;

  const visitorDelta = createDelta(todayVisitors, yesterdayVisitors);
  const signupDelta = createDelta(todaySignups, yesterdaySignups);
  const coachingDelta = createDelta(
    todayCoachingRequests,
    yesterdayCoachingRequests,
  );
  const completionDelta = createDelta(todayCompletionRate, yesterdayCompletionRate);

  const [visitorTrendResult, coachingTrendResult, signupTrendResult] =
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
          COUNT(traffic_events.id) AS value
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
        LEFT JOIN (${coachingStartEventsSql}) starts
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
    ]);

  const funnelResult = await query<FunnelRow>(`
    WITH bounds AS (
      SELECT
        date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS today_start,
        (date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start
    )
    SELECT
      (
        SELECT COUNT(*)
        FROM (${trafficEventsSql}) traffic_events, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS visitors,
      (
        SELECT COUNT(DISTINCT request_key)
        FROM (${coachingStartEventsSql}) starts, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS coaching_started,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${coachingCompleteEventsSql}) completes, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS coaching_completed,
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${coachingResultViewEventsSql}) result_views, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS result_views,
      0 AS unused
  `);

  const funnelRow = funnelResult.rows[0];
  const visitors = numberValue(funnelRow?.visitors);
  const rawStarted = numberValue(funnelRow?.coaching_started);
  const rawCompleted = numberValue(funnelRow?.coaching_completed);
  const rawResultViews = numberValue(funnelRow?.result_views);
  const started = Math.max(rawStarted, rawCompleted, rawResultViews);
  const completed = Math.min(started, Math.max(rawCompleted, rawResultViews));
  const resultViews = Math.min(completed, rawResultViews);
  const base = Math.max(visitors, started, completed, resultViews, 1);

  const channelResult = await query<ChannelRow>(`
    WITH bounds AS (
      SELECT
        date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS today_start,
        (date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start
    )
      SELECT
        source_value AS label,
        COUNT(*) AS count
      FROM (${trafficEventsSql}) traffic_events, bounds
      WHERE event_at >= today_start AND event_at < tomorrow_start
      GROUP BY source_value
  `);

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

  const bannerClickResult = await query<BannerClickRow>(`
    WITH bounds AS (
      SELECT
        date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS today_start,
        (date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start
    ),
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
      FROM public.product_events, bounds
      WHERE created_at >= today_start
        AND created_at < tomorrow_start
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
  `);
  const screenInflowResult = await query<ScreenInflowRow>(`
    WITH bounds AS (
      SELECT
        date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS today_start,
        (date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start
    )
    SELECT
      source_value AS channel_source,
      CASE
        WHEN landing_path = '/' OR landing_path LIKE '/?%' THEN 'home'
        WHEN landing_path ~ '^/jobs/[^/?#]+' OR landing_path LIKE '%/jobs/%' THEN 'job_detail'
        WHEN landing_path LIKE '/ai-tools/coaching%' OR landing_path LIKE '%/ai-tools/coaching%' THEN 'coaching'
        WHEN landing_path LIKE '/ai-tools/diagnosis%' OR landing_path LIKE '/events/diagnosis%' OR landing_path LIKE '%/ai-tools/diagnosis%' OR landing_path LIKE '%/events/diagnosis%' THEN 'diagnosis'
        WHEN landing_path LIKE '/community%' OR landing_path LIKE '%/community%' THEN 'community'
        WHEN landing_path LIKE '/my%' OR landing_path LIKE '%/my%' THEN 'my'
        WHEN landing_path LIKE '/calendar%' OR landing_path LIKE '%/calendar%' THEN 'calendar'
        WHEN landing_path LIKE '/login%' OR landing_path LIKE '%/login%' OR landing_path LIKE '/auth%' OR landing_path LIKE '%/auth%' THEN 'login'
        ELSE 'other'
      END AS screen_key,
      COUNT(*) AS inflow_count
    FROM (${trafficEventsSql}) traffic_events, bounds
    WHERE event_at >= today_start AND event_at < tomorrow_start
    GROUP BY source_value, screen_key
  `);
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
        label: "AI NCS 자소서 코칭",
        value: formatCount(todayCoachingRequests),
        delta: coachingDelta.text,
        trend: coachingDelta.trend,
      },
      {
        label: "코칭 완료율",
        value: formatPercent(todayCompletionRate),
        delta: completionDelta.text,
        trend: completionDelta.trend,
      },
    ],
    visitorTrend: toLinePoints(visitorTrendResult.rows),
    coachingTrend: toLinePoints(coachingTrendResult.rows),
    signupTrend: toLinePoints(signupTrendResult.rows),
    funnelItems: [
      createFunnel(1, "방문", visitors, null, base),
      createFunnel(2, "코칭 시작", started, visitors, base),
      createFunnel(3, "코칭 완료", completed, started, base),
      createFunnel(4, "결과 확인", resultViews, completed, base),
    ],
    channels: [
      {
        key: "all",
        label: "전체",
        value: "100%",
        count: `(${formatCount(totalChannelCount)}건)`,
        fill: 100,
        emoji: "🌐",
        href: "/",
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
          href: optionKey === "all" ? "/" : `/?channel=${optionKey}`,
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
    })),
    bannerClickTotal: formatCount(totalBannerClickCount),
    screenInflows: dashboardScreenKeys.map((screen) => {
      const count = groupedScreenInflows.get(screen.key) || 0;

      return {
        key: screen.key,
        label: screen.label,
        count: `${formatCount(count)}건`,
        fill: fillPercent(count, maxScreenInflowCount),
      };
    }),
    screenInflowTotal: formatCount(totalScreenInflowCount),
    selectedChannelKey,
    selectedChannelLabel,
  };
}
