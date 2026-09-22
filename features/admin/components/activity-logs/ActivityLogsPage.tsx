import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { getActivityLogData, ActivityLogQuery } from "@/features/admin/server/activity-log.repository";
import { ActivityLogTable } from "./ActivityLogTable";
import { TrimmedSearchInput } from "./TrimmedSearchInput";
import styles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

const eventOptions = [
  ["activity", "사용자 활동"],
  ["all", "원본 전체"],
  ["visit", "방문"],
  ["product", "기능·버튼 이벤트"],
  ["login", "로그인"],
] as const;

const screenOptions = [
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

type ActivityLogsPageProps = { filters?: ActivityLogQuery };

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

const cohortLabels: Record<string, string> = {
  job_visitor: "공고 상세 방문자 코호트",
  job_activity: "공고 상세 후속 행동 방문자 코호트",
  job_returning: "공고 상세 재방문자 코호트",
};

function makeHref(data: Awaited<ReturnType<typeof getActivityLogData>>, page: number, selectedIp = data.ip) {
  const params = new URLSearchParams({ startDate: data.startDate, endDate: data.endDate });
  if (data.event !== "all") params.set("event", data.event);
  if (data.eventType) params.set("eventType", data.eventType);
  if (data.cohort) params.set("cohort", data.cohort);
  if (data.bannerKey) params.set("bannerKey", data.bannerKey);
  if (data.screen !== "all") params.set("screen", data.screen);
  if (data.keyword) params.set("keyword", data.keyword);
  if (data.channel !== "all") params.set("channel", data.channel);
  if (data.uniqueOnly) params.set("unique", "1");
  if (data.includeExcluded) params.set("includeExcluded", "1");
  if (data.from) params.set("from", data.from);
  if (data.funnelProduct) params.set("funnelProduct", data.funnelProduct);
  if (data.funnelStep) params.set("funnelStep", data.funnelStep);
  if (selectedIp) params.set("ip", selectedIp);
  if (page > 1) params.set("page", String(page));
  return `/activity-logs?${params.toString()}`;
}

function pages(page: number, totalPages: number) {
  const end = Math.min(totalPages, Math.max(7, page + 3));
  const start = Math.max(1, end - 6);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export async function ActivityLogsPage({ filters }: ActivityLogsPageProps) {
  const data = await getActivityLogData(filters);
  const pageItems = pages(data.page, data.totalPages);
  const totalUnit = data.cohort ? "명" : "건";

  return (
    <AdminLayout
      activeNav="activity-logs"
      title="방문·이벤트 로그"
      description="가입자와 비회원의 방문 및 실제 사용자 행동을 시간순으로 확인합니다."
      headerActions={
        <form className={styles.headerFilters} action="/activity-logs">
          <label className={styles.headerDateField}>
            <span>시작일</span>
            <input type="date" name="startDate" defaultValue={data.startDate} />
          </label>
          <label className={styles.headerDateField}>
            <span>종료일</span>
            <input type="date" name="endDate" defaultValue={data.endDate} />
          </label>
          <label className={styles.headerSelectField}>
            <span>이벤트</span>
            <select name="event" defaultValue={data.event}>
              {eventOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className={styles.headerSelectField}>
            <span>화면</span>
            <select name="screen" defaultValue={data.screen}>
              {screenOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          <label className={styles.headerKeywordField}>
            <span>검색어</span>
            <TrimmedSearchInput name="keyword" placeholder="이름 · 경로 · 이벤트 · IP" defaultValue={data.keyword} />
          </label>
          <label className={styles.includeExcluded}>
            <input name="includeExcluded" type="checkbox" value="1" defaultChecked={data.includeExcluded} />
            제외 IP 포함
          </label>
          <input type="hidden" name="page" value="1" />
          <button type="submit">조회</button>
        </form>
      }
    >
      <section className={styles.page} aria-label="방문·이벤트 로그">
        <Link className={styles.backButton} href="/">← 대시보드로 돌아가기</Link>

        <AdminCard className={styles.tableCard}>
          <div className={styles.tableTop}>
            <div>
              <h2>{data.funnelLabel || (data.event === "visit" ? "방문 이력" : data.event === "activity" ? "사용자 활동 이력" : data.event === "all" ? "원본 전체 방문·이벤트 이력" : "이벤트 이력")}</h2>
              {data.bannerKey ? <p>선택한 배너·버튼의 실제 클릭만 조회 중</p> : null}
              {data.cohort ? <p>{cohortLabels[data.cohort]} · 대시보드와 동일한 일별 중복 제거 기준</p> : null}
              <p>총 <strong>{formatCount(data.totalCount)}</strong>{data.funnelLabel ? "명 · 대시보드 전환 퍼널과 동일한 시작 코호트 기준 · " : totalUnit + " · "}{data.uniqueOnly ? "순 방문자 기준 · " : data.cohort ? "대시보드 코호트 기준 · " : data.event === "activity" ? "방문·사용자 행동 기준 · " : "원본 이벤트 기준 · "}비회원은 IP와 익명 식별자로 확인합니다.{data.includeExcluded ? " · 제외 IP 포함 조회 중" : ""}{data.ip ? ` · ${data.ip} 로그만 조회 중` : ""}</p>
            </div>
            <span className={styles.tableActions}>
              {data.ip ? <Link className={styles.backButtonSecondary} href={makeHref(data, 1, "")}>전체 IP 보기</Link> : null}
            </span>
          </div>
          <ActivityLogTable
            rows={data.rows}
            emptyMessage="조회 조건에 해당하는 로그가 없습니다."
            renderIp={(row) => row.ipAddress !== "-" ? <Link href={makeHref(data, 1, row.ipAddress)}>{row.ipAddress}</Link> : row.ipAddress}
          />
          <nav className={styles.pagination} aria-label="방문 이벤트 로그 페이지">
            <Link className={data.page <= 1 ? styles.disabledPage : ""} href={makeHref(data, Math.max(1, data.page - 1))}>&lt;</Link>
            {pageItems.map((item) => <Link className={item === data.page ? styles.activePage : ""} href={makeHref(data, item)} key={item}>{item}</Link>)}
            <Link className={data.page >= data.totalPages ? styles.disabledPage : ""} href={makeHref(data, Math.min(data.totalPages, data.page + 1))}>&gt;</Link>
          </nav>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
