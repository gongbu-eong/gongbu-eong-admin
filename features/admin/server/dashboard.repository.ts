import {
  BannerClickItem,
  ChannelItem,
  FunnelItem,
  LinePoint,
  MetricItem,
  WorkItem,
} from "@/features/admin/data/dashboard";
import { query } from "@/features/admin/server/db";

type DashboardData = {
  metrics: MetricItem[];
  visitorTrend: LinePoint[];
  diagnosisTrend: LinePoint[];
  signupTrend: LinePoint[];
  funnelItems: FunnelItem[];
  channels: ChannelItem[];
  channelTotal: string;
  bannerClicks: BannerClickItem[];
  bannerClickTotal: string;
  workItems: WorkItem[];
};

type MetricsRow = {
  today_visitors: string;
  yesterday_visitors: string;
  today_signups: string;
  yesterday_signups: string;
  today_diagnosis_runs: string;
  yesterday_diagnosis_runs: string;
  today_diagnosis_completed: string;
  yesterday_diagnosis_completed: string;
};

type TrendRow = {
  label: string;
  value: string;
};

type FunnelRow = {
  visitors: string;
  diagnosis_started: string;
  diagnosis_completed: string;
  result_views: string;
};

type ChannelRow = {
  label: string;
  count: string;
};

type WorkRow = {
  reports: string;
  inquiries: string;
};

type BannerClickRow = {
  banner_key: string | null;
  banner_name: string | null;
  click_count: string;
  unique_count: string;
};

const channelAssets: Record<string, Pick<ChannelItem, "icon" | "iconClass">> = {
  "인스타그램": { icon: "/admin-assets/channel-instagram.svg" },
  "블로그": { icon: "/admin-assets/channel-blog.png", iconClass: "blog" },
  "스레드": { icon: "/admin-assets/channel-threads.png", iconClass: "threads" },
  "검색": { icon: "/admin-assets/channel-search.png", iconClass: "search" },
  "직접유입": { icon: "/admin-assets/channel-direct.png", iconClass: "direct" },
};

const bannerLabels: Record<string, string> = {
  job_detail_resume_coaching: "공고 상세 AI NCS 자소서 코칭 배너",
};

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

const diagnosisStartEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND (
      path LIKE '/ai-tools/diagnosis%'
      OR path LIKE '/events/diagnosis%'
    )
    AND path NOT LIKE '%result%'
  UNION
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.diagnosis_runs
  UNION
  SELECT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type = 'diagnosis_start'
`;

const diagnosisCompleteEventsSql = `
  SELECT id::TEXT AS result_key, created_at AS event_at
  FROM public.diagnosis_results
  UNION
  SELECT COALESCE(diagnosis_result_id::TEXT, diagnosis_run_id::TEXT, id::TEXT) AS result_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type = 'diagnosis_complete'
`;

const diagnosisResultViewEventsSql = `
  SELECT ${visitorKeySql} AS visitor_key, created_at AS event_at
  FROM public.access_logs
  WHERE event_name = 'page_view'
    AND (
      path LIKE '%/ai-tools/diagnosis/result%'
      OR path LIKE '%/events/diagnosis/result%'
      OR path LIKE '%diagnosis%result%'
    )
  UNION
  SELECT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT) AS visitor_key, created_at AS event_at
  FROM public.product_events
  WHERE event_type IN ('diagnosis_result_view', 'diagnosis_result_open', 'diagnosis_result_check')
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

function mapBannerLabel(key: string | null, name: string | null) {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedKey = key?.trim();
  if (!trimmedKey) return "알 수 없는 배너";

  return bannerLabels[trimmedKey] || trimmedKey;
}

export async function getDashboardData(): Promise<DashboardData> {
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
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${diagnosisStartEventsSql}) starts, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_diagnosis_runs,
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${diagnosisStartEventsSql}) starts, ranges
        WHERE event_at >= yesterday_start AND event_at < today_start
      ) AS yesterday_diagnosis_runs,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${diagnosisCompleteEventsSql}) completes, ranges
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS today_diagnosis_completed,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${diagnosisCompleteEventsSql}) completes, ranges
        WHERE event_at >= yesterday_start AND event_at < today_start
      ) AS yesterday_diagnosis_completed
    FROM ranges
  `);

  const metricsRow = metricsResult.rows[0];
  const todayVisitors = numberValue(metricsRow?.today_visitors);
  const yesterdayVisitors = numberValue(metricsRow?.yesterday_visitors);
  const todaySignups = numberValue(metricsRow?.today_signups);
  const yesterdaySignups = numberValue(metricsRow?.yesterday_signups);
  const todayDiagnosisRuns = numberValue(metricsRow?.today_diagnosis_runs);
  const yesterdayDiagnosisRuns = numberValue(metricsRow?.yesterday_diagnosis_runs);
  const todayDiagnosisCompleted = numberValue(
    metricsRow?.today_diagnosis_completed,
  );
  const yesterdayDiagnosisCompleted = numberValue(
    metricsRow?.yesterday_diagnosis_completed,
  );
  const todayCompletionRate =
    todayDiagnosisRuns > 0 ? (todayDiagnosisCompleted / todayDiagnosisRuns) * 100 : 0;
  const yesterdayCompletionRate =
    yesterdayDiagnosisRuns > 0
      ? (yesterdayDiagnosisCompleted / yesterdayDiagnosisRuns) * 100
      : 0;

  const visitorDelta = createDelta(todayVisitors, yesterdayVisitors);
  const signupDelta = createDelta(todaySignups, yesterdaySignups);
  const diagnosisDelta = createDelta(
    todayDiagnosisCompleted,
    yesterdayDiagnosisCompleted,
  );
  const completionDelta = createDelta(todayCompletionRate, yesterdayCompletionRate);

  const [visitorTrendResult, diagnosisTrendResult, signupTrendResult] =
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
        SELECT to_char(days.day_kst, 'MM/DD') AS label, COUNT(DISTINCT completes.result_key) AS value
        FROM days
        LEFT JOIN (${diagnosisCompleteEventsSql}) completes
          ON completes.event_at >= days.day_kst AT TIME ZONE 'Asia/Seoul'
         AND completes.event_at < (days.day_kst + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul'
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
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${diagnosisStartEventsSql}) starts, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS diagnosis_started,
      (
        SELECT COUNT(DISTINCT result_key)
        FROM (${diagnosisCompleteEventsSql}) completes, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS diagnosis_completed,
      (
        SELECT COUNT(DISTINCT visitor_key)
        FROM (${diagnosisResultViewEventsSql}) result_views, bounds
        WHERE event_at >= today_start AND event_at < tomorrow_start
      ) AS result_views,
      0 AS unused
  `);

  const funnelRow = funnelResult.rows[0];
  const visitors = numberValue(funnelRow?.visitors);
  const rawStarted = numberValue(funnelRow?.diagnosis_started);
  const rawCompleted = numberValue(funnelRow?.diagnosis_completed);
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

  const sortedChannels = Array.from(groupedChannels.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxChannelCount = Math.max(...sortedChannels.map(([, count]) => count), 1);
  const totalChannelCount = sortedChannels.reduce((sum, [, count]) => sum + count, 0);

  const workResult = await query<WorkRow>(`
    SELECT
      (
        SELECT COUNT(*)
        FROM public.community_reports
        WHERE status IN ('pending', 'reviewing')
      ) AS reports,
      (
        SELECT COUNT(*)
        FROM public.support_inquiries
        WHERE status IN ('open', 'pending')
      ) AS inquiries
  `);
  const workRow = workResult.rows[0];
  const bannerClickResult = await query<BannerClickRow>(`
    WITH bounds AS (
      SELECT
        date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') AT TIME ZONE 'Asia/Seoul' AS today_start,
        (date_trunc('day', NOW() AT TIME ZONE 'Asia/Seoul') + INTERVAL '1 day') AT TIME ZONE 'Asia/Seoul' AS tomorrow_start
    )
    SELECT
      COALESCE(NULLIF(properties->>'banner_key', ''), 'unknown') AS banner_key,
      NULLIF(properties->>'banner_name', '') AS banner_name,
      COUNT(*) AS click_count,
      COUNT(DISTINCT COALESCE(user_id::TEXT, anonymous_id::TEXT, id::TEXT)) AS unique_count
    FROM public.product_events, bounds
    WHERE event_type = 'banner_click'
      AND created_at >= today_start
      AND created_at < tomorrow_start
    GROUP BY 1, 2
    ORDER BY COUNT(*) DESC
    LIMIT 5
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
        label: "진단 수행",
        value: formatCount(todayDiagnosisCompleted),
        delta: diagnosisDelta.text,
        trend: diagnosisDelta.trend,
      },
      {
        label: "진단 완료율",
        value: formatPercent(todayCompletionRate),
        delta: completionDelta.text,
        trend: completionDelta.trend,
      },
    ],
    visitorTrend: toLinePoints(visitorTrendResult.rows),
    diagnosisTrend: toLinePoints(diagnosisTrendResult.rows),
    signupTrend: toLinePoints(signupTrendResult.rows),
    funnelItems: [
      createFunnel(1, "방문", visitors, null, base),
      createFunnel(2, "진단 시작", started, visitors, base),
      createFunnel(3, "진단 완료", completed, started, base),
      createFunnel(4, "결과 확인", resultViews, completed, base),
    ],
    channels: sortedChannels.map(([label, count]) => ({
      label,
      value: formatPercent(
        totalChannelCount > 0 ? (count / totalChannelCount) * 100 : 0,
      ),
      count: `(${formatCount(count)}건)`,
      fill: fillPercent(count, maxChannelCount),
      icon: channelAssets[label]?.icon || channelAssets["직접유입"].icon,
      iconClass: channelAssets[label]?.iconClass || channelAssets["직접유입"].iconClass,
    })),
    channelTotal: formatCount(totalChannelCount),
    bannerClicks: bannerClickRows.map((row) => ({
      key: row.banner_key || "unknown",
      label: mapBannerLabel(row.banner_key, row.banner_name),
      count: `${formatCount(numberValue(row.click_count))}건`,
      uniqueCount: `${formatCount(numberValue(row.unique_count))}명`,
      fill: fillPercent(numberValue(row.click_count), maxBannerClickCount),
    })),
    bannerClickTotal: formatCount(totalBannerClickCount),
    workItems: [
      {
        title: "신고접수",
        subtitle: "커뮤니티 글·댓글",
        value: formatCount(numberValue(workRow?.reports)),
        valueTone: "danger",
        icon: "/admin-assets/task-report.png",
      },
      {
        title: "답변 대기 문의",
        subtitle: "고객 문의",
        value: formatCount(numberValue(workRow?.inquiries)),
        icon: "/admin-assets/task-inquiry.png",
      },
    ],
  };
}
