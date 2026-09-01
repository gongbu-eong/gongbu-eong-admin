"use client";

import { useMemo, useState } from "react";
import { LinePoint } from "@/features/admin/data/dashboard";
import styles from "./LineChart.module.css";

type Series = {
  label?: string;
  color: string;
  data: LinePoint[];
};

type LineChartProps = {
  title: string;
  subtitle: string;
  yLabels: string[];
  series: Series[];
  maxValue: number;
  legends?: Array<{ label: string; color: string }>;
};

const chartWidth = 754;
const chartHeight = 205;
const plotLeft = 132;
const plotTop = 0;
const plotWidth = 568;
const plotHeight = 188;

function toPoint(
  point: LinePoint,
  index: number,
  maxValue: number,
  pointCount: number,
) {
  const step = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;
  const x = plotLeft + index * step;
  const y = plotTop + plotHeight - (point.value / maxValue) * plotHeight;

  return { x, y };
}

type SelectedPointGroup = {
  pointLabel: string;
  x: number;
  y: number;
  items: Array<{
    label: string;
    value: number;
    color: string;
  }>;
};

export function LineChart({
  title,
  subtitle,
  yLabels,
  series,
  maxValue,
  legends,
}: LineChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<SelectedPointGroup | null>(
    null,
  );
  const xLabels = series[0]?.data.map((point) => point.label) ?? [];
  const showStaticLabels = series.length === 1;
  const plottedSeries = useMemo(
    () =>
      series.map((item, seriesIndex) => {
        const points = item.data.map((point, index) => ({
          ...toPoint(point, index, Math.max(maxValue, 1), xLabels.length),
          source: point,
          seriesIndex,
        }));
        const d = points
          .map((point, index) =>
            index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
          )
          .join(" ");

        return { ...item, points, d };
      }),
    [series, maxValue, xLabels.length],
  );
  const selectPointGroup = (index: number, x: number, y: number) => {
    setSelectedPoint({
      pointLabel: xLabels[index] || "",
      x,
      y,
      items: series.map((item, seriesIndex) => ({
        label: item.label || legends?.[seriesIndex]?.label || title,
        value: item.data[index]?.value || 0,
        color: item.color,
      })),
    });
  };
  const shouldShowXAxisLabel = (index: number) =>
    xLabels.length <= 14 ||
    index === 0 ||
    index === xLabels.length - 1 ||
    index % 3 === 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.titleBlock}>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {legends ? (
        <div className={styles.legends}>
          {legends.map((legend) => (
            <span key={legend.label}>
              <i style={{ backgroundColor: legend.color }} />
              {legend.label}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={styles.chart}
        style={{ width: chartWidth, height: chartHeight }}
        onMouseLeave={() => setSelectedPoint(null)}
      >
        <div className={styles.grid}>
          {yLabels.map((label, index) => (
            <div className={styles.gridRow} key={label}>
              <span>{label}</span>
              <i />
            </div>
          ))}
        </div>
        <svg
          className={styles.svg}
          width={chartWidth}
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          aria-label={title}
        >
          {plottedSeries.map((item) => (
              <g key={`${item.color}-${item.label || "series"}`}>
                <path
                  d={item.d}
                  fill="none"
                  stroke={item.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
                {item.points.map((point, index) => {
                  const seriesLabel =
                    item.label || legends?.[point.seriesIndex]?.label || title;

                  return (
                    <g key={`${item.color}-${index}`}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r="5"
                        fill="#fff"
                        stroke={item.color}
                        strokeWidth="2"
                      />
                      <circle
                        className={styles.hitArea}
                        cx={point.x}
                        cy={point.y}
                        r="14"
                        fill="transparent"
                        onMouseEnter={() => selectPointGroup(index, point.x, point.y)}
                        onFocus={() => selectPointGroup(index, point.x, point.y)}
                        onBlur={() => setSelectedPoint(null)}
                        tabIndex={0}
                      >
                        <title>
                          {`${seriesLabel} ${point.source.label}: ${point.source.value.toLocaleString("ko-KR")}건`}
                        </title>
                      </circle>
                      {showStaticLabels ? (
                        <text
                          x={point.x}
                          y={Math.max(13, point.y - 17)}
                          fill={item.color}
                          fontSize="13"
                          fontWeight="400"
                          textAnchor="middle"
                        >
                          {point.source.value.toLocaleString("ko-KR")}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </g>
          ))}
        </svg>
        {selectedPoint ? (
          <div
            className={styles.tooltip}
            style={{
              left: Math.min(chartWidth - 150, Math.max(42, selectedPoint.x + 12)),
              top: Math.max(0, selectedPoint.y - 48),
            }}
            role="status"
            aria-live="polite"
          >
            <span className={styles.tooltipDate}>{selectedPoint.pointLabel}</span>
            <span className={styles.tooltipList}>
              {selectedPoint.items.map((item) => (
                <span className={styles.tooltipRow} key={item.label}>
                  <span className={styles.tooltipTitle}>
                    <i style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <span className={styles.tooltipValue}>
                    {item.value.toLocaleString("ko-KR")}건
                  </span>
                </span>
              ))}
            </span>
          </div>
        ) : null}
        <div
          className={styles.xAxis}
          style={{
            gridTemplateColumns: `repeat(${Math.max(xLabels.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          {xLabels.map((label, index) => (
            <span
              className={
                xLabels.length > 14 ? styles.xAxisDenseLabel : undefined
              }
              key={`${label}-${index}`}
            >
              {shouldShowXAxisLabel(index) ? label : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
