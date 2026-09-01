import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { ChannelList } from "@/features/admin/components/dashboard/ChannelList";
import { FunnelList } from "@/features/admin/components/dashboard/FunnelList";
import { LineChart } from "@/features/admin/components/dashboard/LineChart";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { WorkList } from "@/features/admin/components/dashboard/WorkList";
import { getDashboardData } from "@/features/admin/server/dashboard.repository";
import styles from "./AdminDashboardPage.module.css";

export async function AdminDashboardPage() {
  const {
    channels,
    diagnosisTrend,
    funnelItems,
    metrics,
    channelTotal,
    signupTrend,
    visitorTrend,
    workItems,
  } = await getDashboardData();

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
            yLabels={["1,600", "1,200", "800", "400", "0"]}
            series={[
              {
                label: "방문자",
                color: "#2f7ff0",
                data: visitorTrend,
              },
            ]}
            maxValue={1600}
          />
        </AdminCard>
        <AdminCard className={styles.chartCard}>
          <LineChart
            title="진단 수행 · 신규 가입"
            subtitle="최근 7일"
            yLabels={["400", "300", "200", "100", "0"]}
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
            maxValue={400}
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
      </section>
    </AdminLayout>
  );
}
