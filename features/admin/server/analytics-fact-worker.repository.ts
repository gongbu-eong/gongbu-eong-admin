import { db, query } from "./db";
import type { PoolClient } from "pg";
import {
  dashboardProductFactDetailsForDaySql,
  dashboardProductFactsForDaySql,
  dashboardTrafficFactDetailsForDaySql,
  dashboardTrafficFactsForDaySql,
  type AnalyticsFact,
  type AnalyticsFactDetail,
} from "./analytics-facts";
import { excludedUserCondition } from "./analytics-exclusion.repository";

const scopes = [
  "traffic",
  "accounts",
  "diagnosis",
  "resume_coaching",
  "interview_coaching",
] as const;

type AnalyticsFactScope = (typeof scopes)[number];

type QueueItem = {
  scope: AnalyticsFactScope;
  day: string;
  revision: number;
  attempts: number;
};

const productScopes = new Set<AnalyticsFactScope>([
  "diagnosis",
  "resume_coaching",
  "interview_coaching",
]);

function accountFactsForDaySql() {
  return `
    WITH eligible_users AS MATERIALIZED (
      SELECT id, (COALESCE(signup_completed_at, created_at) AT TIME ZONE 'Asia/Seoul')::date AS day
      FROM public.users u
      WHERE ${excludedUserCondition("u.id")}
    )
    SELECT $1::date::text AS day, 'signup'::text AS metric, ''::text AS channel,
      ''::text AS dimension, COUNT(*)::text AS value
    FROM eligible_users
    WHERE day <= $1::date
    UNION ALL
    SELECT $1::date::text, 'new_signup', '', '', COUNT(*)::text
    FROM eligible_users
    WHERE day = $1::date`;
}

function factsSql(scope: AnalyticsFactScope) {
  if (scope === "traffic") return dashboardTrafficFactsForDaySql();
  if (scope === "accounts") return accountFactsForDaySql();
  return dashboardProductFactsForDaySql(scope);
}

function factDetailsSql(scope: AnalyticsFactScope) {
  if (scope === "traffic") return dashboardTrafficFactDetailsForDaySql();
  if (productScopes.has(scope)) return dashboardProductFactDetailsForDaySql(scope);
  return null;
}

function factsForScope(scope: AnalyticsFactScope, rows: AnalyticsFact[]) {
  if (scope === "accounts") {
    return rows.filter((row) => row.metric === "signup" || row.metric === "new_signup");
  }

  if (scope === "traffic") {
    return rows.filter(
      (row) =>
        !row.metric.startsWith("product_") &&
        row.metric !== "signup" &&
        row.metric !== "new_signup" &&
        row.metric !== "unidentified_start" &&
        row.metric !== "unmatched_completion",
    );
  }

  return rows.filter(
    (row) =>
      row.metric.startsWith("product_") ||
      row.metric === "unidentified_start" ||
      row.metric === "unmatched_completion",
  );
}

async function claimNext(workerId: string): Promise<QueueItem | null> {
  const result = await query<QueueItem>(
    `
      WITH candidate AS (
        SELECT scope, day
        FROM public.analytics_fact_refresh_queue
        WHERE available_at <= NOW()
          AND (locked_at IS NULL OR locked_at < NOW() - interval '10 minutes')
        ORDER BY
          (day = (NOW() AT TIME ZONE 'Asia/Seoul')::date) DESC,
          CASE scope WHEN 'traffic' THEN 0 WHEN 'accounts' THEN 1 ELSE 2 END,
          day DESC,
          available_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      UPDATE public.analytics_fact_refresh_queue queue
      SET locked_at = NOW(),
          locked_by = $1,
          attempts = queue.attempts + 1,
          updated_at = NOW()
      FROM candidate
      WHERE queue.scope = candidate.scope
        AND queue.day = candidate.day
      RETURNING queue.scope, queue.day::text, queue.revision, queue.attempts
    `,
    [workerId],
  );

  return result.rows[0] || null;
}

async function saveFacts(
  client: PoolClient,
  item: QueueItem,
  rows: AnalyticsFact[],
  details: AnalyticsFactDetail[],
  detailsSchemaReady: boolean,
) {
  const hasPendingJobSession =
    item.scope === "traffic" &&
    rows.some((row) => row.metric === "job_pending" && Number(row.value) > 0);

  await client.query(
      `DELETE FROM public.analytics_dashboard_facts WHERE scope = $1 AND day = $2::date`,
      [item.scope, item.day],
  );

  if (detailsSchemaReady && item.scope !== "accounts") {
    await client.query(
      `DELETE FROM public.analytics_dashboard_fact_details WHERE scope = $1 AND day = $2::date`,
      [item.scope, item.day],
    );
  }

  if (rows.length) {
    await client.query(
        `
          INSERT INTO public.analytics_dashboard_facts (
            scope, day, metric, channel, dimension, value, refreshed_at
          )
          SELECT
            $1,
            item.day::date,
            item.metric,
            item.channel,
            item.dimension,
            item.value::bigint,
            NOW()
          FROM jsonb_to_recordset($2::jsonb) AS item(
            day text,
            metric text,
            channel text,
            dimension text,
            value text
          )
        `,
        [item.scope, JSON.stringify(rows)],
    );
  }

  if (detailsSchemaReady && details.length) {
    await client.query(
      `
        INSERT INTO public.analytics_dashboard_fact_details (
          scope, day, metric, channel, dimension, entity_key, event_at,
          user_id, anonymous_id, ip_address, user_agent, path, detail, refreshed_at
        )
        SELECT
          $1,
          item.day::date,
          item.metric,
          COALESCE(item.channel, ''),
          COALESCE(item.dimension, ''),
          item.entity_key,
          item.event_at::timestamptz,
          NULLIF(item.user_id, '')::uuid,
          NULLIF(item.anonymous_id, '')::uuid,
          item.ip_address,
          item.user_agent,
          item.path,
          item.detail,
          NOW()
        FROM jsonb_to_recordset($2::jsonb) AS item(
          day text,
          metric text,
          channel text,
          dimension text,
          entity_key text,
          event_at text,
          user_id text,
          anonymous_id text,
          ip_address text,
          user_agent text,
          path text,
          detail text
        )
      `,
      [item.scope, JSON.stringify(details)],
    );
  }

  if (detailsSchemaReady && item.scope !== "accounts") {
    await client.query(
      `
        INSERT INTO public.analytics_dashboard_fact_detail_status (
          scope, day, row_count, refreshed_at
        )
        VALUES ($1, $2::date, $3, NOW())
        ON CONFLICT (scope, day) DO UPDATE
        SET row_count = EXCLUDED.row_count,
            refreshed_at = EXCLUDED.refreshed_at
      `,
      [item.scope, item.day, details.length],
    );
  }

    // Do not consume work that arrived while this day's SQL was running.
  const deleted = await client.query(
      `
        DELETE FROM public.analytics_fact_refresh_queue
        WHERE scope = $1 AND day = $2::date AND revision = $3
      `,
      [item.scope, item.day, item.revision],
    );

  if ((deleted.rowCount || 0) === 0) {
    await client.query(
        `
          UPDATE public.analytics_fact_refresh_queue
          SET locked_at = NULL, locked_by = NULL, updated_at = NOW()
          WHERE scope = $1 AND day = $2::date
        `,
        [item.scope, item.day],
    );
  } else if (hasPendingJobSession) {
      // No event is emitted when a quiet session reaches its 30-minute
      // timeout. Keep one delayed refresh so pending visitors can become exits.
    await client.query(
        `
          INSERT INTO public.analytics_fact_refresh_queue (
            scope, day, revision, available_at, updated_at
          )
          VALUES ($1, $2::date, $3 + 1, NOW() + interval '30 minutes', NOW())
          ON CONFLICT (scope, day) DO UPDATE
          SET revision = public.analytics_fact_refresh_queue.revision + 1,
              available_at = LEAST(
                public.analytics_fact_refresh_queue.available_at,
                NOW() + interval '30 minutes'
              ),
              locked_at = NULL,
              locked_by = NULL,
              updated_at = NOW()
        `,
        [item.scope, item.day, item.revision],
    );
  }
}

async function refreshItem(item: QueueItem) {
  const client = await db.connect();

  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ");
    const factResult = await client.query<AnalyticsFact>(factsSql(item.scope), [item.day]);
    const relation = await client.query<{ ready: boolean }>(
      `SELECT to_regclass('public.analytics_dashboard_fact_details') IS NOT NULL
          AND to_regclass('public.analytics_dashboard_fact_detail_status') IS NOT NULL AS ready`,
    );
    const detailsSchemaReady = relation.rows[0]?.ready === true;
    const detailSql = detailsSchemaReady ? factDetailsSql(item.scope) : null;
    const detailResult = detailSql
      ? await client.query<AnalyticsFactDetail>(detailSql, [item.day])
      : { rows: [] as AnalyticsFactDetail[] };
    const rows = factsForScope(item.scope, factResult.rows);

    await saveFacts(client, item, rows, detailResult.rows, detailsSchemaReady);
    await client.query("COMMIT");
    return rows.length;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function releaseFailedItem(item: QueueItem, error: unknown) {
  const message = error instanceof Error ? error.message.slice(0, 1_000) : "Unknown refresh failure";
  const retrySeconds = Math.min(300, 5 * Math.max(1, item.attempts));

  await query(
    `
      UPDATE public.analytics_fact_refresh_queue
      SET locked_at = NULL,
          locked_by = NULL,
          available_at = NOW() + ($4::text || ' seconds')::interval,
          last_error = $3,
          updated_at = NOW()
      WHERE scope = $1 AND day = $2::date
    `,
    [item.scope, item.day, message, String(retrySeconds)],
  );
}

export async function processAnalyticsFactQueue({
  limit = 3,
  workerId = `admin-${process.pid}`,
}: {
  limit?: number;
  workerId?: string;
} = {}) {
  const processed: Array<{ scope: AnalyticsFactScope; day: string; rowCount: number }> = [];
  const cappedLimit = Math.max(1, Math.min(20, Math.floor(limit)));

  for (let index = 0; index < cappedLimit; index += 1) {
    const item = await claimNext(workerId);
    if (!item) break;

    try {
      const rowCount = await refreshItem(item);
      processed.push({ scope: item.scope, day: item.day, rowCount });
    } catch (error) {
      await releaseFailedItem(item, error);
      throw error;
    }
  }

  return processed;
}

export function isAnalyticsFactScope(value: string): value is AnalyticsFactScope {
  return scopes.includes(value as AnalyticsFactScope);
}

export { scopes as analyticsFactScopes, productScopes };
