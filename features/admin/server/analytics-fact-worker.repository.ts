import { db, query } from "./db";
import {
  dashboardProductFactsForDaySql,
  dashboardTrafficFactsForDaySql,
  type AnalyticsFact,
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
        ORDER BY available_at, day, scope
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

async function saveFacts(item: QueueItem, rows: AnalyticsFact[]) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM public.analytics_dashboard_facts WHERE scope = $1 AND day = $2::date`,
      [item.scope, item.day],
    );

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
    }

    await client.query("COMMIT");
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
      const result = await query<AnalyticsFact>(factsSql(item.scope), [item.day]);
      const rows = factsForScope(item.scope, result.rows);
      await saveFacts(item, rows);
      processed.push({ scope: item.scope, day: item.day, rowCount: rows.length });
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
