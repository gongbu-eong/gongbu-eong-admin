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

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = resolve(process.env.GONGBU_FRONTEND_DIR || resolve(root, "../gongbu-eong/gongbu-eong-frontend"));
const vendor = resolve(root, "features/admin/components/members/service-results");
const database = new PGlite();
let queries = 0;
const db = { query: (sql, values) => { queries++; return database.query(sql, values); } };
const emptyComponent = () => null;

function load(filename, options = {}) {
  const source = readFileSync(filename, "utf8") + (options.extra || "");
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const loadedModule = { exports: {} };
  const dependency = (id) => {
    if (options.dependencies && Object.hasOwn(options.dependencies, id)) return options.dependencies[id];
    if (id === "./db") return db;
    if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_object, key) => String(key) }) };
    if (id === "react") return { ...React, useEffect() {}, useRef: value => ({ current: value }), useState: value => [
      typeof value === "string" && options.compare && value === "original" ? "compare" :
        options.secondQuestion && value === 0 ? 1 : typeof value === "function" ? value() : value,
      () => {},
    ] };
    if (id === "react/jsx-runtime") {
      const runtime = require(id);
      const wrap = fn => (type, props, ...args) => {
        // Only service navigation is absent from the read-only admin screen.
        if (["resultActions", "resultBackButton"].includes(props?.className)) return null;
        return fn(type, props, ...args);
      };
      return { ...runtime, jsx: wrap(runtime.jsx), jsxs: wrap(runtime.jsxs) };
    }
    if (id === "next/navigation") return { useRouter: () => ({ push() { throw new Error("Unexpected navigation"); } }) };
    if (id === "next/link" || id === "next/image") return { __esModule: true, default: emptyComponent };
    if (id.includes("AppChrome")) return { AppHeader: emptyComponent, AppFooter: emptyComponent };
    if (id.startsWith("@/") || id.endsWith(".api")) return {};
    if (id.startsWith(".")) {
      const base = resolve(dirname(filename), id);
      const target = [base, `${base}.tsx`, `${base}.ts`].find(existsSync);
      if (!target) throw new Error(`Missing test import: ${id}`);
      return load(target, { ...options, extra: undefined });
    }
    throw new Error(`Unexpected dependency: ${id}`);
  };
  vm.runInNewContext(compiled, { module: loadedModule, exports: loadedModule.exports, require: dependency,
    console, Date, URL, URLSearchParams, setTimeout, clearTimeout }, { filename });
  return loadedModule.exports;
}

const userId = "11111111-1111-4111-8111-111111111111";
const otherUserId = "22222222-2222-4222-8222-222222222222";
const resultId = "33333333-3333-4333-8333-333333333333";
const sessionId = "44444444-4444-4444-8444-444444444444";
const pendingId = "55555555-5555-4555-8555-555555555555";
const feedback = {
  score: 82, summary: "저장된 종합 평가", evaluationScores: [{ label: "NCS 역량 표현", score: 82 }],
  detailEvaluation: [], questionFeedback: [], improvementSuggestions: [], sentenceEdits: [], sections: [], rewrittenText: "저장된 첨삭",
  submissionReview: {
    preSubmitChecks: 1, fixSuggestions: 1, keepCount: 1,
    questions: [1, 2].map(index => ({
      question: `지원 동기 ${index}`, tabTitle: `문항 ${index}`, answer: `직접 작성한 답변 ${index}`,
      characterLimit: 500, characterCount: 30, exceededBy: 0, frameworks: ["PREP"], editCount: 1,
      methodComment: "원문 근거로 평가", resumeEvidence: [], highlights: [], edits: [],
      ncsEvaluations: [{ name: "의사소통능력", score: 86 - index, comment: `역량 평가 ${index}` }],
      coachingPoints: { strengths: ["경험 제시"], improvements: ["근거 보완"], ncsSuggestions: ["의도 연결"] },
      comparisonEdits: [{ original: "직접 작성한 답변", improved: "다듬은 답변", reason: "근거를 명확하게" }],
      majorRevisions: ["주요 수정"], factualChecks: ["사실 확인"],
    })),
  },
};
const answerFeedback = { score: 86, summary: "답변 평가", strengths: ["근거 있음"], improvements: ["구체화 필요"], nextAnswerGuide: "행동을 설명하세요.", followUpQuestion: "어떤 행동을 했나요?", followUpNcsAreas: ["의사소통능력"] };
const interviewResult = {
  score: 82, summary: "종합 평가", strengths: ["핵심 전달"], improvements: ["성과 구체화"], futurePracticeQuestions: ["다른 사례는?"],
  questionReviews: [{ questionId: "q1", question: "지원 동기는?", score: 82, answerScore: 86,
    followUpScores: [{ followUpIndex: 1, score: 78, summary: "추가 답변 평가" }], summary: "문항 종합 코칭",
    strengths: ["근거 제시"], improvements: ["명확한 행동"], ncsAreas: ["의사소통능력"] }],
};
let repository;
before(async () => {
  await database.exec(`
    CREATE TABLE user_files(id uuid PRIMARY KEY, original_filename text);
    CREATE TABLE resume_coaching_requests(id uuid PRIMARY KEY, user_id uuid, input_type text, input_text text,
      source_filename text, source_file_id uuid, job_posting_snapshot jsonb);
    CREATE TABLE resume_coaching_results(id uuid PRIMARY KEY, request_id uuid, feedback jsonb);
    CREATE TABLE interview_coaching_sessions(id uuid PRIMARY KEY, user_id uuid, status text, started_at timestamptz DEFAULT NOW(),
      completed_at timestamptz, last_error_message text, company_name text, position_name text, duty_text text,
      job_snapshot jsonb, analysis jsonb, questions jsonb, result jsonb);
    CREATE TABLE interview_coaching_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid, question_id text,
      role text, content text, follow_up_index integer, feedback jsonb, created_at timestamptz DEFAULT NOW(), message_order integer);
  `);
  await database.query("INSERT INTO resume_coaching_requests VALUES ($1,$2,'text','원문',NULL,NULL,$3)", [resultId, userId, JSON.stringify({ id: "job", institutionName: "기관", title: "직무" })]);
  await database.query("INSERT INTO resume_coaching_results VALUES ($1,$1,$2)", [resultId, JSON.stringify(feedback)]);
  await database.query(`INSERT INTO interview_coaching_sessions(id,user_id,status,company_name,position_name,duty_text,questions,result)
    VALUES ($1,$2,'completed','기관','직무','직무 내용',$3,$4),($5,$2,'ready','기관','직무','직무 내용','[]',NULL)`,
    [sessionId, userId, JSON.stringify([{ id: "q1", type: "experience", question: "지원 동기는?", intent: "의사소통 확인", difficulty: "기본", ncsAreas: ["의사소통능력"] }]), JSON.stringify(interviewResult), pendingId]);
  for (const [order, role, content, followUp, messageFeedback] of [
    [3, "answer", "추가 답변", 1, { ...answerFeedback, score: 78 }],
    [0, "question", "지원 동기는?", null, null], [2, "follow_up", "어떤 행동을 했나요?", 1, null],
    [1, "answer", "경험을 제시했습니다.", null, answerFeedback],
  ]) {
    await database.query(`INSERT INTO interview_coaching_messages(session_id,question_id,role,content,follow_up_index,feedback,message_order)
      VALUES ($1,'q1',$2,$3,$4,$5,$6)`, [sessionId, role, content, followUp, messageFeedback ? JSON.stringify(messageFeedback) : null, order]);
  }
  repository = load(resolve(root, "features/admin/server/member-coaching-results.repository.ts"));
});
after(async () => { await database.close(); });

test("result queries enforce both the member ID and result ID", async () => {
  assert.equal(await repository.getMemberResumeResult(otherUserId, resultId), null);
  assert.equal(await repository.getMemberInterviewResult(otherUserId, sessionId), null);
  const beforeQueries = queries;
  assert.equal(await repository.getMemberResumeResult("invalid", resultId), null);
  assert.equal(await repository.getMemberInterviewResult(userId, "invalid"), null);
  assert.equal(queries, beforeQueries);
  const item = await repository.getMemberResumeResult(userId, resultId);
  assert.equal(item.result.score, 82);
  assert.equal(item.result.submissionReview.questions.length, 2);
  assert.equal(item.isLocked, false);
});

test("interview data preserves answer order, per-answer scores and follow-up IDs", async () => {
  const session = await repository.getMemberInterviewResult(userId, sessionId);
  assert.deepEqual(session.messages.map(message => message.role), ["question", "answer", "follow_up", "answer"]);
  assert.equal(session.messages[3].questionId, "q1");
  assert.equal(session.messages[3].followUpIndex, 1);
  assert.equal(session.messages[3].feedback.score, 78);
  assert.equal(session.analysis.profile.companyName, "기관");
  assert.equal(session.result.questionReviews[0].answerScore, 86);
  assert.equal(session.isAnonymous, false);
  assert.equal((await repository.getMemberInterviewResult(userId, pendingId)).result, null);
});

test("both result routes require an admin session before querying private results", async () => {
  for (const path of ["resume-coaching/[resultId]", "interview-coaching/[sessionId]"]) {
    const page = load(resolve(root, `app/members/[userId]/${path}/page.tsx`), { dependencies: {
      "@/features/admin/server/auth.repository": { requireAdminSession: async () => { throw new Error("SIGN_IN_REQUIRED"); } },
      "@/features/admin/server/member-coaching-results.repository": repository,
    } });
    const beforeQueries = queries;
    await assert.rejects(page.default({ params: Promise.resolve({ userId, resultId, sessionId }) }), /SIGN_IN_REQUIRED/);
    assert.equal(queries, beforeQueries);
  }
});

test("resume markup matches the actual service for both question tabs and original/compare modes", { skip: !existsSync(frontend) }, async () => {
  const item = await repository.getMemberResumeResult(userId, resultId);
  for (const compare of [false, true]) for (const secondQuestion of [false, true]) {
    const name = "coaching/components/CoachingResultView.tsx";
    const actual = load(resolve(vendor, name), { compare, secondQuestion });
    const original = load(resolve(frontend, `features/${name}`), { compare, secondQuestion });
    const render = Component => renderToStaticMarkup(React.createElement(Component, { item }));
    assert.equal(render(actual.CoachingResultView), render(original.CoachingResultView));
  }
});

test("interview markup, answer scores, follow-up content and download match the actual service", { skip: !existsSync(frontend) }, async () => {
  const session = await repository.getMemberInterviewResult(userId, sessionId);
  const name = "interview-coaching/components/InterviewCoachingResultPage.tsx";
  const actual = load(resolve(vendor, name));
  const original = load(resolve(frontend, `features/${name}`), { extra: "\nexports.TestResultView = ResultView;" });
  const output = renderToStaticMarkup(React.createElement(actual.InterviewCoachingResultView, { session }));
  assert.equal(output, renderToStaticMarkup(React.createElement(original.TestResultView, { session })));
  assert.match(output, /86<small>\/100점/);
  assert.match(output, /78<small>\/100점/);
  assert.match(output, /추가 답변/);
  assert.match(output, /NCS 면접 코칭 결과 다운받기/);
  assert.doesNotMatch(output, /다시하기|회원가입하기/);
});

test("both CSS modules are byte-equivalent to service styles", { skip: !existsSync(frontend) }, () => {
  for (const path of ["coaching/components/CoachingPage.module.css", "interview-coaching/components/InterviewCoachingPage.module.css"]) {
    const normalize = value => value.replace(/\r\n/g, "\n");
    assert.equal(normalize(readFileSync(resolve(vendor, path), "utf8")), normalize(readFileSync(resolve(frontend, `features/${path}`), "utf8")));
  }
});
