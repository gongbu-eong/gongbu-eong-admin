import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { LineChart } from "@/features/admin/components/dashboard/LineChart";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { getTrafficData } from "@/features/admin/server/traffic.repository";
import { TrafficQuery } from "@/features/admin/data/traffic";
import type { CSSProperties } from "react";
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

function createDailyGridStyle(metricCount: number) {
  return { "--metric-columns": metricCount } as CSSProperties;
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
      title="유입 채널 상세"
      description="대시보드의 최근 7일 요약을 기간별 채널 목록으로 확인합니다."
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
              <h2>유입 채널별 순방문자</h2>
              <p>중복 방문과 페이지 이동은 제외하고 최초 유입 채널만 집계합니다.</p>
            </div>
            <div
              className={styles.donut}
              style={{ background: createDonutGradient(data.channels) }}
              aria-label={`전체 순방문자 ${formatCount(data.totalVisitors)}명`}
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
                      ({formatCount(channel.count)}명)
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
              title="채널별 순방문자 추이"
              subtitle="일별 순방문자 · 중복 방문과 페이지 이동 제외"
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
            <h2>채널별 순방문자</h2>
          </div>
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span>채널</span>
              <span>방문자 수</span>
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
                  <span>{formatCount(channel.count)}명</span>
                  <span>{formatPercent(channel.percent)}</span>
                  <span className={isUp ? styles.up : styles.down}>
                    {isUp ? "▲" : "▼"} {formatPercent(Math.abs(channel.deltaPercent))}
                  </span>
                </div>
              );
            })}
            <div className={styles.totalRow}>
              <span>합계</span>
              <span>{formatCount(data.totalVisitors)}명</span>
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

        <AdminCard className={styles.dailyDetailCard}>
          <div className={styles.dailyHeader}>
            <h2>날짜별 순방문자 채널</h2>
            <p>{data.periodValue} 기준</p>
          </div>
          <div className={styles.dailyTable}>
            <div
              className={styles.dailyTableHeader}
              style={createDailyGridStyle(data.trendSeries.length)}
            >
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
              <div
                className={styles.dailyTableRow}
                key={row.date}
                style={createDailyGridStyle(data.trendSeries.length)}
              >
                <span>{row.date}</span>
                {data.trendSeries.map((series) => (
                  <span key={series.label}>
                    {formatCount(row.counts[series.label] || 0)}명
                  </span>
                ))}
                <strong>{formatCount(row.total)}명</strong>
              </div>
            ))}
          </div>
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
