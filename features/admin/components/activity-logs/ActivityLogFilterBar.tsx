"use client";

import { useState } from "react";
import { DateRangePicker } from "@/features/admin/components/common/DateRangePicker";
import { TrimmedSearchInput } from "./TrimmedSearchInput";
import styles from "./ActivityLogFilterBar.module.css";

const eventOptions = [
  ["activity", "사용자 활동"],
  ["all", "원본 전체"],
  ["visit", "방문"],
  ["product", "기능·버튼 이벤트"],
  ["login", "로그인"],
] as const;

const screenOptions = [
  ["all", "전체 화면"],
  ["home", "홈"],
  ["jobs", "공고 목록"],
  ["job_detail", "공고 상세"],
  ["ai_tools", "AI 도구"],
  ["resume_coaching", "AI NCS 자소서 코칭"],
  ["interview_coaching", "AI NCS 면접 코칭"],
  ["diagnosis", "강약점"],
  ["community", "커뮤니티"],
  ["calendar", "캘린더"],
  ["my", "마이페이지"],
  ["login", "로그인"],
  ["other", "기타"],
] as const;

type ActivityLogFilterBarProps = {
  startDate: string;
  endDate: string;
  event: string;
  screen: string;
  keyword: string;
  includeExcluded: boolean;
  userId?: string;
};

export function ActivityLogFilterBar({
  startDate,
  endDate,
  event,
  screen,
  keyword,
  includeExcluded,
  userId,
}: ActivityLogFilterBarProps) {
  const [range, setRange] = useState({ startDate, endDate });

  return (
    <form className={styles.bar} action="/activity-logs">
      <DateRangePicker
        compact
        startDate={range.startDate}
        endDate={range.endDate}
        onApply={(nextStart, nextEnd) => setRange({ startDate: nextStart, endDate: nextEnd })}
      />
      <input type="hidden" name="startDate" value={range.startDate} />
      <input type="hidden" name="endDate" value={range.endDate} />
      <label className={styles.field}>
        <span>이벤트</span>
        <select name="event" defaultValue={event}>
          {eventOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>화면</span>
        <select name="screen" defaultValue={screen}>
          {screenOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className={`${styles.field} ${styles.keyword}`}>
        <span>검색어</span>
        <TrimmedSearchInput name="keyword" placeholder="이름 · 경로 · 이벤트 · IP" defaultValue={keyword} />
      </label>
      <label className={styles.checkbox}>
        <input name="includeExcluded" type="checkbox" value="1" defaultChecked={includeExcluded} />
        <span>제외 IP 포함</span>
      </label>
      <input type="hidden" name="page" value="1" />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <button className={styles.submit} type="submit">조회</button>
    </form>
  );
}
