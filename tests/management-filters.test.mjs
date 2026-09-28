import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PGlite } from "@electric-sql/pglite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const database = new PGlite();
const query = (sql, values) => database.query(sql, values);
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename);
  const loaded = { exports: {} };
  const dependency = id => {
    if (id === "@/features/admin/server/db") return { query, db: { query } };
    if (["react", "react-dom", "react/jsx-runtime"].includes(id)) return require(id);
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === "next/link") return { __esModule: true, default: props => React.createElement("a", props) };
    const base = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(filename), id);
    const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (!target) throw new Error(`Unexpected import: ${id}`);
    return load(target);
  };
  const code = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: dependency, Date, console, URLSearchParams }, { filename });
  cache.set(filename, loaded.exports);
  return loaded.exports;
}
const dates = load(resolve(root, "features/admin/management-date.ts"));
const sqlDates = load(resolve(root, "features/admin/server/management-date-filter.ts"));
const jobs = load(resolve(root, "features/admin/server/jobs-management.repository.ts"));
const community = load(resolve(root, "features/admin/server/community-management.repository.ts"));
const range = { period: "custom", startDate: "2026-09-28", endDate: "2026-09-28" };
const uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

before(async () => {
  await database.exec(`
    CREATE TABLE public_institutions(id uuid PRIMARY KEY, name text, institution_type text, region text, homepage_url text, alio_institution_id text, updated_at timestamptz);
    CREATE TABLE job_postings(id uuid PRIMARY KEY, institution_id uuid, title text, source text, ncs_category text, work_region text, employment_type text,
      announcement_at timestamptz, application_start_at timestamptz, application_end_at timestamptz, created_at timestamptz, updated_at timestamptz DEFAULT NOW(),
      is_active boolean DEFAULT true, is_featured boolean DEFAULT false, view_count integer DEFAULT 0);
    CREATE TABLE user_job_bookmarks(job_posting_id uuid);
    CREATE TABLE job_categories(id uuid PRIMARY KEY, name text, source_code text, sort_order integer, is_active boolean, updated_at timestamptz);
    CREATE TABLE job_posting_categories(job_posting_id uuid, job_category_id uuid);
    CREATE TABLE personality_job_category_mappings(job_category_id uuid, personality_type_id uuid);
    CREATE TABLE job_posting_sync_runs(id uuid PRIMARY KEY, source text, status text, started_at timestamptz, completed_at timestamptz, heartbeat_at timestamptz,
      fetched_count integer DEFAULT 0, inserted_count integer DEFAULT 0, updated_count integer DEFAULT 0, deactivated_count integer DEFAULT 0, error_message text);
    CREATE TABLE users(id uuid PRIMARY KEY, community_nickname text, nickname text, display_name text, email text);
    CREATE TABLE community_posts(id uuid PRIMARY KEY, user_id uuid, title text, content text, category text, status text DEFAULT 'active',
      view_count integer DEFAULT 0, created_at timestamptz, updated_at timestamptz, deleted_at timestamptz);
    CREATE TABLE community_comments(id uuid PRIMARY KEY, user_id uuid, post_id uuid, parent_comment_id uuid, content text, status text DEFAULT 'active', created_at timestamptz);
    CREATE TABLE community_reports(id uuid, target_type text, target_id uuid, status text);
    CREATE TABLE community_post_reactions(post_id uuid, reaction_type text);
    CREATE TABLE community_comment_reactions(comment_id uuid, reaction_type text);
    CREATE TABLE community_post_attachments(post_id uuid);
  `);
  await database.query("INSERT INTO users(id,nickname,email) VALUES($1,'작성자','user@example.test')", [uuid(100)]);
  const times = ['2026-09-27T14:59:59Z','2026-09-27T15:00:00Z','2026-09-28T14:59:59.999Z','2026-09-28T15:00:00Z'];
  for (let i = 0; i < times.length; i++) {
    const id = uuid(i + 1);
    await database.query("INSERT INTO public_institutions(id,name,updated_at) VALUES($1,$2,$3)", [id, `기관 ${i}`, times[i]]);
    await database.query(`INSERT INTO job_postings(id,institution_id,title,source,announcement_at,application_start_at,application_end_at,created_at)
      VALUES($1,$1,$2,'manual',$3,$3::timestamptz + interval '1 day',$3::timestamptz + interval '2 day',$3::timestamptz + interval '3 day')`, [id, `공고 ${i}`, times[i]]);
    await database.query("INSERT INTO job_categories VALUES($1,$2,$3,$4,$5,$6)", [id, `직무 ${i}`, `code-${i}`, i, i === 1, times[i]]);
    await database.query("INSERT INTO job_posting_sync_runs(id,source,status,started_at,heartbeat_at) VALUES($1,'alio',$2,$3,$3)", [id, i === 1 ? "failed" : "succeeded", times[i]]);
    await database.query("INSERT INTO community_posts(id,user_id,title,content,category,created_at,updated_at) VALUES($1,$2,$3,'본문','자유·잡담',$4,$4::timestamptz + interval '1 day')", [id, uuid(100), `제목 ${i}`, times[i]]);
    await database.query("INSERT INTO community_comments(id,user_id,post_id,content,created_at) VALUES($1,$2,$1,'댓글',$3)", [id, uuid(100), times[i]]);
  }
});
after(async () => { await database.close(); });

test("presets use inclusive Seoul days, invalid ranges fall back to all, and date fields are allowlisted", () => {
  const now = new Date("2026-09-27T15:01:00Z");
  assert.equal(dates.resolveManagementDate("members", { period: "today" }, now).startDate, "2026-09-28");
  assert.equal(dates.resolveManagementDate("members", { period: "7d" }, now).startDate, "2026-09-22");
  assert.equal(dates.resolveManagementDate("members", { period: "30d" }, now).startDate, "2026-08-30");
  for (const bad of ["2026-02-30", "2026-9-01", "x", undefined]) {
    assert.equal(dates.resolveManagementDate("jobs", { startDate: bad, endDate: "2026-09-28" }).period, "all");
  }
  assert.equal(dates.resolveManagementDate("jobs", { ...range, dateField: "toString" }).dateField, "announced");
  assert.equal(dates.resolveManagementDate("jobs", { startDate: "2026-09-29", endDate: "2026-09-01" }).startDate, "2026-09-01");
  assert.equal(dates.resolveManagementDate("jobs", { ...range, period: "all" }).startDate, "");
  const where = [], values = ['existing'];
  sqlDates.appendManagementDate("jobs", { ...range, dateField: "bad; DROP TABLE users" }, where, values);
  assert.match(where.join(" AND "), /postings.announcement_at >= \(\$2/);
  assert.equal(values.length, 3);
});

test("all eight list headers render date criteria, existing filters, reset and navigation", () => {
  const { ManagementFilterBar } = load(resolve(root, "features/admin/components/management/ManagementFilterBar.tsx"));
  for (const screen of Object.keys(dates.MANAGEMENT_DATES)) {
    const html = renderToStaticMarkup(React.createElement(ManagementFilterBar, { screen, filters: { ...range } }));
    assert.match(html, /name="dateField"/);
    assert.match(html, /name="startDate" value="2026-09-28"/);
    assert.match(html, /name="page" value="1"/);
    assert.match(html, /aria-current="page"/);
    assert.match(html, /초기화/);
    assert.match(html, /KST/);
  }
});

test("job date basis filters the actual timestamp and total before pagination", async () => {
  const announced = await jobs.getManagedJobs(range);
  assert.equal(announced.total, 2);
  assert.deepEqual(announced.jobs.map(j => j.id).sort(), [uuid(2), uuid(3)]);
  assert.equal((await jobs.getManagedJobs({ ...range, dateField: "start" })).total, 1);
  assert.equal((await jobs.getManagedJobs({ ...range, dateField: "end" })).total, 0);
  assert.equal((await jobs.getManagedJobs({ ...range, dateField: "created" })).total, 0);
  assert.equal((await jobs.getManagedJobs({ ...range, source: "alio" })).total, 0);
  assert.equal((await jobs.getManagedJobs({ ...range, keyword: "기관 1" })).total, 1);
  assert.equal((await jobs.getManagedJobs({ period: "all" })).total, 4);
  const secondPage = await jobs.getManagedJobs({ ...range, page: 2 });
  assert.equal(secondPage.total, 2);
  assert.equal(secondPage.jobs.length, 0);
});

test("reference and sync filters operate before aggregation and the 100-row limit", async () => {
  assert.equal((await jobs.listInstitutions(range)).length, 2);
  assert.equal((await jobs.listInstitutions({ ...range, keyword: "기관 1" })).length, 1);
  assert.equal((await jobs.listInstitutions()).length, 4);
  assert.equal((await jobs.listJobCategories(range)).length, 2);
  assert.equal((await jobs.listJobCategories({ ...range, status: "active" })).length, 1);
  assert.equal((await jobs.listJobCategories({ ...range, keyword: "code-2" })).length, 1);
  assert.equal(await jobs.getNextJobCategorySortOrder(), 4);
  assert.equal((await jobs.listJobSyncRuns(range)).length, 2);
  assert.equal((await jobs.listJobSyncRuns({ ...range, status: "failed" })).length, 1);
});

test("post and comment date filters match totals, keywords and status at Korean midnight", async () => {
  const posts = await community.getManagedCommunityPosts(range);
  assert.equal(posts.total, 2);
  assert.deepEqual(posts.posts.map(p => p.id).sort(), [uuid(2), uuid(3)]);
  assert.equal((await community.getManagedCommunityPosts({ ...range, dateField: "updated" })).total, 1);
  assert.equal((await community.getManagedCommunityPosts({ ...range, keyword: "제목 1" })).total, 1);
  assert.equal((await community.getManagedCommunityPosts({ ...range, status: "deleted" })).total, 0);
  const comments = await community.getManagedComments({ ...range, limit: 1 });
  assert.equal(comments.total, 2);
  assert.equal(comments.totalPages, 2);
  assert.equal((await community.getManagedComments({ ...range, limit: 1, page: 2 })).items.length, 1);
  assert.equal((await community.getManagedComments({ ...range, keyword: "제목 1" })).total, 1);
  assert.equal((await community.getManagedComments()).total, 4);
});
