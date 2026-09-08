"use client";

import {
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
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
const chartHeight = 252;
const plotLeft = 86;
const plotTop = 8;
const plotWidth = 620;
const plotHeight = 188;
const pointInset = 44;
const xAxisTop = plotTop + plotHeight + 26;

function toPoint(
  point: LinePoint,
  index: number,
  maxValue: number,
  pointCount: number,
) {
  const effectiveWidth = Math.max(0, plotWidth - pointInset * 2);
  const step = pointCount > 1 ? effectiveWidth / (pointCount - 1) : 0;
  const x = plotLeft + pointInset + index * step;
  const y = plotTop + plotHeight - (point.value / maxValue) * plotHeight;

  return { x, y };
}

type SelectedPointGroup = {
  pointLabel: string;
  activeSeriesIndex: number;
  x: number;
  y: number;
  items: Array<{
    label: string;
    value: number;
    color: string;
    seriesIndex: number;
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
  const svgRef = useRef<SVGSVGElement | null>(null);
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
  const selectPointGroup = (
    index: number,
    x: number,
    y: number,
    activeSeriesIndex: number,
  ) => {
    setSelectedPoint((previous) => {
      const next = {
        pointLabel: xLabels[index] || "",
        activeSeriesIndex,
        x,
        y,
        items: series.map((item, seriesIndex) => ({
          label: item.label || legends?.[seriesIndex]?.label || title,
          value: item.data[index]?.value || 0,
          color: item.color,
          seriesIndex,
        })),
      };

      if (
        previous?.pointLabel === next.pointLabel &&
        previous.activeSeriesIndex === next.activeSeriesIndex
      ) {
        return previous;
      }

      return next;
    });
  };
  const selectNearestPointGroup = (event: MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !xAxisPoints.length) return;

    const bounds = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    const pointerY =
      ((event.clientY - bounds.top) / bounds.height) * chartHeight;
    const nearestPointIndex = xAxisPoints.reduce((nearestIndex, point, index) => {
      const nearestDistance = Math.abs(
        xAxisPoints[nearestIndex].x - pointerX,
      );
      const currentDistance = Math.abs(point.x - pointerX);

      return currentDistance < nearestDistance ? index : nearestIndex;
    }, 0);
    const nearestSeriesIndex = plottedSeries.reduce(
      (nearestIndex, item, index) => {
        const nearestDistance = Math.abs(
          (plottedSeries[nearestIndex]?.points[nearestPointIndex]?.y ??
            pointerY) - pointerY,
        );
        const currentDistance = Math.abs(
          (item.points[nearestPointIndex]?.y ?? pointerY) - pointerY,
        );

        return currentDistance < nearestDistance ? index : nearestIndex;
      },
      0,
    );
    const activePoint =
      plottedSeries[nearestSeriesIndex]?.points[nearestPointIndex] ||
      xAxisPoints[nearestPointIndex];

    selectPointGroup(
      nearestPointIndex,
      activePoint.x,
      activePoint.y,
      nearestSeriesIndex,
    );
  };
  const shouldShowXAxisLabel = (index: number) =>
    xLabels.length <= 14 ||
    index === 0 ||
    index === xLabels.length - 1 ||
    index % 3 === 0;
  const yAxisLines = yLabels.map((label, index) => ({
    label,
    y:
      plotTop +
      (yLabels.length > 1 ? (plotHeight / (yLabels.length - 1)) * index : 0),
  }));
  const xAxisPoints = plottedSeries[0]?.points ?? [];
  const getValueLabelProps = () => {
    return { xOffset: 0, textAnchor: "middle" as const };
  };

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
        style={{ height: chartHeight }}
        onMouseLeave={() => setSelectedPoint(null)}
      >
        <svg
          ref={svgRef}
          className={styles.svg}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          aria-label={title}
          onMouseMove={selectNearestPointGroup}
        >
          <g className={styles.gridLayer}>
            {yAxisLines.map((line) => (
              <g key={line.label}>
                <text x={plotLeft - 22} y={line.y + 5}>
                  {line.label}
                </text>
                <line
                  x1={plotLeft}
                  x2={plotLeft + plotWidth}
                  y1={line.y}
                  y2={line.y}
                />
              </g>
            ))}
          </g>
          {plottedSeries.map((item, seriesIndex) => {
            const isFaded =
              selectedPoint !== null &&
              selectedPoint.activeSeriesIndex !== seriesIndex;

            return (
              <g
                className={isFaded ? styles.fadedSeries : undefined}
                key={`${item.color}-${item.label || "series"}`}
              >
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
                        onFocus={() =>
                          selectPointGroup(index, point.x, point.y, seriesIndex)
                        }
                        onBlur={() => setSelectedPoint(null)}
                        tabIndex={0}
                      >
                        <title>
                          {`${seriesLabel} ${point.source.label}: ${point.source.value.toLocaleString("ko-KR")}건`}
                        </title>
                      </circle>
                      {showStaticLabels ? (
                        (() => {
                          const labelProps = getValueLabelProps();

                          return (
                            <text
                              x={point.x + labelProps.xOffset}
                              y={Math.max(13, point.y - 17)}
                              fill={item.color}
                              fontSize="13"
                              fontWeight="400"
                              textAnchor={labelProps.textAnchor}
                            >
                              {point.source.value.toLocaleString("ko-KR")}
                            </text>
                          );
                        })()
                      ) : null}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
        {selectedPoint ? (
          <div
            className={styles.tooltip}
            style={{
              left: `clamp(42px, calc(${(selectedPoint.x / chartWidth) * 100}% + 12px), calc(100% - 150px))`,
              top: Math.max(0, selectedPoint.y - 48),
            }}
            role="status"
            aria-live="polite"
          >
            <span className={styles.tooltipDate}>{selectedPoint.pointLabel}</span>
            <span className={styles.tooltipList}>
              {selectedPoint.items.map((item) => (
                <span
                  className={`${styles.tooltipRow} ${
                    item.seriesIndex !== selectedPoint.activeSeriesIndex
                      ? styles.tooltipRowFaded
                      : ""
                  }`}
                  key={item.label}
                >
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
        >
          {xLabels.map((label, index) => (
            <span
              className={
                xLabels.length > 14 ? styles.xAxisDenseLabel : undefined
              }
              style={{
                left: `${(((xAxisPoints[index]?.x ?? plotLeft) / chartWidth) * 100).toFixed(3)}%`,
                top: xAxisTop,
              }}
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
