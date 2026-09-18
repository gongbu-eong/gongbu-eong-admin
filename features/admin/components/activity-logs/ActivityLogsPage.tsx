import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { getActivityLogData, ActivityLogQuery } from "@/features/admin/server/activity-log.repository";
import styles from "@/features/admin/components/traffic/TrafficLogsPage.module.css";

const eventOptions = [
  ["all", "전체 이벤트"],
  ["page_view", "페이지 방문"],
  ["product", "기능·버튼 이벤트"],
  ["attribution", "유입 기록"],
  ["login", "로그인"],
  ["entry", "최초 진입"],
] as const;

const screenOptions = [
  ["all", "전체 화면"],
  ["home", "홈"],
  ["jobs", "공고 목록"],
  ["job_detail", "공고 상세"],
  ["ai_tools", "AI 도구"],
  ["coaching", "AI NCS 자소서 코칭"],
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

function makeHref(data: Awaited<ReturnType<typeof getActivityLogData>>, page: number, selectedIp = data.ip) {
  const params = new URLSearchParams({ startDate: data.startDate, endDate: data.endDate });
  if (data.event !== "all") params.set("event", data.event);
  if (data.screen !== "all") params.set("screen", data.screen);
  if (data.keyword) params.set("keyword", data.keyword);
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

  return (
    <AdminLayout
      activeNav="activity-logs"
      title="방문·이벤트 로그"
      description="가입자와 비회원의 방문 및 기능 이용 이력을 한 곳에서 확인합니다."
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
            <input name="keyword" placeholder="이름 · 경로 · 이벤트" defaultValue={data.keyword} />
          </label>
          {data.ip ? <input type="hidden" name="ip" value={data.ip} /> : null}
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
              <h2>전체 방문·이벤트 이력</h2>
              <p>총 <strong>{formatCount(data.totalCount)}</strong>건 · 비회원은 IP와 익명 식별자로 확인합니다.{data.ip ? ` · ${data.ip} 로그만 조회 중` : ""}</p>
            </div>
            <span className={styles.tableActions}>
              {data.ip ? <Link className={styles.backButtonSecondary} href={makeHref(data, 1, "")}>전체 IP 보기</Link> : null}
              <Link className={styles.backButtonSecondary} href="/">대시보드</Link>
            </span>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>접속일시</th><th>이벤트</th><th>사용자</th><th>식별 정보</th><th>IP</th><th>경로</th><th>상세</th></tr></thead>
              <tbody>{data.rows.length ? data.rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.eventAt}</td><td>{row.event}</td>
                  <td><span className={styles.userCell}><strong>{row.userName}</strong>{row.userEmail ? <em>{row.userEmail}</em> : <em>비회원</em>}</span></td>
                  <td className={styles.pathCell} title={row.identity}>{row.identity}</td>
                  <td>{row.ipAddress !== "-" ? <Link href={makeHref(data, 1, row.ipAddress)}>{row.ipAddress}</Link> : row.ipAddress}</td>
                  <td className={styles.pathCell} title={row.path}>{row.path}</td>
                  <td className={styles.pathCell} title={row.detail}>{row.detail}</td>
                </tr>
              )) : <tr><td className={styles.emptyCell} colSpan={7}>조회 조건에 해당하는 로그가 없습니다.</td></tr>}</tbody>
            </table>
          </div>
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
