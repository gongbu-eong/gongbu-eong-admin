"use client";

import { useState } from "react";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import type { DashboardTrendSeries } from "@/features/admin/data/dashboard";
import { LineChart } from "./LineChart";
import styles from "./TrendViewCard.module.css";

type TrendViewCardProps = {
  title: string;
  subtitle: string;
  series: DashboardTrendSeries[];
  listSeries: DashboardTrendSeries[];
  listSubtitle: string;
  yLabels: string[];
  maxValue: number;
  valueSuffix?: string;
  className?: string;
};

function formatValue(value: number, suffix: string) {
  return `${value.toLocaleString("ko-KR")}${suffix}`;
}

export function TrendViewCard({
  title,
  subtitle,
  series,
  listSeries,
  listSubtitle,
  yLabels,
  maxValue,
  valueSuffix = "건",
  className = "",
}: TrendViewCardProps) {
  const [view, setView] = useState<"chart" | "list">("chart");
  const displayListSeries = listSeries.map((item) => ({
    ...item,
    data: [...item.data].reverse(),
  }));
  const labels = displayListSeries[0]?.data.map((point) => point.label) ?? [];

  return (
    <AdminCard className={`${styles.card} ${className}`}>
      <div className={styles.header}>
        <div>
          <h2>{title}</h2>
          <p>{view === "list" ? listSubtitle : subtitle}</p>
        </div>
        <label className={styles.viewSelect}>
          <span className={styles.srOnly}>{title} 표시 방식</span>
          <select
            value={view}
            onChange={(event) =>
              setView(event.target.value as "chart" | "list")
            }
          >
            <option value="chart">그래프</option>
            <option value="list">목록</option>
          </select>
        </label>
      </div>
      {view === "chart" ? (
        <div className={styles.chartSlot}>
          <LineChart
            key={JSON.stringify(series)}
            title={title}
            subtitle={subtitle}
            yLabels={yLabels}
            legends={series.map((item) => ({
              label: item.label,
              color: item.color,
            }))}
            series={series}
            maxValue={maxValue}
            valueSuffix={valueSuffix}
            hideHeader
          />
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table style={{ minWidth: Math.max(520, (displayListSeries.length + 1) * 110) }}>
            <thead>
              <tr>
                <th scope="col">날짜</th>
                {displayListSeries.map((item) => (
                  <th scope="col" key={item.label}>
                    {item.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {labels.map((label, index) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {displayListSeries.map((item) => (
                    <td key={`${item.label}-${label}`}>
                      {formatValue(item.data[index]?.value ?? 0, item.valueSuffix ?? valueSuffix)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
