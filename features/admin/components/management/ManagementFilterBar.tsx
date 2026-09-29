"use client";

import Link from "next/link";
import { useState } from "react";
import { DateRangePicker } from "../common/DateRangePicker";
import { MANAGEMENT_DATES, resolveManagementDate, type ManagementDateInput, type ManagementScreen } from "@/features/admin/management-date";
import { REPORT_REASONS, REPORT_STATUSES } from "@/features/admin/community-reports";
import styles from "./ManagementFilterBar.module.css";

type Choice = [string, string];
type SelectFilter = { name: string; label: string; options: Choice[]; fallback?: string };
const status = (label: string): SelectFilter => ({ name: "status", label, options: [["all", "상태 전체"], ["active", "공개"], ["deleted", "숨김"]] });
const config: Record<ManagementScreen, { path: string; label: string; placeholder?: string; selects: SelectFilter[] }> = {
  members: { path: "/members", label: "회원 관리", placeholder: "닉네임 · 이메일", selects: [
    { name: "status", label: "회원 상태", options: [["all", "상태 전체"], ["active", "활동중"], ["pending_signup", "가입대기"], ["blocked", "정지"], ["withdrawn", "탈퇴"], ["forced_withdrawn", "강제탈퇴"]] },
    { name: "channel", label: "유입 채널", options: [["all", "채널 전체"], ["instagram", "인스타그램"], ["blog", "블로그"], ["threads", "스레드"], ["search", "검색"], ["direct", "직접유입"], ["career", "커리어"]] },
  ] },
  jobs: { path: "/jobs", label: "공고 목록", placeholder: "공고명 · 기관 · NCS", selects: [
    { name: "source", label: "공고 출처", options: [["all", "출처 전체"], ["alio", "알리오 수집"], ["manual", "수동 등록"]] },
    { name: "status", label: "공고 상태", options: [["all", "상태 전체"], ["open", "접수 중"], ["closing", "3일 내 마감"], ["closed", "마감"], ["hidden", "비공개"]] },
  ] },
  institutions: { path: "/jobs/institutions", label: "기관 관리", placeholder: "기관명 · 유형 · 지역", selects: [] },
  categories: { path: "/jobs/categories", label: "직무 분류", placeholder: "직무명 · 코드", selects: [
    { name: "status", label: "사용 상태", options: [["all", "상태 전체"], ["active", "사용 중"], ["inactive", "사용 안 함"]] },
  ] },
  sync: { path: "/jobs/sync", label: "수집 이력", selects: [
    { name: "status", label: "실행 결과", options: [["all", "결과 전체"], ["succeeded", "성공"], ["failed", "실패"], ["running", "실행 중"], ["skipped", "건너뜀"]] },
  ] },
  posts: { path: "/community/posts", label: "게시글", placeholder: "제목 · 본문 · 작성자", selects: [
    { name: "category", label: "카테고리", fallback: "", options: [["", "카테고리 전체"], ...["자유·잡담", "공시 정보", "공부·스터디", "질문·답변", "합격·면접 후기", "유머·짤"].map((name): Choice => [name, name])] }, status("게시 상태"),
  ] },
  comments: { path: "/community/comments", label: "댓글·답글", placeholder: "댓글 내용 · 원글 제목", selects: [status("댓글 상태")] },
  reports: { path: "/community/reports", label: "신고 처리", placeholder: "내용 · 신고 사유 · 닉네임 · 이메일", selects: [
    { name: "searchBy", label: "검색 범위", options: [["all", "통합 검색"], ["content", "제목·본문"], ["reason", "신고 사유·처리 메모"], ["author", "대상 작성자"], ["reporter", "신고자"]] },
    { name: "status", label: "신고 상태", fallback: "open", options: [["open", "미처리 전체"], ["all", "상태 전체"], ...Object.entries(REPORT_STATUSES)] },
    { name: "targetType", label: "신고 대상", options: [["all", "대상 전체"], ["post", "게시글"], ["comment", "댓글·답글"], ["reply", "답글"]] },
    { name: "reason", label: "신고 사유", fallback: "", options: [["", "사유 전체"], ...REPORT_REASONS.map((name): Choice => [name, name])] },
  ] },
};

export type ManagementFilterValues = ManagementDateInput & { keyword?: string; [key: string]: string | number | boolean | undefined };

export function ManagementFilterBar({ screen, filters }: { screen: ManagementScreen; filters: ManagementFilterValues }) {
  // A new query remounts the draft, including browser back/forward navigation.
  return <FilterForm key={JSON.stringify(filters)} screen={screen} filters={filters} />;
}

function FilterForm({ screen, filters }: { screen: ManagementScreen; filters: ManagementFilterValues }) {
  const definition = config[screen];
  const [range, setRange] = useState(() => resolveManagementDate(screen, filters));
  const tabs: ManagementScreen[] = ["jobs", "institutions", "categories", "sync"].includes(screen)
    ? ["jobs", "institutions", "categories", "sync"] : screen === "members" ? ["members"] : ["posts", "comments", "reports"];
  return (
    <div className={styles.root}>
      <nav className={styles.tabs} aria-label={`${screen === "members" ? "회원" : tabs[0] === "jobs" ? "공고" : "커뮤니티"} 관리 메뉴`}>
        {tabs.map((tab) => <Link key={tab} href={config[tab].path} className={tab === screen ? styles.activeTab : ""} aria-current={tab === screen ? "page" : undefined}>{config[tab].label}</Link>)}
      </nav>
      <form action={definition.path} className={styles.form} aria-label={`${definition.label} 조회 조건`}>
        <div className={styles.dateRow}>
          <div className={styles.presets} aria-label="빠른 조회 기간">
            {[["all", "전체 기간"], ["today", "오늘"], ["7d", "최근 7일"], ["30d", "최근 30일"]].map(([value, label]) => (
              <button type="button" key={value} aria-pressed={range.period === value} onClick={() => setRange(resolveManagementDate(screen, { period: value, dateField: range.dateField }))}>{label}</button>
            ))}
          </div>
          <label className={styles.dateField}><span>날짜 기준</span><select aria-label="날짜 기준" name="dateField" value={range.dateField} onChange={(event) => setRange({ ...range, dateField: event.target.value })}>
            {Object.entries(MANAGEMENT_DATES[screen]).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <DateRangePicker compact label={`${Object.entries(MANAGEMENT_DATES[screen]).find(([key]) => key === range.dateField)?.[1]} 기준 · KST`} emptyLabel="전체 기간" startDate={range.startDate} endDate={range.endDate} active={range.period === "custom"} onApply={(startDate, endDate) => setRange({ ...range, period: "custom", startDate, endDate })} />
          <input type="hidden" name="period" value={range.period} />
          <input type="hidden" name="startDate" value={range.startDate} /><input type="hidden" name="endDate" value={range.endDate} />
        </div>
        <div className={styles.filters}>
          {definition.placeholder ? <label className={`${styles.field} ${styles.search}`}><span>검색어</span><input name="keyword" defaultValue={filters.keyword || ""} maxLength={100} placeholder={definition.placeholder} /></label> : null}
          {definition.selects.map((filter) => <label className={styles.field} key={filter.name}><span>{filter.label}</span><select aria-label={filter.label} name={filter.name} defaultValue={String(filters[filter.name] ?? filter.fallback ?? "all")}>
            {filter.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>)}
          {screen === "posts" ? <label className={styles.checkbox}><input type="checkbox" name="reported" value="true" defaultChecked={filters.reported === true || filters.reported === "true"} />신고 있는 글</label> : null}
          {screen === "reports" && filters.targetId ? <input type="hidden" name="targetId" value={String(filters.targetId)} /> : null}
          <input type="hidden" name="page" value="1" />
          <div className={styles.actions}><button type="submit">조회</button><Link href={definition.path}>초기화</Link></div>
        </div>
      </form>
    </div>
  );
}
