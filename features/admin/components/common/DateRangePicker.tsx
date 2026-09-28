"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./DateRangePicker.module.css";

type DateRangePickerProps = {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
  active?: boolean;
  compact?: boolean;
  label?: string;
  emptyLabel?: string;
};

const weekdays = ["일", "월", "화", "수", "목", "금", "토"];

function kstToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

function parseDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Number.isFinite(year) && Number.isFinite(month) && Number.isFinite(day)
    ? { year, month, day }
    : null;
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftMonth(year: number, month: number, amount: number) {
  const date = new Date(year, month - 1 + amount, 1, 12);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function displayDate(value: string) {
  const parsed = parseDate(value);
  return parsed ? `${parsed.year}.${String(parsed.month).padStart(2, "0")}.${String(parsed.day).padStart(2, "0")}` : "날짜 선택";
}

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
  active = false,
  compact = false,
  label = "조회 기간",
  emptyLabel = "날짜 선택",
}: DateRangePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 368 });
  const initial = parseDate(startDate) || parseDate(kstToday())!;
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(startDate);
  const [draftEnd, setDraftEnd] = useState(endDate);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  useEffect(() => {
    if (!open) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !popoverRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const viewport = window.visualViewport;
      const width = Math.min(368, (viewport?.width || window.innerWidth) - 24);
      const height = viewport?.height || window.innerHeight;
      const offsetTop = viewport?.offsetTop || 0;
      const popoverHeight = Math.min(popoverRef.current?.offsetHeight || 510, height - 24);
      setPosition({ width, left: Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12)),
        top: Math.max(offsetTop + 12, Math.min(rect.bottom + 8, offsetTop + height - popoverHeight - 12)) });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    window.visualViewport?.addEventListener("resize", reposition);
    popoverRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      window.visualViewport?.removeEventListener("resize", reposition);
    };
  }, [open]);

  const years = useMemo(() => {
    const currentYear = parseDate(kstToday())!.year;
    const earliest = Math.min(2000, initial.year, viewYear);
    const latest = Math.max(currentYear + 1, initial.year, viewYear);
    return Array.from({ length: latest - earliest + 1 }, (_, index) => earliest + index).reverse();
  }, [initial.year, viewYear]);

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth - 1, 1, 12).getDay();
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(viewYear, viewMonth - 1, index - firstWeekday + 1, 12);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return { year, month, day, iso: toIso(year, month, day), currentMonth: month === viewMonth };
    });
  }, [viewMonth, viewYear]);

  const toggle = () => {
    if (!open) {
      const next = parseDate(startDate) || parseDate(kstToday())!;
      setDraftStart(startDate);
      setDraftEnd(endDate);
      setSelecting("start");
      setViewYear(next.year);
      setViewMonth(next.month);
    }
    setOpen((current) => !current);
  };

  const chooseDate = (iso: string, year: number, month: number) => {
    if (month !== viewMonth || year !== viewYear) {
      setViewYear(year);
      setViewMonth(month);
    }

    if (selecting === "start") {
      setDraftStart(iso);
      setDraftEnd("");
      setSelecting("end");
      return;
    }

    if (iso < draftStart) {
      setDraftEnd(draftStart);
      setDraftStart(iso);
    } else {
      setDraftEnd(iso);
    }
    setSelecting("start");
  };

  const moveMonth = (amount: number) => {
    const next = shiftMonth(viewYear, viewMonth, amount);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const rangeEnd = draftEnd || draftStart;

  return (
    <div className={`${styles.root} ${compact ? styles.compact : ""}`} ref={rootRef}>
      <button
        ref={triggerRef}
        className={`${styles.trigger} ${active || open ? styles.triggerActive : ""}`}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={toggle}
      >
        <span>{label}</span>
        <strong>{!startDate && !endDate ? emptyLabel : `${displayDate(startDate)} - ${displayDate(endDate)}`}</strong>
      </button>
      {open ? createPortal(
        <section ref={popoverRef} style={position} className={styles.popover} role="dialog" aria-label="조회 기간 선택">
          <header className={styles.popoverHeader}>
            <div>
              <strong>조회 기간 선택</strong>
              <span>{selecting === "start" ? "시작일을 선택하세요" : "종료일을 선택하세요"}</span>
            </div>
            <button type="button" aria-label="닫기" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>X</button>
          </header>
          <div className={styles.selectedRange}>
            <span className={selecting === "start" ? styles.selecting : ""}>{displayDate(draftStart)}</span>
            <i>-</i>
            <span className={selecting === "end" ? styles.selecting : ""}>{draftEnd ? displayDate(draftEnd) : "종료일 선택"}</span>
          </div>
          <div className={styles.monthControls}>
            <button type="button" aria-label="이전 달" title="이전 달" onClick={() => moveMonth(-1)}>&lt;</button>
            <label>
              <span className={styles.srOnly}>연도</span>
              <select aria-label="연도" value={viewYear} onChange={(event) => setViewYear(Number(event.target.value))}>
                {years.map((year) => <option value={year} key={year}>{year}년</option>)}
              </select>
            </label>
            <label>
              <span className={styles.srOnly}>월</span>
              <select aria-label="월" value={viewMonth} onChange={(event) => setViewMonth(Number(event.target.value))}>
                {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                  <option value={month} key={month}>{month}월</option>
                ))}
              </select>
            </label>
            <button type="button" aria-label="다음 달" title="다음 달" onClick={() => moveMonth(1)}>&gt;</button>
          </div>
          <div className={styles.weekdays} aria-hidden="true">
            {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
          </div>
          <div className={styles.calendar}>
            {calendarDays.map((date) => {
              const inRange = Boolean(draftStart && rangeEnd && date.iso >= draftStart && date.iso <= rangeEnd);
              const edge = date.iso === draftStart || Boolean(draftEnd && date.iso === draftEnd);
              return (
                <button
                  className={`${!date.currentMonth ? styles.outsideMonth : ""} ${inRange ? styles.inRange : ""} ${edge ? styles.rangeEdge : ""}`}
                  type="button"
                  aria-label={`${date.iso} 선택`}
                  onClick={() => chooseDate(date.iso, date.year, date.month)}
                  key={date.iso}
                >
                  {date.day}
                </button>
              );
            })}
          </div>
          <footer className={styles.actions}>
            <button type="button" onClick={() => setOpen(false)}>취소</button>
            <button
              type="button"
              disabled={!draftStart || !draftEnd}
              onClick={() => {
                onApply(draftStart, draftEnd);
                setOpen(false);
                triggerRef.current?.focus();
              }}
            >
              기간 적용
            </button>
          </footer>
        </section>, document.body
      ) : null}
    </div>
  );
}
