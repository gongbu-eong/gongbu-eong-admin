"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { TrafficPeriodPreset } from "@/features/admin/data/traffic";
import styles from "./TrafficSourcePage.module.css";

type TrafficFiltersProps = {
  preset: TrafficPeriodPreset;
  startDate: string;
  endDate: string;
  createButton?: boolean;
};

const presetOptions: Array<{
  label: string;
  value: TrafficPeriodPreset;
}> = [
  { label: "오늘", value: "today" },
  { label: "최근 7일", value: "7d" },
  { label: "최근 30일", value: "30d" },
];

export function TrafficFilters({
  preset,
  startDate,
  endDate,
  createButton = false,
}: TrafficFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [draftRange, setDraftRange] = useState({
    sourceStart: startDate,
    sourceEnd: endDate,
    start: startDate,
    end: endDate,
  });
  const isCurrentRange =
    draftRange.sourceStart === startDate && draftRange.sourceEnd === endDate;
  const draftStart = isCurrentRange ? draftRange.start : startDate;
  const draftEnd = isCurrentRange ? draftRange.end : endDate;

  const replacePeriod = (nextPreset: TrafficPeriodPreset) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPreset);
    params.delete("startDate");
    params.delete("endDate");
    router.push(`?${params.toString()}`);
  };

  const applyCustomRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftStart || !draftEnd) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    params.set("startDate", draftStart);
    params.set("endDate", draftEnd);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.segmented} aria-label="조회 기간">
        {presetOptions.map((option) => (
          <button
            className={preset === option.value ? styles.segmentedActive : undefined}
            key={option.value}
            type="button"
            onClick={() => replacePeriod(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <form className={styles.dateRange} onSubmit={applyCustomRange}>
        <label>
          <span className={styles.srOnly}>시작일</span>
          <input
            type="date"
            value={draftStart}
            onChange={(event) =>
              setDraftRange({
                sourceStart: startDate,
                sourceEnd: endDate,
                start: event.target.value,
                end: draftEnd,
              })
            }
          />
        </label>
        <img src="/admin-assets/calendar.svg" alt="" />
        <i>~</i>
        <label>
          <span className={styles.srOnly}>종료일</span>
          <input
            type="date"
            value={draftEnd}
            onChange={(event) =>
              setDraftRange({
                sourceStart: startDate,
                sourceEnd: endDate,
                start: draftStart,
                end: event.target.value,
              })
            }
          />
        </label>
        <img src="/admin-assets/calendar.svg" alt="" />
        <button type="submit">적용</button>
      </form>
      {createButton ? (
        <button className={styles.createButton} type="button">
          + 캠페인 만들기
        </button>
      ) : null}
    </div>
  );
}
