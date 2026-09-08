import Link from "next/link";
import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { BannerClickLogQuery } from "@/features/admin/data/traffic";
import { getBannerClickLogData } from "@/features/admin/server/traffic.repository";
import styles from "./BannerClickLogsPage.module.css";

type BannerClickLogsPageProps = {
  filters?: BannerClickLogQuery;
};

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function createQuery(
  data: Awaited<ReturnType<typeof getBannerClickLogData>>,
  page: number,
) {
  const params = new URLSearchParams();

  params.set("startDate", data.startDate);
  params.set("endDate", data.endDate);
  if (data.keyword) params.set("keyword", data.keyword);
  if (page > 1) params.set("page", String(page));

  return `/traffic/banner-clicks?${params.toString()}`;
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

export async function BannerClickLogsPage({
  filters,
}: BannerClickLogsPageProps) {
  const data = await getBannerClickLogData(filters);
  const pages = createVisiblePages(data.page, data.totalPages);
  const fromDashboard = filters?.from === "dashboard";

  return (
    <AdminLayout
      activeNav={fromDashboard ? "dashboard" : "traffic"}
      activeSubNav={fromDashboard ? undefined : "traffic-banner-clicks"}
      title="배너 클릭 전체보기"
      description="배너별 클릭자와 클릭 위치를 최신순으로 확인해요."
    >
      <section className={styles.page} aria-label="배너 클릭 전체보기">
        <AdminCard className={styles.searchCard}>
          <form className={styles.filters} action="/traffic/banner-clicks">
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
                placeholder="배너명 · 유저명 · 이메일 · 경로 · IP"
                defaultValue={data.keyword}
              />
            </label>
            <input type="hidden" name="page" value="1" />
            {fromDashboard ? (
              <input type="hidden" name="from" value="dashboard" />
            ) : null}
            <button type="submit">검색</button>
          </form>
        </AdminCard>

        <AdminCard className={styles.tableCard}>
          <div className={styles.tableTop}>
            <div>
              <h2>배너 클릭 로그</h2>
              <p>
                총 <strong>{formatCount(data.totalCount)}</strong>건 · 페이지당{" "}
                {formatCount(data.pageSize)}건
              </p>
            </div>
            <Link href={fromDashboard ? "/" : "/traffic"}>
              {fromDashboard ? "대시보드로 돌아가기" : "유입 경로 분석으로 돌아가기"}
            </Link>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>클릭일시</th>
                  <th>배너</th>
                  <th>클릭자</th>
                  <th>IP</th>
                  <th>기기</th>
                  <th>노출 위치</th>
                  <th>클릭한 화면</th>
                  <th>이동 경로</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.id}>
                      <td>{row.clickedAt}</td>
                      <td>
                        <span className={styles.bannerCell}>
                          <strong>{row.bannerName}</strong>
                          <em>{row.bannerKey}</em>
                        </span>
                      </td>
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
                      <td>{row.ipAddress}</td>
                      <td>
                        <span
                          className={`${styles.deviceBadge} ${deviceClass(row.device)}`}
                        >
                          {row.device}
                        </span>
                      </td>
                      <td>{row.placement}</td>
                      <td className={styles.pathCell} title={row.sourcePath}>
                        {row.sourcePath}
                      </td>
                      <td className={styles.pathCell} title={row.targetPath}>
                        {row.targetPath}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={styles.emptyCell} colSpan={8}>
                      조회 조건에 해당하는 배너 클릭 로그가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <nav className={styles.pagination} aria-label="배너 클릭 로그 페이지">
            <Link
              className={data.page <= 1 ? styles.disabledPage : ""}
              href={`${createQuery(data, Math.max(1, data.page - 1))}${
                fromDashboard ? "&from=dashboard" : ""
              }`}
            >
              &lt;
            </Link>
            {pages.map((page) => (
              <Link
                className={page === data.page ? styles.activePage : ""}
                href={`${createQuery(data, page)}${
                  fromDashboard ? "&from=dashboard" : ""
                }`}
                key={page}
              >
                {page}
              </Link>
            ))}
            <Link
              className={data.page >= data.totalPages ? styles.disabledPage : ""}
              href={`${createQuery(data, Math.min(data.totalPages, data.page + 1))}${
                fromDashboard ? "&from=dashboard" : ""
              }`}
            >
              &gt;
            </Link>
          </nav>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
