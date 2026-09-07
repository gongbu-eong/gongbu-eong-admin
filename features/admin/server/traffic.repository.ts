import {
  CampaignPerformanceData,
  CampaignPerformanceRow,
  TrafficChannel,
  TrafficData,
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
  const trendResult = await query<TrendRow>(
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
      trendParams,
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

  const trendLabels = Array.from(
    new Set(trendResult.rows.map((row) => row.label)),
  );
  const trendMap = new Map<string, Map<string, number>>();

  for (const row of trendResult.rows) {
    const label = mapChannelLabel(row.source_value);
    const dateMap = trendMap.get(label) || new Map<string, number>();
    dateMap.set(row.label, (dateMap.get(row.label) || 0) + numberValue(row.count));
    trendMap.set(label, dateMap);
  }

  const maxTrendValue = Math.max(
    ...Array.from(trendMap.values()).flatMap((dateMap) =>
      Array.from(dateMap.values()),
    ),
    0,
  );
  const dailyRows = trendLabels.map((day) => {
    const counts = trafficChannelOrder.reduce<Record<string, number>>(
      (accumulator, label) => {
        accumulator[label] = trendMap.get(label)?.get(day) || 0;
        return accumulator;
      },
      {},
    );
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return { date: day, counts, total };
  }).reverse();
  const maxValue = getNiceStep(Math.max(1, maxTrendValue * 1.15) / 4) * 4;
  const periodValue = `${period?.start_label || ""}~${period?.end_label || ""}`;

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
    yLabels: createYLabels(maxValue),
    maxValue,
    totalVisitors,
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
