import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { BannerClickList } from "@/features/admin/components/dashboard/BannerClickList";
import { BehaviorPatternList } from "@/features/admin/components/dashboard/BehaviorPatternList";
import { ChannelList } from "@/features/admin/components/dashboard/ChannelList";
import { DashboardFilterBar } from "@/features/admin/components/dashboard/DashboardFilterBar";
import { FunnelList } from "@/features/admin/components/dashboard/FunnelList";
import { LineChart } from "@/features/admin/components/dashboard/LineChart";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { ScreenClickList } from "@/features/admin/components/dashboard/ScreenClickList";
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

type AdminDashboardPageProps = {
  selectedChannel?: string | null;
  selectedProduct?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function AdminDashboardPage({
  selectedChannel,
  selectedProduct,
  startDate,
  endDate,
}: AdminDashboardPageProps = {}) {
  const {
    channels,
    funnelItems,
    metrics,
    bannerClicks,
    bannerClickTotal,
    behaviorPatterns,
    channelTotal,
    screenInflows,
    screenInflowTotal,
    selectedChannelKey,
    selectedChannelLabel,
    selectedProductKey,
    selectedProductLabel,
    dashboardStartDate,
    dashboardEndDate,
    dashboardPeriodLabel,
    productOptions,
    productFunnelTitle,
    productFunnelDescription,
    productCompleteTrend,
    productStartTrend,
    productVisitTrend,
    productRateTrend,
    signupTrend,
    visitorTrend,
  } = await getDashboardData({
    selectedChannel,
    selectedProduct,
    startDate,
    endDate,
  });
  const visitorSignupScale = createChartScale([visitorTrend, signupTrend]);
  const productConversionScale = createChartScale([
    productVisitTrend,
    productStartTrend,
    productCompleteTrend,
  ]);
  const commonMetrics = metrics.slice(0, 2);
  const productMetrics = metrics.slice(2);
  const signupRateTrend = visitorTrend.map((point, index) => {
    const signups = signupTrend[index]?.value || 0;

    return {
      label: point.label,
      value: point.value > 0 ? (signups / point.value) * 100 : 0,
    };
  });
  const signupRateScale = createChartScale([signupRateTrend]);

  return (
    <AdminLayout
      activeNav="dashboard"
      title="대시보드"
      description="오늘의 주요 지표를 확인해보세요."
      headerActions={
        <DashboardFilterBar
          startDate={dashboardStartDate}
          endDate={dashboardEndDate}
          selectedChannel={selectedChannelKey}
          selectedProduct={selectedProductKey}
          options={productOptions}
        />
      }
    >
      <section className={styles.metrics} aria-label="주요 지표">
        {commonMetrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className={styles.insightPanel} aria-label="주요 추이">
        <div className={styles.insightHeader}>
          <div>
            <h2>오늘 흐름</h2>
            <p>방문·가입 추이와 가입 전환율을 함께 봅니다.</p>
          </div>
        </div>
        <div className={styles.chartGrid}>
          <AdminCard className={styles.chartCard}>
            <LineChart
              title="방문자 및 신규 가입 추이"
              subtitle="최근 7일"
              yLabels={visitorSignupScale.yLabels}
              legends={[
                { label: "방문자", color: "#2f7ff0" },
                { label: "전체 신규 가입", color: "#ffb000" },
              ]}
              series={[
                {
                  label: "방문자",
                  color: "#2f7ff0",
                  data: visitorTrend,
                },
                {
                  label: "전체 신규 가입",
                  color: "#ffb000",
                  data: signupTrend,
                },
              ]}
              maxValue={visitorSignupScale.maxValue}
            />
          </AdminCard>
          <AdminCard className={styles.chartCard}>
            <LineChart
              title="가입 전환율 추이"
              subtitle="최근 7일 · 방문자 대비 신규 가입"
              yLabels={signupRateScale.yLabels.map((label) => `${label}%`)}
              legends={[
                { label: "가입 전환율", color: "#20bf7a" },
              ]}
              series={[
                {
                  label: "가입 전환율",
                  color: "#20bf7a",
                  data: signupRateTrend,
                },
              ]}
              maxValue={signupRateScale.maxValue}
              valueSuffix="%"
            />
          </AdminCard>
        </div>
      </section>

      <section className={styles.analysisPanel} aria-label="전환 분석">
        <div className={styles.analysisHeader}>
          <div>
            <h2>전환 분석</h2>
            <p>
              선택한 기간({dashboardPeriodLabel})의 전환, 유입, 클릭 대상자
              목록을 확인합니다.
            </p>
          </div>
        </div>
        <div className={styles.productMetrics}>
          {productMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
        <div className={styles.analysisGrid}>
          <AdminCard className={styles.chartCard}>
            <LineChart
              title={`${selectedProductLabel} 전환 추이`}
              subtitle="최근 7일 · 방문 / 시작 / 완료"
              yLabels={productConversionScale.yLabels}
              legends={[
                { label: "방문", color: "#2f7ff0" },
                { label: "시작", color: "#ffb000" },
                { label: "완료", color: "#20bf7a" },
              ]}
              series={[
                {
                  label: "방문",
                  color: "#2f7ff0",
                  data: productVisitTrend,
                },
                {
                  label: "시작",
                  color: "#ffb000",
                  data: productStartTrend,
                },
                {
                  label: "완료",
                  color: "#20bf7a",
                  data: productCompleteTrend.length
                    ? productCompleteTrend
                    : productRateTrend,
                },
              ]}
              maxValue={productConversionScale.maxValue}
            />
          </AdminCard>
          <AdminCard className={styles.funnelCard}>
            <FunnelList
              items={funnelItems}
              title={productFunnelTitle}
              description={`${productFunnelDescription} 항목을 누르면 대상자 목록을 확인합니다.`}
              productLabel={selectedProductLabel}
            />
          </AdminCard>
        </div>
      </section>

      <section className={styles.lowerGrid}>
        <AdminCard className={styles.channelCard}>
          <ChannelList
            items={channels}
            total={channelTotal}
            selectedChannel={selectedChannelKey}
          />
        </AdminCard>
        <AdminCard className={styles.screenClickCard}>
          <ScreenClickList
            items={screenInflows}
            total={screenInflowTotal}
            channelLabel={selectedChannelLabel}
          />
        </AdminCard>
        <AdminCard className={styles.bannerCard}>
          <BannerClickList items={bannerClicks} total={bannerClickTotal} />
        </AdminCard>
        <AdminCard className={styles.behaviorCard}>
          <BehaviorPatternList
            items={behaviorPatterns}
            periodLabel={dashboardPeriodLabel}
          />
        </AdminCard>
      </section>
    </AdminLayout>
  );
}
