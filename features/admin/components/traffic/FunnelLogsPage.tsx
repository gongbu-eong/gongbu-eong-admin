import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import {
  FunnelLogQuery,
  FunnelProductFilter,
  FunnelStepFilter,
} from "@/features/admin/data/traffic";
import { getFunnelLogData } from "@/features/admin/server/traffic.repository";
import styles from "./FunnelLogsPage.module.css";

const productOptions: Array<{ label: string; value: FunnelProductFilter }> = [
  { label: "강점·성향 유형", value: "diagnosis" },
  { label: "AI NCS 자소서", value: "resume_coaching" },
  { label: "AI NCS 면접", value: "interview_coaching" },
];

const allStepOptions: Array<{ label: string; value: FunnelStepFilter }> = [
  { label: "방문", value: "visit" },
  { label: "시작", value: "start" },
  { label: "완료", value: "complete" },
  { label: "방문 후 이탈", value: "visit_drop" },
  { label: "시작 후 이탈", value: "start_drop" },
];

type FunnelLogsPageProps = {
  filters?: FunnelLogQuery;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function createQuery(
  data: Awaited<ReturnType<typeof getFunnelLogData>>,
  page: number,
) {
  const params = new URLSearchParams();

  params.set("product", data.product);
  params.set("step", data.step);
  params.set("startDate", data.startDate);
  params.set("endDate", data.endDate);
  if (data.keyword) params.set("keyword", data.keyword);
  if (page > 1) params.set("page", String(page));

  return `/traffic/funnel?${params.toString()}`;
}

function createVisiblePages(page: number, totalPages: number) {
  const start = Math.max(1, page - 3);
  const end = Math.min(totalPages, start + 6);
  const normalizedStart = Math.max(1, end - 6);

  return Array.from(
    { length: end - normalizedStart + 1 },
    (_, index) => normalizedStart + index,
  );
}

function providerClass(provider: "kakao" | "naver" | "unknown") {
  if (provider === "kakao") return styles.providerKakao;
  if (provider === "naver") return styles.providerNaver;
  return styles.providerUnknown;
}

function deviceClass(device: "모바일" | "웹" | "알 수 없음") {
  if (device === "모바일") return styles.deviceMobile;
  if (device === "웹") return styles.deviceWeb;
  return styles.deviceUnknown;
}

export async function FunnelLogsPage({ filters }: FunnelLogsPageProps) {
  const data = await getFunnelLogData(filters);
  const stepOptions =
    data.product === "diagnosis"
      ? allStepOptions.filter(
          (option) =>
            option.value !== "visit" && option.value !== "visit_drop",
        )
      : allStepOptions;
  const pages = createVisiblePages(data.page, data.totalPages);

  return (
    <AdminLayout
      activeNav="traffic"
      activeSubNav="traffic-funnel"
      title="전환 퍼널 상세"
      description="대시보드 퍼널 숫자에 포함된 실제 회원과 익명 세션을 확인해요."
    >
      <section className={styles.page} aria-label="전환 퍼널 상세">
        <AdminCard className={styles.searchCard}>
          <form className={styles.filters} action="/traffic/funnel">
            <label className={styles.selectField}>
              <span>분석대상</span>
              <select name="product" defaultValue={data.product}>
                {productOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.selectField}>
              <span>단계</span>
              <select name="step" defaultValue={data.step}>
                {stepOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.dateField}>
              <span>시작일</span>
              <input
                type="date"
                name="startDate"
                defaultValue={data.startDate}
              />
            </label>
            <label className={styles.dateField}>
              <span>종료일</span>
              <input type="date" name="endDate" defaultValue={data.endDate} />
            </label>
            <label className={styles.keywordField}>
              <span>검색어</span>
              <input
                name="keyword"
                placeholder="유저명 · 이메일 · 경로 · IP"
                defaultValue={data.keyword}
              />
            </label>
            <input type="hidden" name="page" value="1" />
            <button type="submit">검색</button>
          </form>
        </AdminCard>

        <AdminCard className={styles.tableCard}>
          <div className={styles.tableTop}>
            <div>
              <h2>
                {data.productLabel} · {data.stepLabel}
              </h2>
              <p>
                총 <strong>{formatCount(data.totalCount)}</strong>명 · 페이지당{" "}
                {formatCount(data.pageSize)}건
              </p>
            </div>
            <Link href="/">대시보드로 돌아가기</Link>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>일시</th>
                  <th>대상</th>
                  <th>마지막 행동</th>
                  <th>채널</th>
                  <th>IP</th>
                  <th>기기</th>
                  <th>경로</th>
                  <th>이전 경로</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.eventAt}</td>
                      <td>
                        <span className={styles.userCell}>
                          <span className={styles.userMain}>
                            <strong>{row.userName}</strong>
                            <i className={providerClass(row.provider)}>
                              {row.providerLabel}
                            </i>
                          </span>
                          <em>
                            {row.userEmail}
                            {row.anonymousId !== "-"
                              ? ` · anon ${row.anonymousId}`
                              : ""}
                          </em>
                        </span>
                      </td>
                      <td>
                        <strong>{row.lastAction}</strong>
                      </td>
                      <td>{row.channel}</td>
                      <td>{row.ipAddress}</td>
                      <td>
                        <span
                          className={`${styles.deviceBadge} ${deviceClass(row.device)}`}
                        >
                          {row.device}
                        </span>
                      </td>
                      <td className={styles.pathCell} title={row.path}>
                        {row.path}
                      </td>
                      <td className={styles.pathCell} title={row.referrer}>
                        {row.referrer}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={styles.emptyCell} colSpan={8}>
                      조회 조건에 해당하는 퍼널 대상자가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <nav className={styles.pagination} aria-label="전환 퍼널 상세 페이지">
            <Link
              className={data.page <= 1 ? styles.disabledPage : ""}
              href={createQuery(data, Math.max(1, data.page - 1))}
            >
              &lt;
            </Link>
            {pages.map((page) => (
              <Link
                className={page === data.page ? styles.activePage : ""}
                href={createQuery(data, page)}
                key={page}
              >
                {page}
              </Link>
            ))}
            <Link
              className={data.page >= data.totalPages ? styles.disabledPage : ""}
              href={createQuery(data, Math.min(data.totalPages, data.page + 1))}
            >
              &gt;
            </Link>
          </nav>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
