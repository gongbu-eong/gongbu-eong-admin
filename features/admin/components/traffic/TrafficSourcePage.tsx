import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { LineChart } from "@/features/admin/components/dashboard/LineChart";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { getTrafficData } from "@/features/admin/server/traffic.repository";
import { TrafficQuery } from "@/features/admin/data/traffic";
import { TrafficFilters } from "./TrafficFilters";
import styles from "./TrafficSourcePage.module.css";

function formatCount(value: number) {
  return value.toLocaleString("ko-KR");
}

function formatPercent(value: number) {
  return `${value.toLocaleString("ko-KR", {
    maximumFractionDigits: 1,
  })}%`;
}

function createDonutGradient(channels: Awaited<ReturnType<typeof getTrafficData>>["channels"]) {
  if (!channels.some((channel) => channel.count > 0)) {
    return "conic-gradient(#e4e8ef 0deg 360deg)";
  }

  let cursor = 0;
  const stops = channels.map((channel) => {
    const start = cursor;
    const end = cursor + channel.percent * 3.6;
    cursor = end;
    return `${channel.color} ${start}deg ${end}deg`;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

type TrafficSourcePageProps = {
  filters?: TrafficQuery;
};

export async function TrafficSourcePage({ filters }: TrafficSourcePageProps) {
  const data = await getTrafficData(filters);
  const maxChannelCount = Math.max(...data.channels.map((channel) => channel.count), 1);

  return (
    <AdminLayout
      activeNav="traffic"
      activeSubNav="traffic-source"
      title="유입 경로 분석"
      description="유입·트래픽 · 유입 경로 분석"
    >
      <section className={styles.page} aria-label="유입 경로 분석">
        <TrafficFilters
          preset={data.preset}
          startDate={data.startDate}
          endDate={data.endDate}
        />

        <div className={styles.periodPill}>
          <span>조회 기간:&nbsp;</span>
          <strong>{data.periodValue}</strong>
        </div>

        <section className={styles.metrics} aria-label="유입 주요 지표">
          {data.metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        <section className={styles.chartGrid}>
          <AdminCard className={styles.distributionCard}>
            <div className={styles.cardTitle}>
              <h2>채널별 분포</h2>
              <p>비중(도넛)과 유입량(막대)을 함께 확인</p>
            </div>
            <div
              className={styles.donut}
              style={{ background: createDonutGradient(data.channels) }}
              aria-label={`전체 ${formatCount(data.totalVisitors)}건`}
            >
              <div>
                <span>전체</span>
                <strong>{formatCount(data.totalVisitors)}</strong>
              </div>
            </div>
            <div className={styles.channelBars}>
              {data.channels.map((channel) => (
                <div className={styles.channelBar} key={channel.label}>
                  <div className={styles.channelBarHead}>
                    <strong>{channel.label}</strong>
                    <span>
                      <b>{formatPercent(channel.percent)}</b>
                      ({formatCount(channel.count)}건)
                    </span>
                  </div>
                  <div className={styles.barTrack}>
                    <i
                      style={{
                        width: `${Math.max(1, (channel.count / maxChannelCount) * 100)}%`,
                        backgroundColor: channel.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard className={styles.trendCard}>
            <LineChart
              title="채널별 유입 추이"
              subtitle="최근 7일 기준 · 채널별 유입 흐름"
              yLabels={data.yLabels}
              legends={data.trendSeries.map((series) => ({
                label: series.label,
                color: series.color,
              }))}
              series={data.trendSeries}
              maxValue={data.maxValue}
            />
          </AdminCard>
        </section>

        <AdminCard className={styles.detailCard}>
          <div className={styles.detailHeader}>
            <h2>채널별 상세</h2>
          </div>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>채널</span>
              <span>유입량</span>
              <span>비중</span>
              <span>지난 기간 대비</span>
            </div>
            {data.channels.map((channel) => {
              const isUp = channel.deltaPercent >= 0;

              return (
                <div className={styles.tableRow} key={channel.label}>
                  <span className={styles.channelCell}>
                    <i style={{ backgroundColor: channel.color }} />
                    {channel.label}
                  </span>
                  <span>{formatCount(channel.count)}건</span>
                  <span>{formatPercent(channel.percent)}</span>
                  <span className={isUp ? styles.up : styles.down}>
                    {isUp ? "▲" : "▼"} {formatPercent(Math.abs(channel.deltaPercent))}
                  </span>
                </div>
              );
            })}
            <div className={styles.totalRow}>
              <span>합계</span>
              <span>{formatCount(data.totalVisitors)}건</span>
              <span>{data.totalVisitors > 0 ? "100%" : "0%"}</span>
              <span
                className={
                  data.metrics[0]?.trend === "up" ? styles.up : styles.down
                }
              >
                {data.metrics[0]?.delta.replace(" 지난 기간 대비", "")}
              </span>
            </div>
          </div>
        </AdminCard>

        <AdminCard className={styles.bannerClickCard}>
          <div className={styles.bannerClickHeader}>
            <h2>배너/버튼 클릭</h2>
            <p>{data.periodValue} 기준</p>
          </div>
          {data.bannerClicks.length ? (
            <div className={styles.bannerClickTable}>
              <div className={styles.bannerClickTableHeader}>
                <span>항목</span>
                <span>클릭</span>
                <span>고유 클릭</span>
              </div>
              {data.bannerClicks.map((banner) => (
                <div className={styles.bannerClickTableRow} key={banner.key}>
                  <span>{banner.label}</span>
                  <strong>{formatCount(banner.clicks)}건</strong>
                  <span>{formatCount(banner.uniqueClicks)}명</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyBannerClick}>
              조회 기간에 기록된 클릭이 없습니다.
            </div>
          )}
        </AdminCard>

        <AdminCard className={styles.dailyDetailCard}>
          <div className={styles.dailyHeader}>
            <h2>날짜별 채널 상세</h2>
            <p>{data.periodValue} 기준</p>
          </div>
          <div className={styles.dailyTable}>
            <div className={styles.dailyTableHeader}>
              <span>날짜</span>
              {data.trendSeries.map((series) => (
                <span key={series.label}>
                  <i style={{ backgroundColor: series.color }} />
                  {series.label}
                </span>
              ))}
              <span>합계</span>
            </div>
            {data.dailyRows.map((row) => (
              <div className={styles.dailyTableRow} key={row.date}>
                <span>{row.date}</span>
                {data.trendSeries.map((series) => (
                  <span key={series.label}>
                    {formatCount(row.counts[series.label] || 0)}건
                  </span>
                ))}
                <strong>{formatCount(row.total)}건</strong>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
