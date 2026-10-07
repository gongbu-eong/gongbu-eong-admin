"use client";

import { useMemo, useState } from "react";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import type {
  BannerClickItem,
  BannerPlacementOption,
  DashboardTrendSeries,
  LinePoint,
} from "@/features/admin/data/dashboard";
import { BannerClickList } from "./BannerClickList";
import { TrendViewCard } from "./TrendViewCard";
import pageStyles from "../AdminDashboardPage.module.css";
import styles from "./BannerClickSection.module.css";

type Props = {
  items: BannerClickItem[];
  placementOptions: BannerPlacementOption[];
  trend: DashboardTrendSeries[];
  listTrend: DashboardTrendSeries[];
  periodText: string;
};

function numberFrom(value: string | undefined) {
  return Number((value || "").replace(/[^0-9]/g, "")) || 0;
}

function createChartScale(series: LinePoint[][]) {
  const maxPointValue = Math.max(
    ...series.flatMap((points) => points.map((point) => point.value)),
    0,
  );
  const paddedMax = Math.max(1, maxPointValue * 1.15);
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(paddedMax / 4, 1)));
  const normalized = paddedMax / 4 / magnitude;
  const niceNormalized = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = niceNormalized * magnitude;
  const maxValue = step * 4;

  return {
    maxValue,
    yLabels: Array.from({ length: 5 }, (_, index) =>
      Math.round(maxValue - step * index).toLocaleString("ko-KR"),
    ),
  };
}

function filterTrend(
  series: DashboardTrendSeries[],
  bannerKeys: Set<string>,
  selectedPlacement: string,
) {
  if (selectedPlacement === "all") return series;

  const detailSeries = series.filter((item) => {
    const key = item.key?.replace(/^banner:/, "") || "";
    return key !== "total" && bannerKeys.has(key);
  });
  const originalTotal = series.find((item) => item.key === "banner:total");
  const labels = originalTotal?.data.map((point) => point.label)
    || detailSeries[0]?.data.map((point) => point.label)
    || [];
  const total: DashboardTrendSeries = {
    key: "banner:total",
    label: "전체 클릭",
    color: "#2f7ff0",
    valueSuffix: "건",
    data: labels.map((label, index) => ({
      label,
      value: detailSeries.reduce((sum, item) => sum + (item.data[index]?.value || 0), 0),
    })),
  };

  return [total, ...detailSeries];
}

export function BannerClickSection({
  items,
  placementOptions,
  trend,
  listTrend,
  periodText,
}: Props) {
  const [selectedPlacement, setSelectedPlacement] = useState("all");
  const selectedPlacementLabel = selectedPlacement === "all"
    ? "전체"
    : placementOptions.find((item) => item.key === selectedPlacement)?.label || selectedPlacement;
  const filteredItems = useMemo(
    () => items.filter((item) => selectedPlacement === "all" || item.placement === selectedPlacement),
    [items, selectedPlacement],
  );
  const maxClickCount = Math.max(...filteredItems.map((item) => numberFrom(item.count)), 1);
  const displayItems = filteredItems.map((item) => ({
    ...item,
    fill: numberFrom(item.count) / maxClickCount * 100,
  }));
  const bannerKeys = new Set(filteredItems.map((item) => item.key));
  const displayTrend = filterTrend(trend, bannerKeys, selectedPlacement);
  const displayListTrend = filterTrend(listTrend, bannerKeys, selectedPlacement);
  const scale = createChartScale(displayTrend.map((item) => item.data));
  const totalClicks = filteredItems.reduce((sum, item) => sum + numberFrom(item.count), 0);
  const clickerSum = filteredItems.reduce((sum, item) => sum + numberFrom(item.uniqueCount), 0);
  const topBanner = filteredItems.reduce<BannerClickItem | undefined>(
    (top, item) => numberFrom(item.count) > numberFrom(top?.count) ? item : top,
    undefined,
  );

  return (
    <section id="banner-clicks" className={pageStyles.dashboardSection} aria-label="배너·버튼 클릭">
      <div className={pageStyles.sectionHeader}>
        <div>
          <h2>배너·버튼 클릭</h2>
          <p>배너 ID로 구분한 실제 클릭이며 배너 노출은 포함하지 않습니다.</p>
        </div>
        <label className={styles.placementFilter}>
          <span>노출 화면</span>
          <select value={selectedPlacement} onChange={(event) => setSelectedPlacement(event.target.value)}>
            <option value="all">전체</option>
            {placementOptions.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <dl className={pageStyles.sectionSummary}>
        <div>
          <dt>전체 클릭</dt>
          <dd>{totalClicks.toLocaleString("ko-KR")}건</dd>
          <dd className={pageStyles.summaryDescription}>{periodText} · {selectedPlacementLabel}</dd>
        </div>
        <div>
          <dt>가장 많이 누른 항목</dt>
          <dd>{numberFrom(topBanner?.count) > 0 ? topBanner?.label : "-"}</dd>
          <dd className={pageStyles.summaryDescription}>{numberFrom(topBanner?.count) > 0 ? `${topBanner?.count}으로 가장 많은 항목` : "조회된 클릭 없음"}</dd>
        </div>
        <div>
          <dt>항목별 클릭자 합계</dt>
          <dd>{clickerSum.toLocaleString("ko-KR")}명</dd>
          <dd className={pageStyles.summaryDescription}>같은 사람이 다른 항목을 누르면 항목마다 포함</dd>
        </div>
      </dl>

      <div className={pageStyles.sectionGrid}>
        <TrendViewCard
          title="배너·버튼 클릭 추이"
          subtitle={`최근 7일 · ${selectedPlacementLabel} · 실제 클릭 건수`}
          listSubtitle={`목록 · ${periodText} · ${selectedPlacementLabel}`}
          yLabels={scale.yLabels}
          series={displayTrend}
          listSeries={displayListTrend}
          maxValue={scale.maxValue}
        />
        <AdminCard className={pageStyles.bannerCard}>
          <BannerClickList
            items={displayItems}
            total={totalClicks.toLocaleString("ko-KR")}
            periodLabel={`${periodText} · ${selectedPlacementLabel}`}
          />
        </AdminCard>
      </div>
    </section>
  );
}
