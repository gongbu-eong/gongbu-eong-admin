import test, { before, beforeEach, after } from "node:test";
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
const author = "11111111-1111-4111-8111-111111111111";
const reporter = "22222222-2222-4222-8222-222222222222";
const post = "33333333-3333-4333-8333-333333333333";
const comment = "44444444-4444-4444-8444-444444444444";
const reportId = "55555555-5555-4555-8555-555555555555";
const admin = { adminUserId: "66666666-6666-4666-8666-666666666666", name: "운영 담당자" };
const cache = new Map();
const db = { query: (sql, values) => database.query(sql, values), connect: async () => ({ query: (sql, values) => database.query(sql, values), release() {} }) };

function load(filename, overrides = {}) {
  if (cache.has(filename) && !Object.keys(overrides).length) return cache.get(filename);
  const loaded = { exports: {} };
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const dependency = (id) => {
    if (Object.hasOwn(overrides, id)) return overrides[id];
    if (id === "@/features/admin/server/db") return { db, query: db.query };
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === "react" || id === "react/jsx-runtime") return require(id);
    if (id === "next/navigation") return { useRouter: () => ({ refresh() {} }) };
    if (id === "next/link") return { __esModule: true, default: ({ children, ...props }) => React.createElement("a", props, children) };
    if (id === "next/server") return { NextResponse: { json: (body, options) => Response.json(body, options) } };
    const base = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(filename), id);
    const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (!target) throw new Error(`Unexpected import: ${id}`);
    return load(target);
  };
  vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require: dependency,
    console, Date, Error, URL, URLSearchParams, process: { env: { NODE_ENV: "production" } } }, { filename });
  if (!Object.keys(overrides).length) cache.set(filename, loaded.exports);
  return loaded.exports;
}

let repository;
before(async () => {
  await database.exec(`
    CREATE TABLE users(id uuid PRIMARY KEY, community_nickname text, nickname text, display_name text, email text);
    CREATE TABLE community_posts(id uuid PRIMARY KEY, user_id uuid, title text, content text, status text DEFAULT 'active', deleted_at timestamptz, updated_at timestamptz DEFAULT NOW());
    CREATE TABLE community_comments(id uuid PRIMARY KEY, user_id uuid, post_id uuid, parent_comment_id uuid, content text, status text DEFAULT 'active', deleted_at timestamptz, updated_at timestamptz DEFAULT NOW());
    CREATE TABLE community_reports(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, target_type text, target_id uuid,
      reason text, reason_code text, reason_detail text, status text DEFAULT 'pending', target_snapshot jsonb, reviewed_by uuid,
      review_note text, reviewed_at timestamptz, created_at timestamptz DEFAULT NOW(), updated_at timestamptz DEFAULT NOW());
  `);
  const migration = readFileSync(resolve(root, "db/20260928_community_report_moderation.sql"), "utf8");
  await database.exec(migration);
  await database.exec(migration);
  repository = load(resolve(root, "features/admin/server/community-management.repository.ts"));
});
beforeEach(async () => {
  await database.exec("TRUNCATE community_reports, community_comments, community_posts, users");
  await database.query("INSERT INTO users VALUES ($1,'글쓴이별명','작성자실명','작성자표시명','author@example.test'),($2,'신고자별명','신고자실명','신고자표시명','reporter@example.test')", [author, reporter]);
  await database.query("INSERT INTO community_posts(id,user_id,title,content) VALUES ($1,$2,'신고된 게시글 제목','수정된 현재 원문')", [post, author]);
  await database.query("INSERT INTO community_comments(id,user_id,post_id,content,parent_comment_id) VALUES ($1,$2,$3,'신고된 답글 원문',$1)", [comment, author, post]);
  await database.query(`INSERT INTO community_reports(id,user_id,target_type,target_id,reason,reason_code,reason_detail,target_snapshot)
    VALUES ($1,$2,'post',$3,'기타','기타','100% 구체적인 신고 사유',$4::jsonb)`,
  [reportId, reporter, post, JSON.stringify({ user_id: author, title: "이전 제목", content: "신고 당시 증거 원문" })]);
});
after(async () => { await database.close(); });

async function record() {
  return (await database.query("SELECT * FROM community_reports WHERE id=$1", [reportId])).rows[0];
}
async function processReport(decision, extra = {}) {
  const current = (await repository.getManagedReports()).items.find((item) => item.id === reportId);
  return repository.processCommunityReport(reportId, {
    decision, reviewNote: "확인한 처리 사유", expectedStatus: current.status,
    expectedUpdatedAt: current.updatedAt, expectedTargetStatus: current.targetStatus, ...extra,
  }, admin);
}
async function targetStatus() {
  return (await database.query("SELECT status FROM community_posts WHERE id=$1", [post])).rows[0]?.status;
}

test("search covers original/current content, reasons and each independent author/reporter identity", async () => {
  for (const [searchBy, keyword] of [["content", "수정된"], ["content", "증거 원문"], ["reason", "구체적인"],
    ["reason", "100%"], ["author", "글쓴이별명"], ["author", "작성자실명"], ["author", "author@example"],
    ["reporter", "신고자별명"], ["reporter", "신고자실명"], ["reporter", "reporter@example"], ["all", "이전 제목"]]) {
    const result = await repository.getManagedReports({ searchBy, keyword, status: "open", reason: "기타" });
    assert.equal(result.total, 1, `${searchBy}: ${keyword}`);
    assert.equal(result.items.length, 1);
    assert.equal(result.items[0].authorName, "글쓴이별명");
    assert.equal(result.items[0].reporterName, "신고자별명");
  }
  assert.equal((await repository.getManagedReports({ searchBy: "author", keyword: "신고자" })).total, 0);
  assert.equal((await repository.getManagedReports({ keyword: "%' OR 1=1 --" })).total, 0);
  assert.equal((await repository.getManagedReports({ keyword: "_" })).total, 0);
  assert.equal((await repository.getManagedReports({ reason: "개인정보 노출" })).total, 0);
  assert.equal((await repository.getManagedReports({ searchBy: "toString", keyword: "증거" })).total, 1);
});

test("comment reports identify the actual commenter and link to the parent post; missing targets retain evidence", async () => {
  await database.query("UPDATE community_reports SET target_type='comment',target_id=$1,target_snapshot=$2::jsonb", [comment, JSON.stringify({ user_id: author, post_id: post, parent_comment_id: comment, post_title: "원 게시글 제목", content: "댓글 증거" })]);
  let item = (await repository.getManagedReports({ targetType: "reply", searchBy: "author", keyword: "글쓴이" })).items[0];
  assert.equal(item.authorId, author);
  assert.equal(item.postId, post);
  assert.equal(item.isReply, true);
  await database.query("DELETE FROM community_comments WHERE id=$1", [comment]);
  item = (await repository.getManagedReports({ targetType: "reply", keyword: "댓글 증거" })).items[0];
  assert.equal(item.targetStatus, "missing");
  assert.equal(item.authorName, "글쓴이별명");
  assert.equal(item.postId, post);
  await database.query("UPDATE community_reports SET target_snapshot='{}'::jsonb");
  assert.equal((await repository.getManagedReports()).total, 1);
});

test("counts and pagination use the same filters and related-report counts do not multiply rows", async () => {
  await database.query(`INSERT INTO community_reports(user_id,target_type,target_id,reason,status)
    SELECT $1,'post',$2,'기타',CASE WHEN i%2=0 THEN 'reviewing' ELSE 'pending' END FROM generate_series(1,25) i`, [reporter, post]);
  const result = await repository.getManagedReports({ keyword: "글쓴이", status: "open", page: 2, limit: 20 });
  assert.equal(result.total, 26);
  assert.equal(result.items.length, 6);
  assert.equal(result.totalPages, 2);
  assert.equal(result.items[0].relatedCount, 26);
  const page = load(resolve(root, "features/admin/components/management/ReportsQueue.tsx"));
  const html = renderToStaticMarkup(React.createElement(page.ReportsQueue, { data: result,
    filters: { status: "open", targetType: "post", keyword: "글쓴이", searchBy: "author", reason: "기타", targetId: post } }));
  for (const value of ["대상 작성자", "신고자", "신고 당시 원문", "현재 원문", "상세·처리", "searchBy=author", `targetId=${post}`, "처리 사유"]) assert.ok(html.includes(value), value);
  assert.ok(!html.includes("상태만 변경"));
});

test("review starts without hiding content, and hide atomically closes the report with an admin audit", async () => {
  assert.equal(await processReport("review", { reviewNote: "" }), true);
  assert.equal((await record()).status, "reviewing");
  assert.equal((await record()).reviewed_at, null);
  assert.equal(await targetStatus(), "active");
  await processReport("hide");
  const result = await record();
  assert.equal(result.status, "resolved");
  assert.ok(result.reviewed_at);
  assert.equal(await targetStatus(), "deleted");
  assert.equal(result.moderation_history.length, 2);
  assert.equal(result.moderation_history[1].adminUserId, admin.adminUserId);
  assert.equal(result.moderation_history[1].fromTargetStatus, "active");
  assert.equal(result.moderation_history[1].toTargetStatus, "deleted");
  assert.equal(result.target_snapshot.content, "신고 당시 증거 원문");
});

test("no violation leaves visibility unchanged; reopening and restoring are explicit and audited", async () => {
  await processReport("hide");
  await assert.rejects(processReport("restore"), /현재 상태/);
  await processReport("reopen");
  assert.equal((await record()).reviewed_at, null);
  assert.equal(await targetStatus(), "deleted");
  await processReport("reject");
  assert.equal((await record()).status, "rejected");
  assert.equal(await targetStatus(), "deleted");
  await processReport("reopen");
  await processReport("restore");
  assert.equal(await targetStatus(), "active");
  assert.equal((await record()).status, "rejected");
  assert.equal((await record()).moderation_history.length, 5);
});

test("comment moderation changes only that comment, not its parent post", async () => {
  await database.query("UPDATE community_reports SET target_type='comment', target_id=$1", [comment]);
  await processReport("hide");
  assert.equal((await database.query("SELECT status FROM community_comments WHERE id=$1", [comment])).rows[0].status, "deleted");
  assert.equal(await targetStatus(), "active");
});

test("reopening a legacy report preserves its previous review note without inventing an actor", async () => {
  await database.query("UPDATE community_reports SET status='rejected', review_note='이전 판단 근거', reviewed_at='2026-09-01T00:00:00Z' WHERE id=$1", [reportId]);
  await processReport("reopen");
  const result = await record();
  assert.equal(result.moderation_history[0].previousReviewNote, "이전 판단 근거");
  assert.equal(result.moderation_history[0].previousReviewedAt, "2026-09-01T00:00:00.000Z");
  assert.equal(result.moderation_history[0].adminUserId, admin.adminUserId);
});

test("invalid, missing-target and stale actions never report a successful moderation", async () => {
  for (const decision of ["nonsense", "restore", "close", "reopen"]) await assert.rejects(processReport(decision));
  await assert.rejects(processReport("hide", { reviewNote: "   " }), /1~1,000/);
  await assert.rejects(processReport("review", { reviewNote: "x".repeat(1001) }), /1~1,000/);
  await assert.rejects(processReport("hide", { expectedStatus: "reviewing" }), { name: "ReportConflictError" });
  await assert.rejects(processReport("hide", { expectedUpdatedAt: "2020-01-01T00:00:00.000Z" }), { name: "ReportConflictError" });
  await assert.rejects(processReport("hide", { expectedTargetStatus: "deleted" }), { name: "ReportConflictError" });
  assert.equal(await targetStatus(), "active");
  assert.equal((await record()).moderation_history.length, 0);
  await database.query("DELETE FROM community_posts WHERE id=$1", [post]);
  await assert.rejects(processReport("hide"));
  await processReport("close");
  assert.equal((await record()).status, "resolved");
  assert.equal((await record()).moderation_history[0].toTargetStatus, "missing");
});

test("a failure to persist the audit rolls back content visibility and report status", async () => {
  await database.exec("ALTER TABLE community_reports ADD CONSTRAINT fail_test CHECK (jsonb_array_length(moderation_history)=0)");
  try {
    await assert.rejects(processReport("hide"), { code: "23514" });
    assert.equal(await targetStatus(), "active");
    assert.equal((await record()).status, "pending");
  } finally {
    await database.exec("ALTER TABLE community_reports DROP CONSTRAINT fail_test");
  }
});

test("moderation API requires admin auth, captures the session actor and returns conflicts", async () => {
  const filename = resolve(root, "app/api/admin/community/reports/[reportId]/route.ts");
  const request = () => new Request("http://localhost/api/admin/community/reports/id", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ decision: "review", adminUserId: "forged" }) });
  const context = { params: Promise.resolve({ reportId }) };
  let received;
  const handler = (session) => load(filename, {
    "@/features/admin/server/auth.repository": { getAdminSession: async () => session },
    "@/features/admin/server/community-management.repository": { processCommunityReport: async (_id, _input, actor) => { received = actor; throw Object.assign(new Error("stale"), { name: "ReportConflictError" }); } },
  });
  assert.equal((await handler(null).PATCH(request(), context)).status, 401);
  assert.equal(received, undefined);
  assert.equal((await handler(admin).PATCH(request(), context)).status, 409);
  assert.deepEqual(received, admin);
});
