import {
  BannerClickLogData,
  BannerClickLogQuery,
  CampaignPerformanceData,
  CampaignPerformanceRow,
  TrafficBannerClick,
  TrafficChannel,
  TrafficData,
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

type CountRow = {
  count: string;
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
  "COALESCE(user_id::TEXT, anonymous_id::TEXT, ip_address::TEXT, id::TEXT)";

const trafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
    ip_address,
    id,
    event_name,
    title,
    user_agent,
    path,
    COALESCE(
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
    referrer,
    created_at AS event_at,
    created_at
  FROM public.access_logs
`;

const campaignTrafficEventsSql = `
  SELECT
    user_id,
    anonymous_id,
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
    : "7d";
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
    value === "direct"
    ? value
    : "all";
}

function normalizePage(value?: TrafficLogQuery["page"]) {
  const page = Number(value || 1);
  if (!Number.isFinite(page)) return 1;
  return Math.max(1, Math.floor(page));
}

function normalizeKeyword(value?: string | null) {
  return (value || "").trim().slice(0, 100);
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
          CASE
            WHEN LOWER(logs.source_value) LIKE '%instagram%'
              OR LOWER(logs.source_value) = 'ig'
              THEN '인스타그램'
            WHEN LOWER(logs.source_value) LIKE '%blog%'
              THEN '블로그'
            WHEN LOWER(logs.source_value) LIKE '%thread%'
              THEN '스레드'
            WHEN LOWER(logs.source_value) LIKE '%naver%'
              OR LOWER(logs.source_value) LIKE '%google%'
              OR LOWER(logs.source_value) LIKE '%daum%'
              OR LOWER(logs.source_value) LIKE '%search%'
              THEN '검색'
            ELSE '직접유입'
          END AS source_value,
          logs.id
        FROM days
        JOIN (${trafficEventsSql}) logs
          ON logs.event_at >= days.day_kst::timestamp AT TIME ZONE 'Asia/Seoul'
         AND logs.event_at < (days.day_kst + 1)::timestamp AT TIME ZONE 'Asia/Seoul'
      ),
      grouped AS (
        SELECT day_kst, source_value, COUNT(*) AS count
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
        ${periodBoundsSql}
        SELECT source_value, COUNT(*) AS count
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= current_start
          AND event_at < current_end
        GROUP BY source_value
      `,
      params,
    );
  const previousResult = await query<ChannelCountRow>(
      `
        ${periodBoundsSql}
        SELECT source_value, COUNT(*) AS count
        FROM (${trafficEventsSql}) traffic_events, ranges
        WHERE event_at >= previous_start
          AND event_at < previous_end
        GROUP BY source_value
      `,
      params,
    );
  const trendRows = await getDailyChannelTrendRows(trendParams);
  const dailyTrendRows = await getDailyChannelTrendRows(params);
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
  const risingChannel =
    [...channels]
      .filter((channel) => channel.count > 0)
      .sort((a, b) => b.deltaPercent - a.deltaPercent)[0] || topChannel;
  const directChannel =
    channels.find((channel) => channel.label === "직접유입") || channels[0];
  const previousDirect = previousChannels.get("직접유입") || 0;
  const previousDirectPercent =
    previousTotal > 0 ? (previousDirect / previousTotal) * 100 : 0;
  const directDelta = createDelta(
    directChannel.percent,
    previousDirectPercent,
    "재방문·브랜드 지표",
  );

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

  return {
    metrics: [
      {
        label: "전체 유입",
        value: formatCount(totalVisitors),
        unit: "건",
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
        label: "급상승 채널",
        value: risingChannel?.count ? risingChannel.label : "없음",
        delta:
          risingChannel && risingChannel.count > 0
            ? `▲ ${formatPercent(Math.max(0, risingChannel.deltaPercent))} 가장 큰 증가`
            : "0% 가장 큰 증가",
        trend: risingChannel && risingChannel.deltaPercent > 0 ? "up" : "down",
      },
      {
        label: "직접유입 비중",
        value: formatPercent(directChannel?.percent || 0),
        delta: directDelta.text,
        trend: directDelta.trend,
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
    bannerClicks,
    yLabels: createYLabels(maxValue),
    maxValue,
    totalVisitors,
  };
}

export async function getTrafficLogData(
  args?: TrafficLogQuery,
): Promise<TrafficLogData> {
  const { startDate, endDate } = createDefaultLogDates(args);
  const channel = normalizeLogChannel(args?.channel);
  const channelLabel = mapChannelFilterToLabel(channel);
  const keyword = normalizeKeyword(args?.keyword);
  const page = normalizePage(args?.page);
  const pageSize = 20;
  const filterParams = [startDate, endDate, channelLabel, keyword];
  const baseSql = `
    WITH input AS (
      SELECT
        $1::date AS requested_start,
        $2::date AS requested_end,
        $3::text AS requested_channel,
        $4::text AS keyword
    ),
    ranges AS (
      SELECT
        (LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
        ((GREATEST(requested_start, requested_end) + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
        requested_channel,
        keyword
      FROM input
    ),
    normalized_logs AS (
      SELECT
        logs.id::text AS id,
        logs.created_at AS visited_at,
        logs.ip_address::text AS ip_address,
        logs.user_agent,
        logs.path,
        logs.referrer,
        CASE
          WHEN LOWER(source_value) LIKE '%instagram%'
            OR LOWER(source_value) = 'ig'
            THEN '인스타그램'
          WHEN LOWER(source_value) LIKE '%blog%'
            THEN '블로그'
          WHEN LOWER(source_value) LIKE '%thread%'
            THEN '스레드'
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
      LIMIT $5::integer OFFSET $6::integer
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
    keyword,
  };
}

export async function getBannerClickLogData(
  args?: BannerClickLogQuery,
): Promise<BannerClickLogData> {
  const { startDate, endDate } = createDefaultLogDates(args);
  const keyword = normalizeKeyword(args?.keyword);
  const page = normalizePage(args?.page);
  const pageSize = 20;
  const filterParams = [startDate, endDate, keyword];
  const baseSql = `
    WITH input AS (
      SELECT
        $1::date AS requested_start,
        $2::date AS requested_end,
        $3::text AS keyword
    ),
    ranges AS (
      SELECT
        (LEAST(requested_start, requested_end)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_start,
        ((GREATEST(requested_start, requested_end) + 1)::timestamp AT TIME ZONE 'Asia/Seoul') AS current_end,
        keyword
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
      LIMIT $4::integer OFFSET $5::integer
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
          COUNT(*) FILTER (
            WHERE row_no = 1
              AND (
                landing_path LIKE '%/ai-tools/diagnosis%'
                OR landing_path LIKE '%/events/diagnosis%'
                OR link LIKE '%diagnosis%'
                OR link LIKE '%진단%'
              )
          ) AS diagnosis_starts,
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
          COUNT(*) FILTER (WHERE event_type = 'diagnosis_start') AS diagnosis_starts,
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
