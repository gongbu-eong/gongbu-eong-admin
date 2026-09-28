import { resolveManagementDate, type ManagementDateInput, type ManagementScreen } from "@/features/admin/management-date";

// Column expressions are server-owned; query parameters never become SQL identifiers.
const columns: Record<ManagementScreen, Record<string, string>> = {
  members: { joined: "COALESCE(users.signup_completed_at, users.created_at)", login: "users.last_login_at" },
  jobs: { announced: "postings.announcement_at", start: "postings.application_start_at", end: "postings.application_end_at", created: "postings.created_at" },
  institutions: { updated: "institutions.updated_at" },
  categories: { updated: "categories.updated_at" },
  sync: { started: "runs.started_at" },
  posts: { created: "posts.created_at", updated: "posts.updated_at" },
  comments: { created: "comments.created_at" },
  reports: { created: "reports.created_at", reviewed: "reports.reviewed_at" },
};

export function appendManagementDate(screen: ManagementScreen, input: ManagementDateInput, where: string[], values: unknown[]) {
  const range = resolveManagementDate(screen, input);
  if (range.period !== "all") {
    const column = columns[screen][range.dateField];
    values.push(range.startDate, range.endDate);
    // Inclusive Korean calendar days, with an exclusive next-midnight boundary.
    where.push(`${column} >= ($${values.length - 1}::date::timestamp AT TIME ZONE 'Asia/Seoul')`);
    where.push(`${column} < (($${values.length}::date + 1)::timestamp AT TIME ZONE 'Asia/Seoul')`);
  }
  return range;
}
