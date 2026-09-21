import { excludedEventCondition, excludedUserCondition } from "./analytics-exclusion.repository";

// The current collector persists anonymous_id in localStorage, not a server cookie.
// It survives login. IP/session IDs must not turn into people.
export const cookieKey = (alias: string) => `NULLIF(${alias}.anonymous_id::text, '')`;

export function channelSql(source: string) {
  return `CASE
    WHEN ${source} ILIKE '%instagram%' OR lower(${source}) = 'ig' OR ${source} = '인스타그램' THEN '인스타그램'
    WHEN ${source} ILIKE '%blog%' OR ${source} = '블로그' THEN '블로그'
    WHEN ${source} ILIKE '%thread%' OR ${source} = '스레드' THEN '스레드'
    WHEN ${source} ~* '(naver|google|daum|bing|search)' OR ${source} = '검색' THEN '검색'
    ELSE '직접유입' END`;
}

export function screenSql(path: string) {
  return `CASE
    WHEN ${path} = '/' THEN 'home'
    WHEN ${path} ~ '^/jobs/[^/]+' THEN 'job_detail'
    WHEN ${path} = '/jobs' THEN 'jobs'
    WHEN ${path} LIKE '/events/diagnosis%' OR ${path} LIKE '/ai-tools/diagnosis%' THEN 'diagnosis'
    WHEN ${path} LIKE '/ai-tools/interview-coaching%' THEN 'interview_coaching'
    WHEN ${path} LIKE '/ai-tools/coaching%' THEN 'resume_coaching'
    WHEN ${path} LIKE '/community%' THEN 'community'
    WHEN ${path} LIKE '/my%' THEN 'my'
    WHEN ${path} LIKE '/calendar%' THEN 'calendar'
    WHEN ${path} LIKE '/login%' OR ${path} LIKE '/signup%' THEN 'login'
    ELSE 'other' END`;
}

export const bannerKeys = [
  "job_detail_resume_a", "job_detail_resume_b", "job_detail_strength_a",
  "job_detail_strength_b", "job_detail_bookmark_click", "job_detail_apply_click",
];

// start/end are SQL expressions supplied by callers, never user input.
export function trafficFactsCtes(start: string, end: string) {
  return `
    analytics_pages_raw AS MATERIALIZED (
      SELECT p.id AS id, p.user_id, p.anonymous_id, ${cookieKey("p")} AS visitor_key,
        p.created_at AS event_at, (p.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        split_part(p.path, '?', 1) AS path, p.path AS original_path,
        p.referrer, p.ip_address::text AS ip_address, p.user_agent,
        COALESCE(NULLIF(p.traffic_channel, ''), NULLIF(p.metadata->>'trafficChannel', ''),
          NULLIF(substring(p.path from '[?&]utm_source=([^&]+)'), ''),
          CASE WHEN p.referrer !~* '(gongbueong.career.co.kr|localhost)' THEN NULLIF(p.referrer, '') END,
          'direct') AS raw_source,
        p.metadata
      FROM public.access_logs p
      WHERE p.event_name = 'page_view'
        AND p.created_at >= (${start}) - interval '30 days' - interval '30 minutes'
        AND p.created_at < (${end})
        AND ${excludedEventCondition("p.user_id", "p.ip_address")}
    ),
    analytics_pages AS MATERIALIZED (
      SELECT p.*, ${screenSql("p.path")} AS screen,
        ${channelSql(`CASE WHEN raw_source ~* '(page_move|page move|internal|페이지 이동)'
          THEN COALESCE(NULLIF(metadata #>> '{attribution,current,source}', ''),
            NULLIF(metadata #>> '{attribution,first,source}', ''), 'direct') ELSE raw_source END`)} AS channel
      FROM analytics_pages_raw p
    ),
    analytics_products AS MATERIALIZED (
      SELECT e.id::text AS id, ${cookieKey("e")} AS visitor_key,
        e.created_at AS event_at, (e.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        e.event_type, split_part(e.properties->>'path', '?', 1) AS path,
        CASE WHEN e.event_type = 'banner_click' THEN e.properties->>'banner_key'
          WHEN e.event_type IN ('job_detail_bookmark_click', 'job_detail_apply_click') THEN e.event_type END AS banner_key
      FROM public.product_events e
      WHERE e.created_at >= (${start}) - interval '30 days' - interval '30 minutes'
        AND e.created_at < (${end})
        AND (
          e.event_type IN ('banner_click', 'job_detail_bookmark_click', 'job_detail_apply_click')
          OR e.event_type LIKE '%click'
          OR e.event_type LIKE '%start'
          OR e.event_type LIKE '%complete'
        )
        AND ${excludedEventCondition("e.user_id", "NULLIF(e.properties->>'ip_address', '')")}
    ),
    analytics_daily_users AS MATERIALIZED (
      SELECT DISTINCT ON (day, visitor_key) day, visitor_key, channel
      FROM analytics_pages WHERE visitor_key IS NOT NULL
      ORDER BY day, visitor_key, event_at, id
    ),
    analytics_activity AS (
      SELECT 'p:' || id AS id, visitor_key, event_at, day, path, 'page_view' AS event_type,
        screen = 'job_detail' AS is_job, NULL::text AS banner_key
      FROM analytics_pages WHERE visitor_key IS NOT NULL
      UNION ALL
      SELECT 'e:' || id, visitor_key, event_at, day, path, event_type, false, banner_key
      FROM analytics_products WHERE visitor_key IS NOT NULL
        AND event_type <> 'banner_impression'
    ),
    analytics_previous AS (
      SELECT *, LAG(event_at) OVER (PARTITION BY visitor_key ORDER BY event_at, is_job DESC, id) AS previous_at
      FROM analytics_activity
    ),
    analytics_sessions AS (
      SELECT *, SUM(CASE WHEN previous_at IS NULL OR event_at - previous_at >= interval '30 minutes' THEN 1 ELSE 0 END)
        OVER (PARTITION BY visitor_key ORDER BY event_at, is_job DESC, id) AS session_no
      FROM analytics_previous
    ),
    analytics_session_flags AS (
      SELECT *, FIRST_VALUE(previous_at) OVER session_window AS prior_session_at,
        FIRST_VALUE(event_at) OVER session_window AS session_start,
        MAX(event_at) FILTER (WHERE is_job) OVER (
          PARTITION BY visitor_key, session_no ORDER BY event_at, is_job DESC, id
          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
        ) AS last_job_at
      FROM analytics_sessions
      WINDOW session_window AS (PARTITION BY visitor_key, session_no ORDER BY event_at, is_job DESC, id ROWS UNBOUNDED PRECEDING)
    ),
    analytics_job_users AS MATERIALIZED (
      SELECT day, visitor_key,
        BOOL_OR(prior_session_at >= session_start - interval '30 days') AS returning
      FROM analytics_session_flags WHERE is_job
      GROUP BY day, visitor_key
    ),
    analytics_followups AS MATERIALIZED (
      SELECT (last_job_at AT TIME ZONE 'Asia/Seoul')::date AS day, visitor_key,
        COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_moves
      FROM analytics_session_flags
      WHERE last_job_at IS NOT NULL AND event_at >= last_job_at
        AND (event_type = 'page_view' OR event_type LIKE '%click%' OR event_type LIKE '%start%' OR event_type LIKE '%complete%')
      GROUP BY 1, 2
    )`;
}

// A completion belongs to its real start, not to an unrelated completion-day population.
export function conversionCtes(
  product: string,
  start = "'-infinity'::timestamptz",
  pagesCte = "analytics_pages",
) {
  const common = (alias: string, ip: string) => excludedEventCondition(`${alias}.user_id`, ip);
  let starts: string;
  let completions: string;
  if (product === "resume_coaching") {
    starts = `SELECT r.id AS id, ${cookieKey("r")} AS visitor_key, r.user_id, r.anonymous_id,
      r.created_at AS event_at, r.ip_address::text AS ip_address, r.user_agent,
      '/ai-tools/coaching'::text AS path FROM public.resume_coaching_requests r
      WHERE r.created_at >= (${start}) AND r.created_at <= NOW()
        AND ${common("r", "r.ip_address")}`;
    completions = `SELECT r.id AS start_id, MIN(results.created_at) AS completed_at
      FROM public.resume_coaching_requests r
      JOIN public.resume_coaching_results results ON results.request_id = r.id
      WHERE r.created_at >= (${start}) AND r.created_at <= NOW()
        AND results.created_at <= NOW()
      GROUP BY r.id`;
  } else if (product === "interview_coaching") {
    starts = `SELECT r.id AS id, ${cookieKey("r")} AS visitor_key, r.user_id, r.anonymous_id,
      r.started_at AS event_at, r.ip_address::text AS ip_address, r.user_agent,
      '/ai-tools/interview-coaching'::text AS path FROM public.interview_coaching_sessions r
      WHERE r.started_at >= (${start}) AND r.started_at <= NOW()
        AND ${common("r", "r.ip_address")}`;
    completions = `SELECT id AS start_id, COALESCE(completed_at, updated_at) AS completed_at
      FROM public.interview_coaching_sessions WHERE (completed_at IS NOT NULL OR result IS NOT NULL)
      AND COALESCE(completed_at, updated_at) <= NOW() AND started_at >= (${start})
      AND started_at <= NOW()`;
  } else {
    starts = `SELECT e.id AS id, ${cookieKey("e")} AS visitor_key, e.user_id, e.anonymous_id,
      e.created_at AS event_at, e.properties->>'ip_address' AS ip_address, e.properties->>'user_agent' AS user_agent,
      '/events/diagnosis'::text AS path FROM public.product_events e
      WHERE e.event_type = 'diagnosis_start' AND e.properties->>'action' IN ('question_1_view', 'start_button_click')
      AND e.created_at >= (${start}) AND e.created_at <= NOW()
      AND ${common("e", "NULLIF(e.properties->>'ip_address', '')")}`;
// Legacy Q1 events do not carry run_id. Use the nearest earlier Q1 for the same browser ID only.
    completions = `SELECT s.id AS start_id, MIN(COALESCE(r.completed_at, result.created_at)) AS completed_at
      FROM public.diagnosis_results result JOIN public.diagnosis_runs r ON r.id = result.diagnosis_run_id
      JOIN LATERAL (
        SELECT s.id FROM conversion_starts_raw s
        WHERE s.visitor_key = r.anonymous_id::text
          AND s.event_at <= COALESCE(r.completed_at, result.created_at)
        ORDER BY s.event_at DESC, s.id DESC LIMIT 1
      ) s ON true
      WHERE COALESCE(r.completed_at, result.created_at) <= NOW()
        AND COALESCE(r.completed_at, result.created_at) >= (${start})
        AND ${excludedEventCondition("result.user_id", "r.ip_address")}
      GROUP BY s.id`;
  }
  const path = product === "resume_coaching" ? "/ai-tools/coaching" : product === "interview_coaching" ? "/ai-tools/interview-coaching" : "/events/diagnosis";
  return `conversion_starts_raw AS MATERIALIZED (
      SELECT * FROM (${starts}) raw WHERE event_at >= (${start}) AND event_at <= NOW()
    ),
    conversion_completions AS MATERIALIZED (${completions}),
    conversion_starts AS MATERIALIZED (
      SELECT s.*, (s.event_at AT TIME ZONE 'Asia/Seoul')::date AS day, c.completed_at
      FROM conversion_starts_raw s LEFT JOIN conversion_completions c ON c.start_id = s.id AND c.completed_at >= s.event_at
      WHERE s.visitor_key IS NOT NULL
    ),
    conversion_visits AS (
      SELECT DISTINCT ON (day, visitor_key) id, visitor_key, user_id, anonymous_id, event_at, day,
        original_path AS path, referrer, channel, ip_address, user_agent
      FROM ${pagesCte} WHERE path = '${path}' AND visitor_key IS NOT NULL
      ORDER BY day, visitor_key, event_at, id
    ),
    conversion_people AS MATERIALIZED (
      SELECT DISTINCT ON (day, visitor_key) s.*,
        BOOL_OR(completed_at IS NOT NULL) OVER (PARTITION BY day, visitor_key) AS completed
      FROM conversion_starts s ORDER BY day, visitor_key, event_at, id
    )`;
}

export type AnalyticsFact = { day: string; metric: string; channel: string; dimension: string; value: string };

const dashboardBoundsSql = `
    bounds AS (
      SELECT LEAST($1::date - ($2::date - $1::date + 1), (NOW() AT TIME ZONE 'Asia/Seoul')::date - 6) AS first_day,
        GREATEST($2::date, (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS last_day
    )`;

const dashboardTrafficFactsSqlBody = `
      SELECT day, 'visitor' AS metric, channel, '' AS dimension, COUNT(*)::bigint AS value
      FROM analytics_daily_users GROUP BY day, channel
      UNION ALL
      SELECT p.day, 'screen', COALESCE(u.channel, p.channel), p.screen, COUNT(*)
      FROM analytics_pages p LEFT JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3, 4
      UNION ALL
      SELECT p.day, 'banner', COALESCE(u.channel, '식별 불가'), p.banner_key, COUNT(*)
      FROM analytics_products p LEFT JOIN analytics_daily_users u USING (day, visitor_key)
      WHERE p.banner_key IN ('job_detail_resume_a','job_detail_resume_b','job_detail_strength_a','job_detail_strength_b','job_detail_bookmark_click','job_detail_apply_click') GROUP BY 1, 3, 4
      UNION ALL
      SELECT p.day, 'banner_uv', '', p.banner_key, COUNT(DISTINCT p.visitor_key)
      FROM analytics_products p WHERE p.banner_key IN ('job_detail_resume_a','job_detail_resume_b','job_detail_strength_a','job_detail_strength_b','job_detail_bookmark_click','job_detail_apply_click') GROUP BY 1, 4
      UNION ALL
      SELECT j.day, 'job_visitor', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT j.day, 'job_activity', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key)
      JOIN analytics_followups f USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT j.day, 'job_returning', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key) WHERE j.returning GROUP BY 1, 3
      UNION ALL
      SELECT f.day, 'job_page_moves', u.channel, '', SUM(f.page_moves)::bigint FROM analytics_followups f
      JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT d.day, 'calendar', '', '', 0 FROM days d
      UNION ALL
      SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date, 'clock', '', '', 0
      UNION ALL
      SELECT d.day, 'unidentified_page', '', '', COALESCE(u.count, 0)
      FROM days d
      LEFT JOIN (
        SELECT day, COUNT(*)::bigint AS count
        FROM analytics_pages WHERE visitor_key IS NULL GROUP BY day
      ) u USING (day)`;

function dashboardConversionPageCte(path: string) {
  return `
    conversion_pages AS MATERIALIZED (
      SELECT p.id AS id, p.user_id, p.anonymous_id, ${cookieKey("p")} AS visitor_key,
        p.created_at AS event_at, (p.created_at AT TIME ZONE 'Asia/Seoul')::date AS day,
        split_part(p.path, '?', 1) AS path, p.path AS original_path,
        p.referrer, NULL::text AS channel, p.ip_address::text AS ip_address, p.user_agent
      FROM public.access_logs p, bounds
      WHERE p.event_name = 'page_view'
        AND p.created_at >= (bounds.first_day::timestamp AT TIME ZONE 'Asia/Seoul')
        AND p.created_at < ((bounds.last_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul')
        AND split_part(p.path, '?', 1) = '${path}'
        AND ${excludedEventCondition("p.user_id", "p.ip_address")}
    )`;
}

export function dashboardTrafficFactsSql() {
  return `WITH ${dashboardBoundsSql},
    ${trafficFactsCtes("(SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)", "(SELECT (last_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)")},
    days AS (SELECT d::date AS day FROM bounds, generate_series(first_day::timestamp, last_day::timestamp, interval '1 day') d),
    facts AS (${dashboardTrafficFactsSqlBody})
    SELECT to_char(f.day, 'YYYY-MM-DD') AS day, metric, channel, dimension, value::text
    FROM facts f, bounds WHERE f.day BETWEEN bounds.first_day AND bounds.last_day
    ORDER BY f.day, metric, channel, dimension`;
}

export function dashboardProductFactsSql(product: string) {
  const path = product === "resume_coaching"
    ? "/ai-tools/coaching"
    : product === "interview_coaching"
      ? "/ai-tools/interview-coaching"
      : "/events/diagnosis";

  return `WITH ${dashboardBoundsSql},
    ${dashboardConversionPageCte(path)},
    ${conversionCtes(product, "(SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)", "conversion_pages")},
    days AS (SELECT d::date AS day FROM bounds, generate_series(first_day::timestamp, last_day::timestamp, interval '1 day') d),
    eligible_users AS MATERIALIZED (
      SELECT id, (COALESCE(signup_completed_at, created_at) AT TIME ZONE 'Asia/Seoul')::date AS day
      FROM public.users u WHERE status = 'active' AND ${excludedUserCondition("u.id")}
    ),
    daily_signups AS (
      SELECT d.day, COUNT(u.id) AS count
      FROM days d LEFT JOIN eligible_users u ON u.day = d.day GROUP BY d.day
    ),
    signup_totals AS (
      SELECT day, count,
        SUM(count) OVER (ORDER BY day) + (SELECT COUNT(*) FROM eligible_users, bounds WHERE day < first_day) AS total
      FROM daily_signups
    ),
    facts AS (
      SELECT day, 'product_start' AS metric, '' AS channel, '' AS dimension, COUNT(*) AS value FROM conversion_people GROUP BY day
      UNION ALL
      SELECT (event_at AT TIME ZONE 'Asia/Seoul')::date, 'unidentified_start', '', '', COUNT(*)
      FROM conversion_starts_raw WHERE visitor_key IS NULL GROUP BY 1
      ${product === "diagnosis" ? `UNION ALL
      SELECT (COALESCE(r.completed_at, result.created_at) AT TIME ZONE 'Asia/Seoul')::date,
        'unmatched_completion', '', '', COUNT(*)
      FROM public.diagnosis_results result JOIN public.diagnosis_runs r ON r.id = result.diagnosis_run_id
      WHERE ${excludedEventCondition("result.user_id", "r.ip_address")}
        AND COALESCE(r.completed_at, result.created_at) >= (SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)
        AND COALESCE(r.completed_at, result.created_at) < (SELECT (last_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)
        AND NOT EXISTS (
          SELECT 1 FROM public.product_events e
          WHERE e.anonymous_id = r.anonymous_id AND e.event_type = 'diagnosis_start'
            AND e.properties->>'action' IN ('question_1_view', 'start_button_click')
            AND e.created_at <= COALESCE(r.completed_at, result.created_at)
            AND ${excludedEventCondition("e.user_id", "NULLIF(e.properties->>'ip_address', '')")}
        ) GROUP BY 1` : ""}
      UNION ALL
      SELECT day, 'product_complete', '', '', COUNT(*) FROM conversion_people WHERE completed GROUP BY day
      UNION ALL
      SELECT day, 'product_visit', '', '', COUNT(*) FROM conversion_visits GROUP BY day
      UNION ALL
      SELECT day, 'product_visit_start', '', '', COUNT(*) FROM conversion_visits v
      WHERE EXISTS (SELECT 1 FROM conversion_starts s WHERE s.day = v.day AND s.visitor_key = v.visitor_key AND s.event_at >= v.event_at) GROUP BY day
      UNION ALL
      SELECT day, 'signup', '', '', total::bigint FROM signup_totals
      UNION ALL
      SELECT day, 'new_signup', '', '', count FROM signup_totals
    )
    SELECT to_char(f.day, 'YYYY-MM-DD') AS day, metric, channel, dimension, value::text
    FROM facts f, bounds WHERE f.day BETWEEN bounds.first_day AND bounds.last_day
    ORDER BY f.day, metric, channel, dimension`;
}

export function dashboardFactsSql(product: string) {
  return `WITH bounds AS (
      SELECT LEAST($1::date - ($2::date - $1::date + 1), (NOW() AT TIME ZONE 'Asia/Seoul')::date - 6) AS first_day,
        GREATEST($2::date, (NOW() AT TIME ZONE 'Asia/Seoul')::date) AS last_day
    ),
    ${trafficFactsCtes("(SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)", "(SELECT (last_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)")},
    ${conversionCtes(product, "(SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)")},
    days AS (SELECT d::date AS day FROM bounds, generate_series(first_day::timestamp, last_day::timestamp, interval '1 day') d),
    eligible_users AS MATERIALIZED (
      SELECT id, (COALESCE(signup_completed_at, created_at) AT TIME ZONE 'Asia/Seoul')::date AS day
      FROM public.users u WHERE status = 'active' AND ${excludedUserCondition("u.id")}
    ),
    daily_signups AS (
      SELECT d.day, COUNT(u.id) AS count
      FROM days d LEFT JOIN eligible_users u ON u.day = d.day GROUP BY d.day
    ),
    signup_totals AS (
      SELECT day, count,
        SUM(count) OVER (ORDER BY day) + (SELECT COUNT(*) FROM eligible_users, bounds WHERE day < first_day) AS total
      FROM daily_signups
    ),
    facts AS (
      SELECT day, 'visitor' AS metric, channel, '' AS dimension, COUNT(*)::bigint AS value
      FROM analytics_daily_users GROUP BY day, channel
      UNION ALL
      SELECT p.day, 'screen', COALESCE(u.channel, p.channel), p.screen, COUNT(*)
      FROM analytics_pages p LEFT JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3, 4
      UNION ALL
      SELECT p.day, 'banner', COALESCE(u.channel, '식별 불가'), p.banner_key, COUNT(*)
      FROM analytics_products p LEFT JOIN analytics_daily_users u USING (day, visitor_key)
      WHERE p.banner_key IN (${bannerKeys.map(k => `'${k}'`).join(",")}) GROUP BY 1, 3, 4
      UNION ALL
      SELECT p.day, 'banner_uv', '', p.banner_key, COUNT(DISTINCT p.visitor_key)
      FROM analytics_products p WHERE p.banner_key IN (${bannerKeys.map(k => `'${k}'`).join(",")}) GROUP BY 1, 4
      UNION ALL
      SELECT j.day, 'job_visitor', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT j.day, 'job_activity', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key)
      JOIN analytics_followups f USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT j.day, 'job_returning', u.channel, '', COUNT(*) FROM analytics_job_users j
      JOIN analytics_daily_users u USING (day, visitor_key) WHERE j.returning GROUP BY 1, 3
      UNION ALL
      SELECT f.day, 'job_page_moves', u.channel, '', SUM(f.page_moves)::bigint FROM analytics_followups f
      JOIN analytics_daily_users u USING (day, visitor_key) GROUP BY 1, 3
      UNION ALL
      SELECT day, 'product_start', '', '', COUNT(*) FROM conversion_people GROUP BY day
      UNION ALL
      SELECT (event_at AT TIME ZONE 'Asia/Seoul')::date, 'unidentified_start', '', '', COUNT(*)
      FROM conversion_starts_raw WHERE visitor_key IS NULL GROUP BY 1
      ${product === "diagnosis" ? `UNION ALL
      SELECT (COALESCE(r.completed_at, result.created_at) AT TIME ZONE 'Asia/Seoul')::date,
        'unmatched_completion', '', '', COUNT(*)
      FROM public.diagnosis_results result JOIN public.diagnosis_runs r ON r.id = result.diagnosis_run_id
      WHERE ${excludedEventCondition("result.user_id", "r.ip_address")}
        AND COALESCE(r.completed_at, result.created_at) >= (SELECT first_day::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)
        AND COALESCE(r.completed_at, result.created_at) < (SELECT (last_day + 1)::timestamp AT TIME ZONE 'Asia/Seoul' FROM bounds)
        AND NOT EXISTS (
          SELECT 1 FROM public.product_events e
          WHERE e.anonymous_id = r.anonymous_id AND e.event_type = 'diagnosis_start'
            AND e.properties->>'action' IN ('question_1_view', 'start_button_click')
            AND e.created_at <= COALESCE(r.completed_at, result.created_at)
            AND ${excludedEventCondition("e.user_id", "NULLIF(e.properties->>'ip_address', '')")}
        ) GROUP BY 1` : ""}
      UNION ALL
      SELECT day, 'product_complete', '', '', COUNT(*) FROM conversion_people WHERE completed GROUP BY day
      UNION ALL
      SELECT day, 'product_visit', '', '', COUNT(*) FROM conversion_visits GROUP BY day
      UNION ALL
      SELECT day, 'product_visit_start', '', '', COUNT(*) FROM conversion_visits v
      WHERE EXISTS (SELECT 1 FROM conversion_starts s WHERE s.day = v.day AND s.visitor_key = v.visitor_key AND s.event_at >= v.event_at) GROUP BY day
      UNION ALL
      SELECT day, 'signup', '', '', total::bigint FROM signup_totals
      UNION ALL
      SELECT day, 'new_signup', '', '', count FROM signup_totals
      UNION ALL
      SELECT day, 'unidentified_page', '', '', COUNT(*) FROM analytics_pages WHERE visitor_key IS NULL GROUP BY day
      UNION ALL
      SELECT d.day, 'calendar', '', '', 0 FROM days d
      UNION ALL
      SELECT (NOW() AT TIME ZONE 'Asia/Seoul')::date, 'clock', '', '', 0
    )
    SELECT to_char(f.day, 'YYYY-MM-DD') AS day, metric, channel, dimension, value::text
    FROM facts f, bounds WHERE f.day BETWEEN bounds.first_day AND bounds.last_day ORDER BY f.day, metric, channel, dimension`;
}
