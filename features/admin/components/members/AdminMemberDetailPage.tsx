import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import {
  MemberDetailTab,
  getMemberDetailData,
  normalizeMemberTab,
} from "@/features/admin/server/members.repository";
import { AdminMemberActions } from "./AdminMemberActions";
import { ActivityLogTable } from "@/features/admin/components/activity-logs/ActivityLogTable";
import { TrimmedSearchInput } from "@/features/admin/components/activity-logs/TrimmedSearchInput";
import styles from "./AdminMemberDetailPage.module.css";
import logStyles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

const tabs: Array<{ label: string; value: MemberDetailTab }> = [
  { label: "개요", value: "overview" },
  { label: "진단 이력", value: "diagnosis" },
  { label: "자소서 코칭", value: "resume-coaching" },
  { label: "면접 코칭", value: "interview-coaching" },
  { label: "커뮤니티", value: "community" },
  { label: "방문·이벤트 로그", value: "logs" },
];

type AdminMemberDetailPageProps = {
  userId?: string | null;
  activeTab?: string | null;
  selectedItem?: string | null;
  logStartDate?: string | null;
  logEndDate?: string | null;
  logEvent?: string | null;
  logScreen?: string | null;
  logKeyword?: string | null;
  logIp?: string | null;
  logIncludeExcluded?: string | null;
  logPage?: number;
};

const logEventOptions = [
  ["activity", "사용자 활동"],
  ["all", "원본 전체"],
  ["visit", "방문"],
  ["product", "기능·버튼 이벤트"],
  ["login", "로그인"],
] as const;

const logScreenOptions = [
  ["all", "전체 화면"],
  ["home", "홈"],
  ["jobs", "공고 목록"],
  ["job_detail", "공고 상세"],
  ["ai_tools", "AI 도구"],
  ["resume_coaching", "AI NCS 자소서 코칭"],
  ["interview_coaching", "AI NCS 면접 코칭"],
  ["diagnosis", "강약점"],
  ["community", "커뮤니티"],
  ["calendar", "캘린더"],
  ["my", "마이페이지"],
  ["login", "로그인"],
  ["other", "기타"],
] as const;

function badgeClass(label: string) {
  if (label === "정지") return styles.blockedBadge;
  if (label === "탈퇴" || label === "강제탈퇴") return styles.withdrawnBadge;
  if (label === "가입대기") return styles.pendingBadge;
  return styles.statusBadge;
}

function detailHref(userId: string, tab: MemberDetailTab, item?: string) {
  const params = new URLSearchParams({ tab });
  if (item) params.set("item", item);
  return `/members/${userId}?${params.toString()}`;
}

type MemberLogData = Awaited<ReturnType<typeof getMemberDetailData>>;
type MemberDetailData = Awaited<ReturnType<typeof getMemberDetailData>>;

function memberLogHref(
  userId: string,
  data: MemberLogData,
  page: number,
  selected: { ip?: string; keyword?: string } = {},
) {
  const params = new URLSearchParams({
    tab: "logs",
    logStartDate: data.logStartDate,
    logEndDate: data.logEndDate,
    logEvent: data.logEvent,
    logScreen: data.logScreen,
  });
  const keyword = selected.keyword ?? data.logKeyword;
  const ip = selected.ip ?? data.logIp;
  if (keyword) params.set("logKeyword", keyword);
  if (ip) params.set("logIp", ip);
  if (data.logIncludeExcluded) params.set("logIncludeExcluded", "1");
  if (page > 1) params.set("logPage", String(page));
  return `/members/${userId}?${params.toString()}`;
}

function activityLogHref(userId: string, data: MemberLogData) {
  const params = new URLSearchParams({
    startDate: data.logStartDate,
    endDate: data.logEndDate,
    event: data.logEvent,
    screen: data.logScreen,
    userId,
  });
  if (data.logKeyword) params.set("keyword", data.logKeyword);
  if (data.logIp) params.set("ip", data.logIp);
  if (data.logIncludeExcluded) params.set("includeExcluded", "1");
  return `/activity-logs?${params.toString()}`;
}

function memberIdentityLogHref(
  userId: string,
  data: MemberLogData,
  selected: { ip?: string; keyword?: string },
) {
  const params = new URLSearchParams({
    tab: "logs",
    logStartDate: data.logStartDate,
    logEndDate: data.logEndDate,
    logEvent: "activity",
  });
  const keyword = selected.keyword || selected.ip;
  if (keyword) params.set("logKeyword", keyword);
  if (data.logIncludeExcluded) params.set("logIncludeExcluded", "1");
  return `/members/${userId}?${params.toString()}`;
}

function pageItems(page: number, totalPages: number) {
  const end = Math.min(totalPages, Math.max(7, page + 3));
  const start = Math.max(1, end - 6);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

type JsonRecord = Record<string, unknown>;

function toRecord(value: unknown): JsonRecord {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonRecord;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as JsonRecord)
        : {};
    } catch {
      return {};
    }
  }

  return {};
}

function firstValue(record: JsonRecord, ...keys: string[]) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }

  return undefined;
}

function displayText(value: unknown, fallback = "내용이 없습니다.") {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function displayNumber(value: unknown, fallback = 0) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function displayList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (item && typeof item === "object") {
        const record = item as JsonRecord;
        return displayText(firstValue(record, "text", "content", "description", "reason", "name"));
      }
      return "";
    })
    .filter(Boolean);
}

function displayRecordList(value: unknown) {
  if (Array.isArray(value)) return value.map(toRecord).filter((item) => Object.keys(item).length > 0);
  if (value && typeof value === "object") {
    return Object.values(value as JsonRecord).map(toRecord).filter((item) => Object.keys(item).length > 0);
  }
  return [];
}

function displayScores(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const record = toRecord(item);
        const label = firstValue(record, "label", "name", "title");
        return label ? [String(label), displayNumber(firstValue(record, "score", "value"))] as [string, number] : null;
      })
      .filter((item): item is [string, number] => item !== null);
  }

  const labels: Record<string, string> = {
    stability: "안정성",
    teamwork: "협업",
    execution: "실행력",
    principle: "원칙성",
    stabilityScore: "안정성",
    challengeScore: "도전성",
    analyticalScore: "분석력",
    collaborationScore: "협업",
    leadershipScore: "리더십",
    publicServiceScore: "공공서비스",
  };
  return Object.entries(toRecord(value)).map(([label, score]) => [labels[label] || label, displayNumber(score)] as [string, number]);
}

function ResultList({ items, empty = "표시할 내용이 없습니다." }: { items: string[]; empty?: string }) {
  return items.length > 0 ? (
    <ul className={styles.resultList}>
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  ) : <p className={styles.resultEmpty}>{empty}</p>;
}

function ResultCard({ title, children }: { title: string; children: ReactNode }) {
  return <section className={styles.resultCard}><h4>{title}</h4>{children}</section>;
}

function ScoreBars({ scores }: { scores: Array<[string, number]> }) {
  return (
    <div className={styles.scoreBars}>
      {scores.map(([label, score]) => (
        <div className={styles.scoreBar} key={label}>
          <div className={styles.scoreBarHeader}><span>{label}</span><strong>{score}점</strong></div>
          <div className={styles.scoreTrack}><i style={{ width: `${Math.max(0, Math.min(100, score))}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function DiagnosisResultView({ item }: { item: MemberDetailData["diagnosis"][number] }) {
  const detail = toRecord(item.detail);
  const raw = toRecord(firstValue(detail, "rawResult", "raw_result"));
  const source = { ...detail, ...raw };
  const score = displayNumber(firstValue(source, "totalScore", "total_score", "score"));
  const scores = displayScores(firstValue(source, "scores"));
  const fallbackScores = [
    ["안정성", displayNumber(firstValue(source, "stabilityScore", "stability_score"))],
    ["도전성", displayNumber(firstValue(source, "challengeScore", "challenge_score"))],
    ["분석력", displayNumber(firstValue(source, "analyticalScore", "analytical_score"))],
    ["협업", displayNumber(firstValue(source, "collaborationScore", "collaboration_score"))],
    ["리더십", displayNumber(firstValue(source, "leadershipScore", "leadership_score"))],
    ["공공서비스", displayNumber(firstValue(source, "publicServiceScore", "public_service_score"))],
  ] as Array<[string, number]>;
  const visibleScores = scores.length > 0 ? scores : fallbackScores;

  return (
    <section className={styles.resultView}>
      <header className={styles.resultHero}>
        <div><span className={styles.resultEyebrow}>강점·성향 진단 결과</span><h3>{item.title}</h3></div>
        <div className={styles.resultScore}><strong>{score}</strong><span>/ 100점</span></div>
        <p>{displayText(firstValue(source, "summary", "overallSummary"))}</p>
      </header>
      <ResultCard title="영역별 점수"><ScoreBars scores={visibleScores} /></ResultCard>
      <div className={styles.resultGrid}>
        <ResultCard title="강점"><ResultList items={displayList(firstValue(source, "strengths", "strongPoints"))} /></ResultCard>
        <ResultCard title="보완할 점"><ResultList items={displayList(firstValue(source, "weaknesses", "growthPoints", "growth_points"))} /></ResultCard>
        <ResultCard title="추천 활용법"><ResultList items={displayList(firstValue(source, "recommendations", "suggestions"))} /></ResultCard>
      </div>
    </section>
  );
}

function ResumeCoachingResultView({ item }: { item: MemberDetailData["resumeCoachings"][number] }) {
  const detail = toRecord(item.detail);
  const feedback = toRecord(firstValue(detail, "feedback", "result"));
  const score = displayNumber(firstValue(feedback, "score", "totalScore", "total_score", "overallScore"), displayNumber(item.result));
  const scores = displayScores(firstValue(feedback, "evaluationScores", "evaluation_scores", "scores"));
  const sections = displayRecordList(firstValue(feedback, "sections", "criteria", "questionResults"));
  const correctedText = displayText(firstValue(feedback, "correctedText", "corrected_text", "improvedText", "rewrittenText", "rewritten_text"), "첨삭 제안이 없습니다.");
  const suggestions = displayList(firstValue(feedback, "improvementSuggestions", "improvement_suggestions", "suggestions"));
  const submissionReview = toRecord(firstValue(feedback, "submissionReview", "submission_review"));
  const reviewQuestions = displayRecordList(firstValue(submissionReview, "questions"));

  return (
    <section className={styles.resultView}>
      <header className={styles.resultHero}>
        <div><span className={styles.resultEyebrow}>AI NCS 자소서 코칭 결과</span><h3>{item.title}</h3></div>
        <div className={styles.resultScore}><strong>{score}</strong><span>/ 100점</span></div>
        <p>{displayText(firstValue(feedback, "summary", "overallSummary"))}</p>
      </header>
      {scores.length > 0 ? <ResultCard title="전체 평가"><ScoreBars scores={scores} /></ResultCard> : null}
      <div className={styles.resultGrid}>
        <ResultCard title="개선 제안"><ResultList items={suggestions} /></ResultCard>
        <ResultCard title="지원 정보"><dl className={styles.resultFacts}><div><dt>입력 방식</dt><dd>{item.inputType === "file" ? "파일 업로드" : "직접 입력"}</dd></div><div><dt>지원 직무</dt><dd>{displayText(firstValue(toRecord(detail.job), "title", "name"), "정보 없음")}</dd></div></dl></ResultCard>
      </div>
      <ResultCard title="AI 첨삭 제안"><p className={styles.resultText}>{correctedText}</p></ResultCard>
      <details className={styles.resultDisclosure}>
        <summary>사용자 입력 보기</summary>
        <p className={styles.resultText}>{item.inputText || "입력 내용이 없습니다."}</p>
        {item.sourceFileUrl ? <a className={styles.fileLink} href={item.sourceFileUrl} target="_blank" rel="noreferrer">{item.sourceFilename || "첨부 파일 열기"} →</a> : null}
      </details>
      {sections.length > 0 ? <div className={styles.resultGrid}>{sections.map((section, index) => <ResultCard key={index} title={displayText(firstValue(section, "title", "name"), `평가 항목 ${index + 1}`)}><p className={styles.resultText}>{displayText(firstValue(section, "feedback", "comment", "summary", "description"))}</p></ResultCard>)}</div> : null}
      {reviewQuestions.length > 0 ? <section className={styles.questionResults}><h4>문항별 자소서 코칭</h4>{reviewQuestions.map((question, index) => { const points = toRecord(firstValue(question, "coachingPoints", "coaching_points")); const items = [...displayList(points.strengths), ...displayList(points.improvements), ...displayList(points.ncsSuggestions)]; return <article className={styles.questionCard} key={index}><span className={styles.questionNumber}>Q{index + 1}</span><h5>{displayText(firstValue(question, "question", "title"), "자소서 문항")}</h5><ResultList items={items} /></article>; })}</section> : null}
    </section>
  );
}

function InterviewCoachingResultView({ item, userId }: { item: MemberDetailData["interviewCoachings"][number]; userId: string }) {
  const detail = toRecord(item.detail);
  const result = toRecord(firstValue(detail, "result", "finalResult"));
  const analysis = toRecord(firstValue(detail, "analysis", "profile"));
  const score = displayNumber(firstValue(result, "score", "totalScore", "total_score"));
  const questions = displayRecordList(firstValue(detail, "questions", "questionResults", "question_results"));
  const questionReviews = displayRecordList(firstValue(result, "questionReviews", "question_reviews"));
  const messages = displayRecordList(firstValue(detail, "messages"));
  const messageByQuestion = questionReviews.length > 0 ? questionReviews : (messages.length > 0 ? messages : questions);

  return (
    <section className={styles.resultView}>
      <header className={styles.resultHero}>
        <div><span className={styles.resultEyebrow}>AI NCS 면접 코칭 결과</span><h3>{item.title}</h3></div>
        <div className={styles.resultScore}><strong>{score}</strong><span>/ 100점</span></div>
        <p>{displayText(firstValue(result, "summary", "overallSummary"), item.status === "completed" ? "면접 코칭 결과가 준비되었습니다." : `현재 상태: ${item.status}`)}</p>
        <dl className={styles.resultFacts}><div><dt>기업</dt><dd>{displayText(firstValue(detail, "company", "companyName"), "정보 없음")}</dd></div><div><dt>직무</dt><dd>{displayText(firstValue(detail, "position", "positionName"), "정보 없음")}</dd></div></dl>
      </header>
      <div className={styles.resultGrid}>
        <ResultCard title="잘한 점"><ResultList items={displayList(firstValue(result, "strengths", "goodPoints"))} /></ResultCard>
        <ResultCard title="보완할 점"><ResultList items={displayList(firstValue(result, "improvements", "weaknesses", "growthPoints"))} /></ResultCard>
        <ResultCard title="추가 연습 질문"><ResultList items={displayList(firstValue(result, "practiceQuestions", "futurePracticeQuestions"))} /></ResultCard>
      </div>
      {Object.keys(analysis).length > 0 ? <ResultCard title="면접 분석"><p className={styles.resultText}>{displayText(firstValue(analysis, "summary", "description"))}</p><ResultList items={displayList(firstValue(analysis, "ncsMapping", "keywords", "strengths"))} /></ResultCard> : null}
      {messageByQuestion.length > 0 ? <section className={styles.questionResults}><h4>문항별 답변 코칭</h4>{messageByQuestion.map((question, index) => <article className={styles.questionCard} key={index}><span className={styles.questionNumber}>Q{index + 1}</span><h5>{displayText(firstValue(question, "question", "text", "content"), "면접 질문")}</h5><p className={styles.resultText}>{displayText(firstValue(question, "feedback", "guide", "summary", "answer"))}</p><ResultList items={[...displayList(firstValue(question, "strengths")), ...displayList(firstValue(question, "improvements")), ...displayList(firstValue(question, "followUpQuestions", "follow_up_questions"))]} /></article>)}</section> : null}
      {item.materialFileAvailable ? <a className={styles.fileLink} href={`/members/${userId}/interview-coaching/${item.id}/file`}>{item.materialFilename || "면접 자료 다운로드"} 다운로드 ↓</a> : null}
    </section>
  );
}

export async function AdminMemberDetailPage({
  userId,
  activeTab,
  selectedItem,
  logStartDate,
  logEndDate,
  logEvent,
  logScreen,
  logKeyword,
  logIp,
  logIncludeExcluded,
  logPage,
}: AdminMemberDetailPageProps) {
  const tab = normalizeMemberTab(activeTab);
  const data = await getMemberDetailData(userId, {
    activeTab: tab,
    startDate: logStartDate,
    endDate: logEndDate,
    event: logEvent,
    screen: logScreen,
    keyword: logKeyword,
    ip: logIp,
    includeExcluded: logIncludeExcluded,
    page: logPage,
  });
  const member = data.member;
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!member) {
    return (
      <AdminLayout activeNav="members" title="회원 정보 상세" description="회원의 정보 상세 페이지입니다.">
        <section className={styles.emptyCard}>표시할 회원 데이터가 없습니다.</section>
      </AdminLayout>
    );
  }

  const selectedDiagnosis = data.diagnosis.find((item) => item.id === selectedItem);
  const selectedResume = data.resumeCoachings.find((item) => item.id === selectedItem);
  const selectedInterview = data.interviewCoachings.find((item) => item.id === selectedItem);

  return (
    <AdminLayout activeNav="members" title="회원 정보 상세" description="회원의 정보 상세 페이지입니다.">
      <Link className={styles.backLink} href="/members">← 회원 목록으로 돌아가기</Link>
      <section className={styles.profileCard}>
        <div className={styles.avatar} style={{ backgroundColor: member.backgroundColor }}>
          <Image src={member.avatarSrc} width={64} height={64} alt="" unoptimized />
        </div>
        <div className={styles.memberInfo}>
          <div className={styles.nameRow}>
            <strong>{member.name}</strong>
            <span className={badgeClass(member.statusLabel)}>{member.statusLabel}</span>
            <span className={styles.providerBadge}>{member.provider}</span>
          </div>
          <p>{member.gender} · {member.ageGroup} · {member.source} · {member.campaign} · 가입 {member.joinedAt}</p>
        </div>
        <AdminMemberActions userId={member.id} status={member.status} statusLabel={member.statusLabel} />
      </section>

      <nav className={styles.tabs} aria-label="회원 상세 탭">
        {tabs.map((item) => (
          <Link
            className={item.value === tab ? styles.activeTab : ""}
            href={item.value === "overview" ? `/members/${member.id}` : detailHref(member.id, item.value)}
            key={item.value}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <section className={styles.overviewCard}>
          <div className={styles.statGrid}>
            <StatItem label="진단 이력" value={`${member.diagnosisCount.toLocaleString("ko-KR")}회`} />
            <StatItem label="자소서 코칭" value={`${member.resumeCoachingCount.toLocaleString("ko-KR")}회`} />
            <StatItem label="면접 코칭" value={`${member.interviewCoachingCount.toLocaleString("ko-KR")}회`} />
            <StatItem label="커뮤니티 활동" value={`${(member.postCount + member.commentCount).toLocaleString("ko-KR")}건`} />
          </div>
          <h2>기본 정보 ({member.provider} 제공)</h2>
          <div className={styles.infoGrid}>
            <InfoRow label="닉네임" value={member.name} />
            <InfoRow label="연령대" value={member.ageGroup} />
            <InfoRow label="이메일" value={member.maskedEmail} />
            <InfoRow label="유입 경로" value={`${member.source} · ${member.campaign}`} />
            <InfoRow label="성별" value={member.gender} />
            <InfoRow label="상태" value={member.statusLabel} />
            {member.blockedUntil !== "-" ? <InfoRow label="정지 만료일" value={member.blockedUntil} /> : null}
            {member.rejoinBlockedUntil !== "-" ? <InfoRow label="재가입 제한일" value={member.rejoinBlockedUntil} /> : null}
          </div>
        </section>
      ) : null}

      {tab === "diagnosis" ? (
        <ActivitySection title="진단 이력">
          <DataTable columns={["날짜", "진단", "결과", "상세"]} rows={data.diagnosis.map((item) => [
            item.date,
            item.title,
            item.result,
            <Link href={detailHref(member.id, "diagnosis", item.id)} key={item.id}>결과 보기</Link>,
          ])} />
      {selectedDiagnosis ? <DiagnosisResultView item={selectedDiagnosis} /> : null}
        </ActivitySection>
      ) : null}

      {tab === "resume-coaching" ? (
        <ActivitySection title="자소서 코칭">
          <DataTable columns={["날짜", "제목", "결과", "입력 파일", "상세"]} rows={data.resumeCoachings.map((item) => [
            item.date,
            item.title,
            item.result,
            item.sourceFilename || (item.inputType === "file" ? "파일 정보 없음" : "직접 입력"),
            <Link href={detailHref(member.id, "resume-coaching", item.id)} key={item.id}>결과 보기</Link>,
          ])} />
      {selectedResume ? <ResumeCoachingResultView item={selectedResume} /> : null}
        </ActivitySection>
      ) : null}

      {tab === "interview-coaching" ? (
        <ActivitySection title="면접 코칭">
          <DataTable columns={["날짜", "공고/직무", "상태", "첨부 파일", "상세"]} rows={data.interviewCoachings.map((item) => [
            item.date,
            item.title,
            item.result,
            item.materialFilename || "없음",
            <Link href={detailHref(member.id, "interview-coaching", item.id)} key={item.id}>결과 보기</Link>,
          ])} />
      {selectedInterview ? <InterviewCoachingResultView item={selectedInterview} userId={member.id} /> : null}
        </ActivitySection>
      ) : null}

      {tab === "community" ? (
        <ActivitySection title="커뮤니티 활동">
          <DataTable columns={["날짜", "구분", "게시글", "작성 내용", "상태", "이동"]} rows={data.community.map((item) => [
            item.date,
            item.kind,
            item.title,
            <span className={styles.cellText} key={item.id}>{item.content || "내용 없음"}</span>,
            item.status,
            <a href={`${publicSiteUrl}${item.href}`} target="_blank" rel="noreferrer" key={`${item.id}-link`}>사이트에서 보기 ↗</a>,
          ])} />
        </ActivitySection>
      ) : null}

      {tab === "logs" ? (
        <section className={styles.tableCard}>
          <form className={styles.logFilters} action={`/members/${member.id}`}>
            <input type="hidden" name="tab" value="logs" />
            <input type="hidden" name="logPage" value="1" />
            <label className={logStyles.headerDateField}>
              <span>시작일</span>
              <input type="date" name="logStartDate" defaultValue={data.logStartDate} />
            </label>
            <label className={logStyles.headerDateField}>
              <span>종료일</span>
              <input type="date" name="logEndDate" defaultValue={data.logEndDate} />
            </label>
            <label className={logStyles.headerSelectField}>
              <span>이벤트</span>
              <select name="logEvent" defaultValue={data.logEvent}>
                {logEventOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className={logStyles.headerSelectField}>
              <span>화면</span>
              <select name="logScreen" defaultValue={data.logScreen}>
                {logScreenOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
            </label>
            <label className={logStyles.headerKeywordField}>
              <span>검색어</span>
              <TrimmedSearchInput name="logKeyword" placeholder="경로 · 화면 · 상세 · IP" defaultValue={data.logKeyword} />
            </label>
            <label className={logStyles.includeExcluded}>
              <input name="logIncludeExcluded" type="checkbox" value="1" defaultChecked={data.logIncludeExcluded} />
              제외 IP 포함
            </label>
            <button type="submit">조회</button>
          </form>
          <div className={logStyles.tableTop}>
            <div>
              <h2>{data.logEvent === "visit" ? "방문 이력" : data.logEvent === "activity" ? "사용자 활동 이력" : data.logEvent === "all" ? "원본 전체 방문·이벤트 이력" : "이벤트 이력"}</h2>
              <p>{data.logStartDate} ~ {data.logEndDate} · 방문·이벤트 로그와 동일한 조건으로 최신순 표시합니다.</p>
              <p>총 <strong>{data.logCount.toLocaleString("ko-KR")}</strong>건 · 이 회원의 로그만 조회 중{data.logIp ? ` · ${data.logIp} IP만 조회 중` : ""}</p>
            </div>
            <span className={logStyles.tableActions}>
              {data.logIp ? <Link className={logStyles.backButtonSecondary} href={memberLogHref(member.id, data, 1, { ip: "" })}>전체 IP 보기</Link> : null}
              <Link className={logStyles.backButtonSecondary} href={activityLogHref(member.id, data)}>방문·이벤트 로그에서 보기</Link>
            </span>
          </div>
          <ActivityLogTable
            rows={data.logs}
            emptyMessage="조회 조건에 해당하는 로그가 없습니다."
            renderIp={(row) => row.ipAddress !== "-" ? <Link href={memberIdentityLogHref(member.id, data, { ip: row.ipAddress })}>{row.ipAddress}</Link> : row.ipAddress}
            renderIdentity={(row) => row.identity !== "회원 식별됨"
              ? <Link href={memberIdentityLogHref(member.id, data, { keyword: row.identity })}>{row.identity}</Link>
              : row.identity}
          />
          <nav className={logStyles.pagination} aria-label="회원 방문 이벤트 로그 페이지">
            <Link className={data.logPage <= 1 ? logStyles.disabledPage : ""} href={memberLogHref(member.id, data, Math.max(1, data.logPage - 1))}>&lt;</Link>
            {pageItems(data.logPage, data.logTotalPages).map((item) => (
              <Link className={item === data.logPage ? logStyles.activePage : ""} href={memberLogHref(member.id, data, item)} key={item}>{item}</Link>
            ))}
            <Link className={data.logPage >= data.logTotalPages ? logStyles.disabledPage : ""} href={memberLogHref(member.id, data, Math.min(data.logTotalPages, data.logPage + 1))}>&gt;</Link>
          </nav>
        </section>
      ) : null}

    </AdminLayout>
  );
}

function ActivitySection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className={styles.tableCard}><h2>{title}</h2>{description ? <p className={styles.sectionDescription}>{description}</p> : null}{children}</section>;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return <article className={styles.statItem}><span>{label}</span><strong>{value}</strong></article>;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return <p><span>{label}</span><strong>{value}</strong></p>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  return <table className={styles.dataTable}>
    <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
    <tbody>{rows.length > 0 ? rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td data-label={columns[cellIndex]} key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={columns.length}>표시할 데이터가 없습니다.</td></tr>}</tbody>
  </table>;
}
