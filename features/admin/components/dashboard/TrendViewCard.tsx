"use client";

import { useState } from "react";
import { AdminCard } from "@/features/admin/components/common/AdminCard";
import type { DashboardTrendSeries } from "@/features/admin/data/dashboard";
import { LineChart } from "./LineChart";
import { DashboardNote } from "./DashboardNote";
import styles from "./TrendViewCard.module.css";

type TrendViewCardProps = {
  title: string;
  titleNote?: string;
  subtitle: string;
  series: DashboardTrendSeries[];
  listSeries: DashboardTrendSeries[];
  listSubtitle: string;
  yLabels: string[];
  maxValue: number;
  valueSuffix?: string;
  className?: string;
  id?: string;
};

function formatValue(value: number, suffix: string) {
  return `${value.toLocaleString("ko-KR")}${suffix}`;
}

export function TrendViewCard({
  title,
  titleNote,
  subtitle,
  series,
  listSeries,
  listSubtitle,
  yLabels,
  maxValue,
  valueSuffix = "건",
  className = "",
  id,
}: TrendViewCardProps) {
  const [view, setView] = useState<"chart" | "list">("chart");
  const displayListSeries = listSeries.map((item) => ({
    ...item,
    data: [...item.data].reverse(),
  }));
  const labels = displayListSeries[0]?.data.map((point) => point.label) ?? [];
  const listTotals = displayListSeries.map((item) => {
    const isCumulative = item.label === "전체 가입자";
    const value = isCumulative
      ? item.data[0]?.value ?? 0
      : item.data.reduce((sum, point) => sum + point.value, 0);

    return {
      label: item.label,
      value,
      suffix: item.valueSuffix ?? valueSuffix,
      note: isCumulative ? "기간 종료 기준" : null,
    };
  });

  return (
    <AdminCard id={id} className={`${styles.card} ${className}`}>
      <div className={styles.header}>
        <div>
          <h2>
            {title}
            {titleNote ? <span className={styles.titleNote}>{titleNote}</span> : null}
          </h2>
          <DashboardNote>{view === "list" ? listSubtitle : subtitle}</DashboardNote>
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
            <tfoot>
              <tr>
                <th scope="row">합계</th>
                {listTotals.map((item) => (
                  <td key={`${item.label}-total`}>
                    <strong>{formatValue(item.value, item.suffix)}</strong>
                    {item.note ? <span>{item.note}</span> : null}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </AdminCard>
  );
}
