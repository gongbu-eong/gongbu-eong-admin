import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { TrafficQuery } from "@/features/admin/data/traffic";
import { getCampaignPerformanceData } from "@/features/admin/server/traffic.repository";
import { TrafficFilters } from "./TrafficFilters";
import styles from "./TrafficCampaignsPage.module.css";

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

type TrafficCampaignsPageProps = {
  filters?: TrafficQuery;
};

export async function TrafficCampaignsPage({
  filters,
}: TrafficCampaignsPageProps) {
  const data = await getCampaignPerformanceData(filters);

  return (
    <AdminLayout
      activeNav="traffic"
      activeSubNav="traffic-campaigns"
      title="캠페인·링크별 성과"
      description="유입·트래픽 · 캠페인·링크별 성과"
    >
      <section className={styles.page} aria-label="캠페인·링크별 성과">
        <TrafficFilters
          preset={data.preset}
          startDate={data.startDate}
          endDate={data.endDate}
          createButton
        />

        <div className={styles.periodPill}>
          <span>조회 기간:&nbsp;</span>
          <strong>{data.periodValue}</strong>
        </div>

        <section className={styles.metrics} aria-label="캠페인 주요 지표">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <AdminCard className={styles.tableCard}>
          <div className={styles.tableHeaderBlock}>
            <h2>캠페인·링크별 성과</h2>
            <p>저장된 UTM 캠페인과 링크 기준으로 유입부터 전환까지 확인</p>
          </div>
          <div className={styles.summary}>
            전체 캠페인 유입 <strong>{formatCount(data.totalVisitors)}명</strong>
          </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>캠페인</th>
                <th>링크</th>
                <th>채널</th>
                <th>매체</th>
                <th>유입량</th>
                <th>진단 시작</th>
                <th>진단 완료</th>
                <th>신규 가입</th>
                <th>완료율</th>
                <th>마지막 유입</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length > 0 ? (
                data.rows.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.nameCell}>{row.campaign}</td>
                    <td className={styles.linkCell}>{row.link}</td>
                    <td>{row.source}</td>
                    <td>{row.medium}</td>
                    <td>{formatCount(row.visitors)}명</td>
                    <td>{formatCount(row.diagnosisStarts)}건</td>
                    <td>{formatCount(row.diagnosisCompletes)}건</td>
                    <td>{formatCount(row.signups)}명</td>
                    <td>{formatPercent(row.conversionRate)}</td>
                    <td>{row.lastSeenAt}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className={styles.emptyCell}>
                    조회 기간에 표시할 캠페인 데이터가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
