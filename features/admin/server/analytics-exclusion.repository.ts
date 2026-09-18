import { query } from "@/features/admin/server/db";

let schemaPromise: Promise<void> | null = null;

export function ensureAnalyticsExclusionSchema() {
  if (!schemaPromise) {
    schemaPromise = query(`
      CREATE TABLE IF NOT EXISTS public.analytics_excluded_ips (
        ip_address INET PRIMARY KEY,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  return schemaPromise;
}

export function excludedIpCondition(ipExpression: string) {
  return `NOT EXISTS (
    SELECT 1
    FROM public.analytics_excluded_ips excluded_ips
    WHERE excluded_ips.ip_address::text = NULLIF((${ipExpression})::text, '')
  )`;
}

function excludedIpMatchCondition(ipExpression: string) {
  return `EXISTS (
    SELECT 1
    FROM public.analytics_excluded_ips excluded_ips
    WHERE excluded_ips.ip_address::text = NULLIF((${ipExpression})::text, '')
  )`;
}

export function excludedUserCondition(userIdExpression: string) {
  return `NOT EXISTS (
    SELECT 1
    FROM public.users excluded_users
    WHERE excluded_users.id = ${userIdExpression}
      AND (
        excluded_users.email::text ILIKE '%@example.local'
        OR EXISTS (
          SELECT 1
          FROM public.auth_login_events excluded_logins
          WHERE excluded_logins.user_id = excluded_users.id
            AND ${excludedIpMatchCondition("excluded_logins.ip_address")}
        )
      )
  )`;
}

export function excludedEventCondition(userIdExpression: string, ipExpression: string) {
  return `${excludedIpCondition(ipExpression)} AND ${excludedUserCondition(userIdExpression)}`;
}
