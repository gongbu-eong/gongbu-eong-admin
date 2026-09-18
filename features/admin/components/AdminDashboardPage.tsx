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
    jobDetailMetrics,
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
    productHasVisitStep,
    signupTrend,
    visitorTrend,
    trafficChannelTrend,
    bannerClickTrend,
    jobDetailBehaviorTrend,
  } = await getDashboardData({
    selectedChannel,
    selectedProduct,
    startDate,
    endDate,
  });
  const visitorSignupScale = createChartScale([visitorTrend, signupTrend]);
  const productConversionSeries = productHasVisitStep
    ? [productVisitTrend, productStartTrend, productCompleteTrend]
    : [productStartTrend, productCompleteTrend];
  const productConversionScale = createChartScale(productConversionSeries);
  const commonMetrics = metrics.slice(0, 2);
  const productMetrics = metrics.slice(2);
  const signupCountScale = createChartScale([signupTrend]);
  const trafficChannelScale = createChartScale(
    trafficChannelTrend.map((series) => series.data),
  );
  const bannerClickScale = createChartScale(
    bannerClickTrend.map((series) => series.data),
  );
  const jobDetailBehaviorScale = createChartScale(
    jobDetailBehaviorTrend.map((series) => series.data),
  );

  return (
    <AdminLayout
      activeNav="dashboard"
      title="대시보드"
      description="최근 7일의 주요 지표와 사용자 행동을 확인해보세요."
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
        {[...commonMetrics, ...jobDetailMetrics].map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      <section className={styles.insightPanel} aria-label="주요 추이">
        <div className={styles.insightHeader}>
          <div>
            <h2>방문·가입 흐름</h2>
            <p>최근 7일 방문 추이와 신규 가입자 수를 함께 봅니다.</p>
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
              title="신규 가입자 추이"
              subtitle="최근 7일 · 가입 완료 회원 수"
              yLabels={signupCountScale.yLabels}
              legends={[{ label: "가입자", color: "#20bf7a" }]}
              series={[
                {
                  label: "가입자",
                  color: "#20bf7a",
                  data: signupTrend,
                },
              ]}
              maxValue={signupCountScale.maxValue}
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
              subtitle={
                productHasVisitStep
                  ? "최근 7일 · 방문 / 시작 / 완료"
                  : "최근 7일 · 진단 시작 / 진단 완료"
              }
              yLabels={productConversionScale.yLabels}
              legends={
                productHasVisitStep
                  ? [
                      { label: "방문", color: "#2f7ff0" },
                      { label: "시작", color: "#ffb000" },
                      { label: "완료", color: "#20bf7a" },
                    ]
                  : [
                      { label: "진단 시작", color: "#ffb000" },
                      { label: "진단 완료", color: "#20bf7a" },
                    ]
              }
              series={
                productHasVisitStep
                  ? [
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
                    ]
                  : [
                      {
                        label: "진단 시작",
                        color: "#ffb000",
                        data: productStartTrend,
                      },
                      {
                        label: "진단 완료",
                        color: "#20bf7a",
                        data: productCompleteTrend.length
                          ? productCompleteTrend
                          : productRateTrend,
                      },
                    ]
              }
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

      <section
        className={styles.trafficInsightPanel}
        aria-label="최근 7일 유입과 행동 추이"
      >
        <div className={styles.insightHeader}>
          <div>
            <h2>최근 7일 유입·행동 흐름</h2>
            <p>
              순방문자와 실제 클릭을 분리해 공고 상세 이후의 흐름을 확인합니다.
            </p>
          </div>
        </div>
        <div className={styles.trafficTrendGrid}>
          <AdminCard className={styles.trafficTrendCard}>
            <LineChart
              title="유입 채널 순방문자"
              subtitle="최근 7일 · 같은 방문자 중복 제외"
              yLabels={trafficChannelScale.yLabels}
              legends={trafficChannelTrend.map((series) => ({
                label: series.label,
                color: series.color,
              }))}
              series={trafficChannelTrend}
              maxValue={trafficChannelScale.maxValue}
              valueSuffix="명"
            />
          </AdminCard>
          <AdminCard className={styles.trafficTrendCard}>
            <LineChart
              title="배너·버튼 클릭"
              subtitle="최근 7일 · 전체 클릭 / 찜 / 지원"
              yLabels={bannerClickScale.yLabels}
              legends={bannerClickTrend.map((series) => ({
                label: series.label,
                color: series.color,
              }))}
              series={bannerClickTrend}
              maxValue={bannerClickScale.maxValue}
            />
          </AdminCard>
          <AdminCard
            className={`${styles.trafficTrendCard} ${styles.behaviorTrendCard}`}
          >
            <LineChart
              title="공고 상세 방문 후 행동"
              subtitle="최근 7일 · 방문자 / 후속 행동 / 찜 / 지원"
              yLabels={jobDetailBehaviorScale.yLabels}
              legends={jobDetailBehaviorTrend.map((series) => ({
                label: series.label,
                color: series.color,
              }))}
              series={jobDetailBehaviorTrend}
              maxValue={jobDetailBehaviorScale.maxValue}
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
