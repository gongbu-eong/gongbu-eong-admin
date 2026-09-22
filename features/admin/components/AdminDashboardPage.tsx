import { AdminLayout } from "@/features/admin/components/AdminLayout";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import { BannerClickList } from "@/features/admin/components/dashboard/BannerClickList";
import { BehaviorPatternList } from "@/features/admin/components/dashboard/BehaviorPatternList";
import { ChannelList } from "@/features/admin/components/dashboard/ChannelList";
import { DashboardFilterBar } from "@/features/admin/components/dashboard/DashboardFilterBar";
import { FunnelList } from "@/features/admin/components/dashboard/FunnelList";
import { MetricCard } from "@/features/admin/components/dashboard/MetricCard";
import { ScreenClickList } from "@/features/admin/components/dashboard/ScreenClickList";
import { TrendViewCard } from "@/features/admin/components/dashboard/TrendViewCard";
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
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
};

export async function AdminDashboardPage({
  selectedChannel,
  selectedProduct,
  period,
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
    dashboardPreset,
    dashboardStartDate,
    dashboardEndDate,
    dashboardPeriodLabel,
    dashboardPeriodText,
    productOptions,
    productFunnelTitle,
    productFunnelDescription,
    productCompleteTrend,
    productConversionTrend,
    productConversionListTrend,
    productStartTrend,
    productVisitTrend,
    productHasVisitStep,
    signupTrend,
    newSignupTrend,
    visitorTrend,
    visitorSignupListTrend,
    trafficChannelTrend,
    trafficChannelListTrend,
    screenTrend,
    screenListTrend,
    bannerClickTrend,
    bannerClickListTrend,
    jobDetailBehaviorTrend,
    jobDetailBehaviorListTrend,
    unidentifiedPageCount,
    unidentifiedStartCount,
    unmatchedCompletionCount,
  } = await getDashboardData({
    period,
    selectedChannel,
    selectedProduct,
    startDate,
    endDate,
  });
  const visitorSignupScale = createChartScale([visitorTrend]);
  const productConversionSeries = productHasVisitStep
    ? [productVisitTrend, productStartTrend, productCompleteTrend]
    : [productStartTrend, productCompleteTrend];
  const productConversionScale = createChartScale(productConversionSeries);
  const commonMetrics = metrics.slice(0, 2);
  const productMetrics = metrics.slice(2);
  const signupCountScale = createChartScale([signupTrend, newSignupTrend]);
  const trafficChannelScale = createChartScale(
    trafficChannelTrend.map((series) => series.data),
  );
  const screenScale = createChartScale(
    screenTrend.map((series) => series.data),
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
      description="주요 지표와 유입·사용자 행동을 한 곳에서 확인해보세요."
      headerActions={
        <DashboardFilterBar
          key={`${dashboardPreset}-${dashboardStartDate}-${dashboardEndDate}`}
          startDate={dashboardStartDate}
          endDate={dashboardEndDate}
          preset={dashboardPreset}
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
      {unidentifiedPageCount > 0 ? (
        <p role="status" className={styles.dataNotice}>
          선택 기간에 브라우저 익명 식별자가 없는 방문 {unidentifiedPageCount.toLocaleString("ko-KR")}건이 있습니다.
          화면 방문수에는 포함되지만 방문자 수·재방문자에는 포함되지 않습니다.
        </p>
      ) : null}

      <section id="visit-signup" className={styles.insightPanel} aria-label="주요 추이">
        <div className={styles.insightHeader}>
          <div>
            <h2>방문·가입 흐름</h2>
            <p>
              그래프는 최근 7일, 목록은 {dashboardPeriodText} 기준으로 봅니다.
            </p>
          </div>
        </div>
        <div className={styles.chartGrid}>
          <TrendViewCard
              title="일별 방문자 추이"
              subtitle="최근 7일 · 브라우저 익명 ID 기준 일별 순 방문자"
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={visitorSignupScale.yLabels}
              listSeries={visitorSignupListTrend.slice(0, 1)}
              valueSuffix="명"
              series={[
                {
                  label: "방문자",
                  color: "#2f7ff0",
                  data: visitorTrend,
                },
              ]}
              maxValue={visitorSignupScale.maxValue}
          />
          <TrendViewCard
              title="전체 가입자 및 신규 가입자 추이"
              subtitle="최근 7일 · 초록색 누적 전체 가입자 / 노란색 일별 신규 가입자"
              valueSuffix="명"
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={signupCountScale.yLabels}
              listSeries={visitorSignupListTrend.slice(1)}
              series={[
                {
                  label: "전체 가입자",
                  color: "#20bf7a",
                  data: signupTrend,
                },
                {
                  label: "신규 가입자",
                  color: "#ffb000",
                  data: newSignupTrend,
                },
              ]}
              maxValue={signupCountScale.maxValue}
          />
        </div>
      </section>

      <section id="conversion" className={styles.analysisPanel} aria-label="전환 분석">
        <div className={styles.analysisHeader}>
          <div>
            <h2>전환 분석</h2>
            <p>
              선택한 기간({dashboardPeriodText})의 전환, 유입, 클릭 대상자
              목록을 확인합니다.
            </p>
          </div>
        </div>
        <div className={styles.productMetrics}>
          {productMetrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
        {unidentifiedStartCount > 0 ? (
          <p role="status" className={styles.dataNotice}>
            브라우저 익명 식별자가 없는 시작 기록 {unidentifiedStartCount.toLocaleString("ko-KR")}건은 전환 인원 집계에서 제외했습니다.
            시작 기록의 익명 식별자 수집 상태를 확인해야 합니다.
          </p>
        ) : null}
        {unmatchedCompletionCount > 0 ? (
          <p role="status" className={styles.dataNotice}>
            시작 기록과 연결할 수 없는 진단 완료 {unmatchedCompletionCount.toLocaleString("ko-KR")}건은 전환 퍼널에서 제외했습니다.
            누락된 시작을 임의로 생성하지 않습니다.
          </p>
        ) : null}
        <div className={styles.analysisGrid}>
          <TrendViewCard
              title={`${selectedProductLabel} 전환 추이`}
              subtitle={
                productHasVisitStep
                  ? "최근 7일 · 방문일 / 시작일 기준 시작·완료 인원"
                  : "최근 7일 · 시작일 기준 진단 시작 / 진단 완료 인원"
              }
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={productConversionScale.yLabels}
              series={productConversionTrend}
              listSeries={productConversionListTrend}
              maxValue={productConversionScale.maxValue}
              valueSuffix="명"
          />
          <AdminCard className={styles.funnelCard}>
            <FunnelList
              items={funnelItems}
              title={productFunnelTitle}
              description={`${dashboardPeriodText} · ${productFunnelDescription}`}
              productLabel={selectedProductLabel}
            />
          </AdminCard>
        </div>
      </section>

      <section
        id="traffic-flow"
        className={styles.trafficInsightPanel}
        aria-label="최근 7일 유입과 행동 추이"
      >
        <div className={styles.insightHeader}>
          <div>
            <h2>유입·행동 흐름</h2>
            <p>
              그래프는 최근 7일, 목록은 {dashboardPeriodText} 기준입니다.
            </p>
          </div>
        </div>
        <div className={styles.channelInsight}>
          <div className={styles.channelChartGrid}>
            <TrendViewCard
              id="channel-visitors"
              title="유입 채널 순 방문자 추이"
              subtitle="최근 7일 · 일별 순 방문자, 당일 최초 유입 채널"
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={trafficChannelScale.yLabels}
              series={trafficChannelTrend}
              listSeries={trafficChannelListTrend}
              maxValue={trafficChannelScale.maxValue}
              valueSuffix="명"
            />
            <TrendViewCard
              title="화면별 방문수 추이"
              titleNote="로그 건수 · 중복 포함"
              subtitle={`최근 7일 · ${selectedChannelLabel} · 순 방문자가 아닌 페이지 방문 건수`}
              listSubtitle={`목록 · ${dashboardPeriodText} · ${selectedChannelLabel}`}
              yLabels={screenScale.yLabels}
              series={screenTrend}
              listSeries={screenListTrend}
              maxValue={screenScale.maxValue}
              valueSuffix="건"
            />
          </div>
          <div className={styles.channelDetailGrid}>
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
          </div>
        </div>
        <div className={styles.trafficPairGrid}>
          <TrendViewCard
              id="banner-clicks"
              title="배너·버튼 클릭 추이"
              subtitle="최근 7일 · 전체 클릭 / 찜 / 지원 (모두 건수)"
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={bannerClickScale.yLabels}
              series={bannerClickTrend}
              listSeries={bannerClickListTrend}
              maxValue={bannerClickScale.maxValue}
          />
          <AdminCard className={styles.bannerCard}>
            <BannerClickList items={bannerClicks} total={bannerClickTotal} periodLabel={dashboardPeriodText} />
          </AdminCard>
          <TrendViewCard
            id="job-entry-behavior"
            className={styles.behaviorTrendCard}
              title="공고 상세 첫 유입 후 행동 추이"
              subtitle="최근 7일 · 공고 상세로 시작한 세션을 첫 결과별로 분류 (모두 명수)"
              listSubtitle={`목록 · ${dashboardPeriodText}`}
              yLabels={jobDetailBehaviorScale.yLabels}
              series={jobDetailBehaviorTrend}
              listSeries={jobDetailBehaviorListTrend}
              maxValue={jobDetailBehaviorScale.maxValue}
          />
          <AdminCard className={styles.behaviorCard}>
          <BehaviorPatternList
            items={behaviorPatterns}
            periodLabel={dashboardPeriodLabel}
          />
          </AdminCard>
        </div>
      </section>
    </AdminLayout>
  );
}
