"use client";

import { useState } from "react";
import { DateRangePicker } from "@/features/admin/components/common/DateRangePicker";
import { trafficChannelOptions } from "@/features/admin/traffic-channel";
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
  ["job_tools", "취업도구 전체"],
  ["job_tool_salary", "연봉 계산기"],
  ["job_tool_text", "글자수세기"],
  ["job_tool_severance", "퇴직금 계산기"],
  ["job_tool_vacation", "연차/휴가 계산기"],
  ["job_tool_unemployment", "실업급여 계산기"],
  ["job_tool_grade", "학점 계산기"],
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
  channel: string;
  keyword: string;
  includeExcluded: boolean;
  userId?: string;
  memberId?: string;
  allDates?: boolean;
  ip?: string;
};

export function ActivityLogFilterBar({
  startDate,
  endDate,
  event,
  screen,
  channel,
  keyword,
  includeExcluded,
  userId,
  memberId,
  allDates = false,
  ip,
}: ActivityLogFilterBarProps) {
  const [range, setRange] = useState(allDates ? { startDate: "", endDate: "" } : { startDate, endDate });
  const fieldName = (name: string) => memberId ? `log${name[0].toUpperCase()}${name.slice(1)}` : name;

  return (
    <form className={styles.bar} action={memberId ? `/members/${memberId}` : "/activity-logs"}>
      <DateRangePicker
        compact
        emptyLabel="전체 기간"
        startDate={range.startDate}
        endDate={range.endDate}
        onApply={(nextStart, nextEnd) => setRange({ startDate: nextStart, endDate: nextEnd })}
      />
      <button className={styles.resetPeriod} type="button" onClick={() => setRange({ startDate: "", endDate: "" })}>전체 기간</button>
      <input type="hidden" name={fieldName("startDate")} value={range.startDate} />
      <input type="hidden" name={fieldName("endDate")} value={range.endDate} />
      {!memberId ? <input type="hidden" name="allDates" value={!range.startDate && !range.endDate ? "1" : "0"} /> : null}
      <label className={styles.field}>
        <span>이벤트</span>
        <select name={fieldName("event")} defaultValue={event}>
          {eventOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>화면</span>
        <select name={fieldName("screen")} defaultValue={screen}>
          {screenOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className={styles.field}>
        <span>유입 경로</span>
        <select name={fieldName("channel")} defaultValue={channel}>
          {trafficChannelOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
        </select>
      </label>
      <label className={`${styles.field} ${styles.keyword}`}>
        <span>검색어</span>
        <TrimmedSearchInput name={fieldName("keyword")} placeholder="이름 · 경로 · 이벤트 · IP" defaultValue={keyword} />
      </label>
      <label className={styles.checkbox}>
        <input name={fieldName("includeExcluded")} type="checkbox" value="1" defaultChecked={includeExcluded} />
        <span>제외 IP 포함</span>
      </label>
      <input type="hidden" name={fieldName("page")} value="1" />
      {memberId ? <input type="hidden" name="tab" value="logs" /> : userId ? <input type="hidden" name="userId" value={userId} /> : null}
      {ip ? <input type="hidden" name={fieldName("ip")} value={ip} /> : null}
      <button className={styles.submit} type="submit">조회</button>
    </form>
  );
}
