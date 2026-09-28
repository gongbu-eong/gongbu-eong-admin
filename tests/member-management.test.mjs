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
const service = resolve(process.env.GONGBU_PROJECT_DIR || resolve(root, "../gongbu-eong"));
const require = createRequire(import.meta.url);
const database = new PGlite();
const user = "11111111-1111-4111-8111-111111111111";
const other = "22222222-2222-4222-8222-222222222222";
const resultId = "33333333-3333-4333-8333-333333333333";
const peerResultId = "44444444-4444-4444-8444-444444444444";
let queries = 0;
const db = { query: (sql, values) => {
  assert.match(sql.trim(), /^(SELECT|WITH)\b/, "result lookup must never mutate member data");
  queries++;
  return database.query(sql, values);
} };

function load(filename, options = {}) {
  const loadedModule = { exports: {} };
  let stateIndex = 0;
  const dependency = id => {
    if (options.dependencies && Object.hasOwn(options.dependencies, id)) return options.dependencies[id];
    if (id === "@/features/admin/server/db" || id === "./db") return db;
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (id === "react") return { ...React, useEffect() {}, useState: initial => [options.states ? options.states[stateIndex++] : initial, () => {}] };
    if (id === "react/jsx-runtime") {
      const runtime = require(id);
      const wrap = fn => (type, props, ...rest) => ["actions", "coachingButton", "publicDiagnosisButton"].includes(props?.className) ? null : fn(type, props, ...rest);
      return { ...runtime, jsx: wrap(runtime.jsx), jsxs: wrap(runtime.jsxs) };
    }
    if (id === "next/link") return { __esModule: true, default: props => React.createElement("a", props) };
    if (id === "next/image") return { __esModule: true, default: props => React.createElement("img", Object.fromEntries(Object.entries(props).filter(([key]) => !["priority", "unoptimized"].includes(key)))) };
    if (id === "next/navigation") return { useRouter: () => ({}), useSearchParams: () => new URLSearchParams({ resultId }) };
    if (id.includes("AppChrome")) return { AppHeader: () => null, AppFooter: () => null };
    if (id.endsWith("useBodyScrollLock")) return { useBodyScrollLock() {} };
    if (id.includes("activity-log.repository")) return {};
    if (id === "@/features/admin/components/AdminLayout") return { AdminLayout: ({ children }) => React.createElement("div", null, children) };
    if (id === "@/features/jobs/job-display") return load(resolve(service, "gongbu-eong-event/features/jobs/job-display.ts"));
    if (id.endsWith(".api") || id.endsWith("diagnosis-share") || id.endsWith("kakao-share")) return {};
    const base = id.startsWith("@/") ? resolve(root, id.slice(2)) : resolve(dirname(filename), id);
    const target = [base, `${base}.ts`, `${base}.tsx`].find(existsSync);
    if (!target) throw new Error(`Unexpected import: ${id}`);
    return load(target, options);
  };
  const compiled = ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: dependency, console, Date, URL, URLSearchParams,
    process: { env: { NEXT_PUBLIC_MAIN_APP_URL: "https://gongbueong.career.co.kr", NODE_ENV: "production", ...options.env } } }, { filename });
  return loadedModule.exports;
}

let members;
let diagnosis;
before(async () => {
  await database.exec(`
    CREATE TABLE users(id uuid PRIMARY KEY, nickname text, display_name text, email text, gender text, age_group text,
      profile_avatar_key text, profile_background_color text, status text DEFAULT 'active', blocked_until timestamptz,
      rejoin_blocked_until timestamptz, signup_completed_at timestamptz, created_at timestamptz DEFAULT NOW(), last_login_at timestamptz,
      selected_diagnosis_result_id uuid);
    CREATE TABLE user_oauth_accounts(user_id uuid, provider text, provider_email text, last_used_at timestamptz, linked_at timestamptz, created_at timestamptz);
    CREATE TABLE user_attributions(user_id uuid, first_source text, first_campaign text);
    CREATE TABLE resume_coaching_requests(user_id uuid);
    CREATE TABLE interview_coaching_sessions(user_id uuid);
    CREATE TABLE community_posts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, status text, created_at timestamptz DEFAULT NOW());
    CREATE TABLE community_comments(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid, parent_comment_id uuid, status text);
    CREATE TABLE diagnosis_runs(id uuid PRIMARY KEY, user_id uuid, completed_at timestamptz DEFAULT NOW());
    CREATE TABLE personality_types(id uuid PRIMARY KEY, code text, name text);
    CREATE TABLE diagnosis_results(id uuid PRIMARY KEY, diagnosis_run_id uuid, personality_type_id uuid, user_id uuid,
      summary text, stability_score integer, challenge_score integer, stability_axis_percent integer, teamwork_axis_percent integer,
      execution_axis_percent integer, principle_axis_percent integer, strengths jsonb, weaknesses jsonb, raw_result jsonb, created_at timestamptz DEFAULT NOW());
    CREATE TABLE diagnosis_login_conversions(diagnosis_result_id uuid, user_id uuid, created_at timestamptz DEFAULT NOW());
    CREATE TABLE job_categories(id uuid PRIMARY KEY, name text, is_active boolean, sort_order integer);
    CREATE TABLE personality_job_category_mappings(personality_type_id uuid, job_category_id uuid, reason text, fit_weight integer, sort_order integer);
    CREATE TABLE public_institutions(id uuid PRIMARY KEY, name text);
    CREATE TABLE job_postings(id uuid PRIMARY KEY, institution_id uuid, title text, application_start_at timestamptz, application_end_at timestamptz,
      employment_type text, work_region text, career_requirement text, apply_url text, ncs_category text, education_requirement text,
      hiring_count integer, is_active boolean, raw_payload jsonb, announcement_at timestamptz, created_at timestamptz, view_count integer);
    CREATE TABLE user_job_bookmarks(user_id uuid, job_posting_id uuid);
  `);
  await database.query(`INSERT INTO users(id,nickname,email,signup_completed_at,last_login_at,selected_diagnosis_result_id)
    VALUES ($1,'테스트 회원','test@example.local','2026-12-31T16:00:00Z','2025-09-22T01:32:11Z',$3),($2,'다른 회원','other@example.local',NOW(),NULL,$4)`, [user, other, resultId, peerResultId]);
  await database.query("INSERT INTO community_posts(user_id,status) VALUES ($1,'active'),($1,'deleted'),($2,'active')", [user, other]);
  await database.query("INSERT INTO community_comments(user_id,parent_comment_id,status) VALUES ($1,NULL,'active'),($1,$3,'active'),($1,NULL,'deleted'),($2,NULL,'active')", [user, other, resultId]);
  await database.query("INSERT INTO diagnosis_runs(id,user_id) VALUES ($1,NULL),($2,$3)", [resultId, peerResultId, other]);
  await database.query("INSERT INTO personality_types VALUES ($1,'stability','안정 추구형')", [resultId]);
  await database.query(`INSERT INTO diagnosis_results(id,diagnosis_run_id,personality_type_id,user_id,stability_axis_percent,teamwork_axis_percent,
    execution_axis_percent,principle_axis_percent,strengths,weaknesses) VALUES
    ($1,$1,$1,NULL,80,65,40,90,'["책임감 있는 경험","꼼꼼한 확인","지속적인 노력"]','["변화 연습"]'),($2,$2,$1,$3,90,55,60,60,'[]','[]')`, [resultId, peerResultId, other]);
  await database.query("INSERT INTO diagnosis_login_conversions(diagnosis_result_id,user_id) VALUES ($1,$2),($1,$2)", [resultId, user]);
  await database.query("INSERT INTO job_categories VALUES ($1,'경영',true,1)", [resultId]);
  await database.query("INSERT INTO personality_job_category_mappings VALUES ($1,$1,'맞춤 직무',90,1)", [resultId]);
  await database.query("INSERT INTO public_institutions VALUES ($1,'테스트 기관')", [resultId]);
  await database.query(`INSERT INTO job_postings(id,institution_id,title,application_start_at,application_end_at,employment_type,ncs_category,is_active,created_at,view_count)
    VALUES ($1,$1,'정규직 모집',NOW(),NOW()+INTERVAL '1 day','정규직','경영',true,NOW(),1)`, [resultId]);
  members = load(resolve(root, "features/admin/server/members.repository.ts"));
  diagnosis = load(resolve(root, "features/admin/server/member-diagnosis-results.repository.ts"));
});
after(async () => { await database.close(); });

test("site links default to production, reject production loopback and preserve post/comment paths", () => {
  const site = load(resolve(root, "features/admin/public-site.ts"));
  for (const input of [undefined, "", "broken", "http://localhost:3000", "http://127.0.0.1:3000", "http://[::1]:3000", "javascript:alert(1)"]) {
    assert.equal(site.getPublicSiteUrl(input, true), "https://gongbueong.career.co.kr");
  }
  assert.equal(site.getPublicSiteUrl("https://preview.example.com/", true), "https://preview.example.com");
  assert.equal(site.getPublicSiteUrl("http://localhost:3000", false), "http://localhost:3000");
  assert.equal(site.publicSiteHref(`/community/${resultId}#comment-${peerResultId}`), `https://gongbueong.career.co.kr/community/${resultId}#comment-${peerResultId}`);
});

test("member queries count posts, comments and replies without multiplication and show Seoul calendar years", async () => {
  const data = await members.getMemberListData({ selectedId: user });
  const item = data.members.find(item => item.id === user);
  assert.equal(item.postCount, 2);
  assert.equal(item.commentCount, 3);
  assert.equal(item.communityCount, 5);
  assert.equal(item.diagnosisCount, 1, "signup-linked diagnosis must be counted only once");
  assert.equal(item.joinedAtShort, "2027. 1. 1");
  assert.match(item.lastLoginAt, /2025.*9.*22.*10:32:11/);
  assert.equal(data.members.find(item => item.id === other).lastLoginAt, "-");
  const page = load(resolve(root, "features/admin/components/members/AdminMemberListPage.tsx"), { dependencies: {
    "@/features/admin/server/members.repository": { getMemberListData: async () => data },
  } });
  const html = renderToStaticMarkup(await page.AdminMemberListPage({}));
  assert.match(html, /<span>커뮤니티<\/span>/);
  assert.match(html, /게시글 2개 · 댓글·대댓글 3개/);
  assert.match(html, /5회/);
  assert.match(html, /2027\. 1\. 1/);
});

test("diagnosis ownership includes signup conversions, rejects foreign results and avoids fabricated scores", async () => {
  assert.equal(await diagnosis.getMemberDiagnosisResult(other, resultId), null);
  assert.equal(await diagnosis.getMemberDiagnosisResult(user, peerResultId), null);
  const beforeQueries = queries;
  assert.equal(await diagnosis.getMemberDiagnosisResult("invalid", resultId), null);
  assert.equal(queries, beforeQueries);
  const { detail, nickname } = await diagnosis.getMemberDiagnosisResult(user, resultId);
  assert.equal(nickname, "테스트 회원");
  assert.deepEqual(Array.from(detail.result.axisResults, item => item.percent), [80, 65, 40, 90]);
  assert.equal(detail.result.percentages.planning, 60);
  assert.equal(detail.percentile.topPercent, 100);
  assert.equal(detail.percentile.sampleSize, 1);
  assert.equal(detail.monthlyHiring.totalCount, 1);
  assert.equal(detail.recommendedPostings[0].title, "정규직 모집");
});

test("diagnosis route authenticates before reading private results", async () => {
  const page = load(resolve(root, "app/members/[userId]/diagnosis/[resultId]/page.tsx"), { dependencies: {
    "@/features/admin/server/auth.repository": { requireAdminSession: async () => { throw new Error("SIGN_IN_REQUIRED"); } },
  } });
  const beforeQueries = queries;
  await assert.rejects(page.default({ params: Promise.resolve({ userId: user, resultId }) }), /SIGN_IN_REQUIRED/);
  assert.equal(queries, beforeQueries);
});

test("all eight diagnosis types render the same result markup as the actual service", { skip: !existsSync(service) }, async () => {
  const data = await diagnosis.getMemberDiagnosisResult(user, resultId);
  for (const typeCode of ["stability", "challenge", "teamwork", "individual", "execution", "planning", "principle", "flexibility"]) {
    const detail = { ...data.detail, result: { ...data.detail.result, typeCode } };
    const actual = load(resolve(root, "features/admin/components/members/service-results/diagnosis/DiagnosisResultDetail.tsx"));
    const original = load(resolve(service, "gongbu-eong-event/features/diagnosis/components/DiagnosisResultDetail.tsx"), {
      states: [detail, { nickname: data.nickname }, false, null, false, [], null, false, 0],
    });
    assert.equal(renderToStaticMarkup(React.createElement(actual.DiagnosisResultDetail, { detail, nickname: data.nickname })),
      renderToStaticMarkup(React.createElement(original.DiagnosisResultDetail)), typeCode);
  }
});

test("diagnosis CSS is identical to the actual service", { skip: !existsSync(service) }, () => {
  const normalize = text => text.replace(/\r\n/g, "\n");
  assert.equal(normalize(readFileSync(resolve(root, "features/admin/components/members/service-results/diagnosis/DiagnosisResultDetail.module.css"), "utf8")),
    normalize(readFileSync(resolve(service, "gongbu-eong-event/features/diagnosis/components/DiagnosisResultDetail.module.css"), "utf8")));
});
