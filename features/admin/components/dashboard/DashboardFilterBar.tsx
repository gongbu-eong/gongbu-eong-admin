"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminSelect } from "@/features/admin/components/common/AdminSelect";
import type { DashboardProductOption } from "@/features/admin/data/dashboard";
import styles from "./DashboardFilterBar.module.css";

type DashboardFilterBarProps = {
  startDate: string;
  endDate: string;
  preset: string;
  selectedChannel: string;
  selectedProduct: string;
  options: DashboardProductOption[];
};

export function DashboardFilterBar({
  startDate,
  endDate,
  preset,
  selectedChannel,
  selectedProduct,
  options,
}: DashboardFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showCustomRange, setShowCustomRange] = useState(preset === "custom");
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftEndDate, setDraftEndDate] = useState(endDate);

  const pushDashboard = (nextParams: URLSearchParams) => {
    const query = nextParams.toString();
    router.push(query ? `/?${query}` : "/", { scroll: false });
  };

  const applyDateRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    params.set("startDate", draftStartDate);
    params.set("endDate", draftEndDate);
    params.set("period", "custom");

    if (selectedChannel !== "all") {
      params.set("channel", selectedChannel);
    } else {
      params.delete("channel");
    }

    if (selectedProduct !== "diagnosis") {
      params.set("product", selectedProduct);
    } else {
      params.delete("product");
    }

    pushDashboard(params);
  };

  const changePreset = (nextPreset: "today" | "7d" | "30d") => {
    setShowCustomRange(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPreset);
    params.delete("startDate");
    params.delete("endDate");
    pushDashboard(params);
  };

  const toggleCustomRange = (checked: boolean) => {
    setShowCustomRange(checked);

    if (checked) {
      setDraftStartDate(endDate);
      setDraftEndDate(endDate);
    }
  };

  const changeProduct = (nextProduct: string) => {
    const params = new URLSearchParams(searchParams.toString());

    params.set("startDate", draftStartDate);
    params.set("endDate", draftEndDate);

    if (nextProduct === "diagnosis") {
      params.delete("product");
    } else {
      params.set("product", nextProduct);
    }

    pushDashboard(params);
  };

  return (
    <section className={styles.bar} aria-label="대시보드 조회 조건">
      <label className={styles.productSelect}>
        <span>분석 대상</span>
        <AdminSelect
          aria-label="대시보드 분석 대상"
          value={selectedProduct}
          onChange={(event) => changeProduct(event.target.value)}
        >
          {options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </AdminSelect>
      </label>
      <div className={styles.rangeControls}>
        <label className={styles.customToggle}>
          <input
            type="checkbox"
            checked={showCustomRange}
            onChange={(event) => toggleCustomRange(event.target.checked)}
          />
          <span>직접 기간 조회</span>
        </label>
        <div className={styles.rangeSlot}>
          {!showCustomRange ? (
            <div className={styles.presetGroup} aria-label="조회 기간">
              {[
                ["today", "오늘"],
                ["7d", "최근 7일"],
                ["30d", "최근 30일"],
              ].map(([key, label]) => (
                <button
                  className={preset === key ? styles.presetActive : styles.preset}
                  key={key}
                  type="button"
                  onClick={() => changePreset(key as "today" | "7d" | "30d")}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <form className={styles.dateForm} onSubmit={applyDateRange}>
              <label>
                <span>조회 시작</span>
                <input
                  type="date"
                  value={draftStartDate}
                  onChange={(event) => setDraftStartDate(event.target.value)}
                />
              </label>
              <label>
                <span>조회 종료</span>
                <input
                  type="date"
                  value={draftEndDate}
                  onChange={(event) => setDraftEndDate(event.target.value)}
                />
              </label>
              <button type="submit">적용</button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
