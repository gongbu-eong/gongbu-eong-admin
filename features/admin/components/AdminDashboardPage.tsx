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

function numberFrom(value: string | undefined) {
  return Number((value || "").replace(/[^0-9]/g, "")) || 0;
}

function percent(numerator: number, denominator: number) {
  if (!denominator) return "0%";
  const value = numerator / denominator * 100;
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}%`;
}

type SectionSummaryItem = {
  label: string;
  value: string;
  description: string;
};

function SectionSummary({ items }: { items: SectionSummaryItem[] }) {
  return (
    <dl className={styles.sectionSummary}>
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
          <dd className={styles.summaryDescription}>{item.description}</dd>
        </div>
      ))}
    </dl>
  );
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
  const visitorCount = numberFrom(commonMetrics[0]?.value);
  const newSignupCount = numberFrom(commonMetrics[1]?.value);
  const jobEntryCount = numberFrom(jobDetailMetrics[0]?.value);
  const jobApplyCount = numberFrom(jobDetailMetrics[1]?.value);
  const funnelCounts = funnelItems.map((item) => numberFrom(item.value));
  const funnelVisitCount = productHasVisitStep ? funnelCounts[0] || 0 : 0;
  const funnelStartCount = productHasVisitStep ? funnelCounts[1] || 0 : funnelCounts[0] || 0;
  const funnelCompleteCount = funnelCounts.at(-1) || 0;
  const selectedChannelVisitorCount = selectedChannelKey === "all"
    ? numberFrom(channelTotal)
    : numberFrom(channels.find((item) => item.key === selectedChannelKey)?.count);
  const screenVisitCount = numberFrom(screenInflowTotal);
  const topChannelCandidate = channels.find((item) => item.key !== "all");
  const topChannel = numberFrom(topChannelCandidate?.count) > 0 ? topChannelCandidate : undefined;
  const topScreenCandidate = screenInflows.reduce(
    (top, item) => numberFrom(item.count) > numberFrom(top?.count) ? item : top,
    screenInflows[0],
  );
  const topScreen = numberFrom(topScreenCandidate?.count) > 0 ? topScreenCandidate : undefined;
  const totalBannerClicks = numberFrom(bannerClickTotal);
  const bannerClickerSum = bannerClicks.reduce(
    (total, item) => total + numberFrom(item.uniqueCount),
    0,
  );
  const topBannerCandidate = bannerClicks.reduce(
    (top, item) => numberFrom(item.count) > numberFrom(top?.count) ? item : top,
    bannerClicks[0],
  );
  const topBanner = numberFrom(topBannerCandidate?.count) > 0 ? topBannerCandidate : undefined;
  const behaviorTotals = behaviorPatterns.reduce(
    (totals, item) => ({
      visitors: totals.visitors + numberFrom(item.visitors),
      apply: totals.apply + numberFrom(item.apply),
      move: totals.move + numberFrom(item.move),
      exit: totals.exit + numberFrom(item.exit),
      pending: totals.pending + numberFrom(item.pending),
      revisit: totals.revisit + numberFrom(item.revisit),
    }),
    { visitors: 0, apply: 0, move: 0, exit: 0, pending: 0, revisit: 0 },
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
      <section id="visit-signup" className={styles.dashboardSection} aria-label="방문·가입 흐름">
        <div className={styles.sectionHeader}>
          <div>
            <h2>방문·가입 흐름</h2>
            <p>
              조회 기간의 방문·가입·공고 상세 유입을 먼저 보고, 아래에서 일별 변화를 확인합니다.
            </p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: "방문자 대비 신규 가입",
              value: percent(newSignupCount, visitorCount),
              description: `${dashboardPeriodText}의 일별 순 방문자 합계 대비 신규 가입`,
            },
            {
              label: "방문자 대비 공고 상세 시작 방문",
              value: percent(jobEntryCount, visitorCount),
              description: "세션의 첫 화면이 공고 상세인 방문자 비율",
            },
            {
              label: "공고 상세 시작 방문 후 지원률",
              value: percent(jobApplyCount, jobEntryCount),
              description: "공고 상세로 시작해 첫 후속 결과가 지원인 방문자 비율",
            },
          ]}
        />
        <div className={styles.metrics} aria-label="방문·가입 핵심 지표">
          {[...commonMetrics, ...jobDetailMetrics].map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>
        {unidentifiedPageCount > 0 ? (
          <p role="status" className={styles.dataNotice}>
            선택 기간에 브라우저 익명 식별자가 없는 방문 {unidentifiedPageCount.toLocaleString("ko-KR")}건이 있습니다.
            화면 방문수에는 포함되지만 방문자 수·재방문자에는 포함되지 않습니다.
          </p>
        ) : null}
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

      <section id="conversion" className={styles.dashboardSection} aria-label="전환 분석">
        <div className={styles.sectionHeader}>
          <div>
            <h2>전환 분석</h2>
            <p>
              {dashboardPeriodText}의 {selectedProductLabel} 방문·시작·완료 흐름을 같은 모집단으로 비교합니다.
            </p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: productHasVisitStep ? "방문 후 시작률" : "진단 시작",
              value: productHasVisitStep
                ? percent(funnelStartCount, funnelVisitCount)
                : `${funnelStartCount.toLocaleString("ko-KR")}명`,
              description: productHasVisitStep
                ? "기능 화면 방문자 중 기능을 시작한 사람의 비율"
                : `${dashboardPeriodText}에 강점·성향 진단을 시작한 사람`,
            },
            {
              label: "시작 후 완료율",
              value: percent(funnelCompleteCount, funnelStartCount),
              description: "기능을 시작한 사람 중 완료까지 진행한 사람의 비율",
            },
            {
              label: "시작 후 미완료",
              value: `${Math.max(0, funnelStartCount - funnelCompleteCount).toLocaleString("ko-KR")}명`,
              description: "시작 기록은 있지만 완료 기록이 연결되지 않은 사람",
            },
          ]}
        />
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

      <section id="traffic-flow" className={styles.dashboardSection} aria-label="유입·행동 흐름">
        <div className={styles.sectionHeader}>
          <div>
            <h2>유입·행동 흐름</h2>
            <p>
              {selectedChannelLabel} 방문자가 어떤 화면을 얼마나 열었는지 확인합니다. 반복 방문은 모두 포함합니다.
            </p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: `${selectedChannelLabel} 화면 방문`,
              value: `${screenVisitCount.toLocaleString("ko-KR")}건`,
              description: "같은 방문자가 같은 화면을 다시 연 경우도 포함",
            },
            {
              label: "가장 많이 본 화면",
              value: topScreen?.label || "-",
              description: topScreen ? `${topScreen.count}으로 가장 많은 화면` : "조회된 화면 방문 없음",
            },
            {
              label: "방문자 1명당 화면 방문",
              value: selectedChannelVisitorCount
                ? `${(screenVisitCount / selectedChannelVisitorCount).toFixed(1)}회`
                : "0회",
              description: "일별 순 방문자 합계 대비 화면 방문 건수",
            },
          ]}
        />
        <div className={styles.sectionGrid}>
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
          <AdminCard className={styles.screenClickCard}>
            <ScreenClickList
              items={screenInflows}
              total={screenInflowTotal}
              channelLabel={selectedChannelLabel}
            />
          </AdminCard>
        </div>
      </section>

      <section id="channel-visitors" className={styles.dashboardSection} aria-label="유입 채널 순 방문자">
        <div className={styles.sectionHeader}>
          <div>
            <h2>유입 채널 순 방문자</h2>
            <p>방문자를 그날 처음 들어온 채널에 한 번만 배정해 채널별 유입 규모를 비교합니다.</p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: "조회 기간 순 방문자 합계",
              value: `${numberFrom(channelTotal).toLocaleString("ko-KR")}명`,
              description: "채널별 일별 순 방문자 합계",
            },
            {
              label: "가장 큰 유입 채널",
              value: topChannel?.label || "-",
              description: topChannel ? `${topChannel.count}으로 가장 많은 채널` : "조회된 채널 유입 없음",
            },
            {
              label: "상위 채널 비중",
              value: topChannel?.value || "0%",
              description: "전체 채널 순 방문자 중 가장 큰 채널의 비중",
            },
          ]}
        />
        <div className={styles.sectionGrid}>
          <TrendViewCard
            title="유입 채널 순 방문자 추이"
            subtitle="최근 7일 · 일별 순 방문자, 당일 최초 유입 채널"
            listSubtitle={`목록 · ${dashboardPeriodText}`}
            yLabels={trafficChannelScale.yLabels}
            series={trafficChannelTrend}
            listSeries={trafficChannelListTrend}
            maxValue={trafficChannelScale.maxValue}
            valueSuffix="명"
          />
          <AdminCard className={styles.channelCard}>
            <ChannelList
              items={channels}
              total={channelTotal}
              selectedChannel={selectedChannelKey}
            />
          </AdminCard>
        </div>
      </section>

      <section id="banner-clicks" className={styles.dashboardSection} aria-label="배너·버튼 클릭">
        <div className={styles.sectionHeader}>
          <div>
            <h2>배너·버튼 클릭</h2>
            <p>실제 클릭만 집계하며 배너 노출은 포함하지 않습니다.</p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: "전체 클릭",
              value: `${totalBannerClicks.toLocaleString("ko-KR")}건`,
              description: `${dashboardPeriodText}의 배너·버튼 실제 클릭`,
            },
            {
              label: "가장 많이 누른 항목",
              value: topBanner?.label || "-",
              description: topBanner ? `${topBanner.count}으로 가장 많은 항목` : "조회된 클릭 없음",
            },
            {
              label: "항목별 클릭자 합계",
              value: `${bannerClickerSum.toLocaleString("ko-KR")}명`,
              description: "같은 사람이 다른 항목을 누르면 항목마다 한 번씩 포함",
            },
          ]}
        />
        <div className={styles.sectionGrid}>
          <TrendViewCard
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
        </div>
      </section>

      <section id="job-entry-behavior" className={styles.dashboardSection} aria-label="공고 상세 시작 방문 후 행동">
        <div className={styles.sectionHeader}>
          <div>
            <h2>공고 상세 시작 방문 후 행동</h2>
            <p>세션의 첫 화면이 공고 상세인 방문만 지원·다른 화면 이동·이탈·판정 대기 중 첫 결과 하나로 분류합니다. 다른 화면을 먼저 본 방문은 제외합니다.</p>
          </div>
        </div>
        <SectionSummary
          items={[
            {
              label: "지원 전환율",
              value: percent(behaviorTotals.apply, behaviorTotals.visitors),
              description: "공고 상세로 시작한 방문자 중 지원이 첫 결과인 비율",
            },
            {
              label: "다른 화면 이동률",
              value: percent(behaviorTotals.move, behaviorTotals.visitors),
              description: "지원 전에 공부엉이의 다른 화면으로 이동한 비율",
            },
            {
              label: "30일 내 재방문자",
              value: `${behaviorTotals.revisit.toLocaleString("ko-KR")}명`,
              description: `${percent(behaviorTotals.revisit, behaviorTotals.visitors)} · 첫 결과 분류와 별도 집계`,
            },
          ]}
        />
        <div className={styles.sectionStack}>
          <TrendViewCard
            title="공고 상세 시작 방문 후 행동 추이"
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
