import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { BannerClickList } from "@/features/admin/components/dashboard/BannerClickList";
import { ChannelList } from "@/features/admin/components/dashboard/ChannelList";
import { FunnelList } from "@/features/admin/components/dashboard/FunnelList";
import { LineChart } from "@/features/admin/components/dashboard/LineChart";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { WorkList } from "@/features/admin/components/dashboard/WorkList";
import type { LinePoint } from "@/features/admin/data/dashboard";
import { getDashboardData } from "@/features/admin/server/dashboard.repository";
import styles from "./AdminDashboardPage.module.css";

function createChartScale(series: LinePoint[][]) {
  const maxPointValue = Math.max(
    ...series.flatMap((points) => points.map((point) => point.value)),
    0,
  );
  const paddedMax = Math.max(1, maxPointValue * 1.15);
  const step = getNiceStep(paddedMax / 4);
  const maxValue = step * 4;

  return {
    maxValue,
    yLabels: Array.from({ length: 5 }, (_, index) =>
      Math.round(maxValue - step * index).toLocaleString("ko-KR"),
    ),
  };
}

function getNiceStep(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  const normalized = value / magnitude;
  const niceNormalized =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;

  return niceNormalized * magnitude;
}

export async function AdminDashboardPage() {
  const {
    channels,
    diagnosisTrend,
    funnelItems,
    metrics,
    bannerClicks,
    bannerClickTotal,
    channelTotal,
    signupTrend,
    visitorTrend,
    workItems,
  } = await getDashboardData();
  const visitorScale = createChartScale([visitorTrend]);
  const diagnosisSignupScale = createChartScale([diagnosisTrend, signupTrend]);

  return (
    <AdminLayout
      activeNav="dashboard"
      title="대시보드"
      description="오늘의 주요 지표를 확인해보세요."
    >
      <section className={styles.metrics} aria-label="주요 지표">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className={styles.chartGrid}>
        <AdminCard className={styles.chartCard}>
          <LineChart
            title="방문자 추이"
            subtitle="최근 7일"
            yLabels={visitorScale.yLabels}
            series={[
              {
                label: "방문자",
                color: "#2f7ff0",
                data: visitorTrend,
              },
            ]}
            maxValue={visitorScale.maxValue}
          />
        </AdminCard>
        <AdminCard className={styles.chartCard}>
          <LineChart
            title="진단 수행 · 신규 가입"
            subtitle="최근 7일"
            yLabels={diagnosisSignupScale.yLabels}
            legends={[
              { label: "진단 수행", color: "#20bf7a" },
              { label: "신규 가입", color: "#ffb000" },
            ]}
            series={[
              {
                label: "진단 수행",
                color: "#20bf7a",
                data: diagnosisTrend,
              },
              {
                label: "신규 가입",
                color: "#ffb000",
                data: signupTrend,
              },
            ]}
            maxValue={diagnosisSignupScale.maxValue}
          />
        </AdminCard>
      </section>

      <section className={styles.lowerGrid}>
        <AdminCard className={styles.funnelCard}>
          <FunnelList items={funnelItems} />
        </AdminCard>
        <AdminCard className={styles.channelCard}>
          <ChannelList items={channels} total={channelTotal} />
        </AdminCard>
        <AdminCard className={styles.workCard}>
          <WorkList items={workItems} />
        </AdminCard>
        <AdminCard className={styles.bannerCard}>
          <BannerClickList items={bannerClicks} total={bannerClickTotal} />
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
