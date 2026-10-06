"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { NotificationRecipientData } from "@/features/admin/server/notification-management.repository";
import styles from "./NotificationManagementPage.module.css";

type SendResult = {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
};

export function NotificationManagementPage({ data }: { data: NotificationRecipientData }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const eligibleIds = useMemo(
    () => data.recipients.filter((item) => item.eligible).map((item) => item.id),
    [data.recipients],
  );
  const allEligibleSelected = eligibleIds.length > 0 && eligibleIds.every((id) => selectedIds.includes(id));

  const toggleAll = () => {
    setSelectedIds((current) =>
      allEligibleSelected
        ? current.filter((id) => !eligibleIds.includes(id))
        : Array.from(new Set([...current, ...eligibleIds])),
    );
  };

  const toggleOne = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const send = async () => {
    if (!selectedIds.length || sending) return;
    if (!window.confirm(`선택한 ${selectedIds.length}명에게 카카오 알림톡을 발송할까요?`)) return;
    setSending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedIds }),
      });
      const body = (await response.json()) as { ok?: boolean; message?: string; result?: SendResult };
      if (!response.ok || !body.ok || !body.result) throw new Error(body.message || "알림톡을 발송하지 못했습니다.");
      const result = body.result;
      setMessage({
        tone: result.failed ? "error" : "success",
        text: `발송 ${result.sent}명 · 제외 ${result.skipped}명 · 실패 ${result.failed}명`,
      });
      setSelectedIds([]);
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "알림톡을 발송하지 못했습니다." });
    } finally {
      setSending(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.metrics} aria-label="알림 발송 대상 현황">
        <Metric label="휴대폰 보유 회원" value={data.total} />
        <Metric label="발송 가능" value={data.eligible} tone="success" />
        <Metric label="발송 제외" value={data.unavailable} tone="muted" />
        <Metric label="현재 선택" value={selectedIds.length} tone="primary" />
      </section>

      <section className={styles.surface}>
        <div className={styles.toolbar}>
          <form className={styles.filters} method="get">
            <input name="keyword" defaultValue={data.keyword} placeholder="이름 · 이메일 · 휴대폰번호" aria-label="회원 검색" />
            <select name="age" defaultValue={data.age} aria-label="연령대 필터">
              <option value="all">연령대 전체</option>
              <option value="10s">10대</option>
              <option value="20s">20대</option>
              <option value="30s">30대</option>
              <option value="40s">40대</option>
              <option value="50plus">50대 이상</option>
            </select>
            <select name="eligibility" defaultValue={data.eligibility} aria-label="발송 가능 여부">
              <option value="all">상태 전체</option>
              <option value="eligible">발송 가능</option>
              <option value="unavailable">발송 제외</option>
            </select>
            <button type="submit">조회</button>
          </form>
          <button className={styles.sendButton} type="button" disabled={!selectedIds.length || sending} onClick={send}>
            {sending ? "발송 중..." : `선택 ${selectedIds.length}명 발송`}
          </button>
        </div>

        {message ? <p className={`${styles.feedback} ${message.tone === "error" ? styles.feedbackError : ""}`} role="status">{message.text}</p> : null}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxCell}><input type="checkbox" checked={allEligibleSelected} onChange={toggleAll} aria-label="현재 페이지 발송 가능 회원 전체 선택" /></th>
                <th>회원</th>
                <th>연령대</th>
                <th>휴대폰번호</th>
                <th>광고성 정보 수신</th>
                <th>발송 상태</th>
              </tr>
            </thead>
            <tbody>
              {data.recipients.map((recipient) => (
                <tr key={recipient.id} className={!recipient.eligible ? styles.unavailableRow : undefined}>
                  <td className={styles.checkboxCell}>
                    <input type="checkbox" disabled={!recipient.eligible} checked={selectedIds.includes(recipient.id)} onChange={() => toggleOne(recipient.id)} aria-label={`${recipient.name} 선택`} />
                  </td>
                  <td><strong>{recipient.name}</strong><small>{recipient.email} · {recipient.statusLabel}</small></td>
                  <td>{recipient.ageGroup}</td>
                  <td>{recipient.phone}</td>
                  <td><span>{recipient.marketingAgreed ? "동의" : "미동의"}</span></td>
                  <td>{recipient.eligible ? <i className={styles.readyBadge}>발송 가능</i> : <i className={styles.disabledBadge}>{recipient.unavailableReason}</i>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.recipients.length ? <div className={styles.empty}>조건에 맞는 회원이 없습니다.</div> : null}
        </div>

        <Pagination data={data} />
      </section>
    </main>
  );
}

function Metric({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "success" | "muted" | "primary" }) {
  return <article className={`${styles.metric} ${styles[`metric_${tone}`]}`}><span>{label}</span><strong>{value.toLocaleString("ko-KR")}명</strong></article>;
}

function Pagination({ data }: { data: NotificationRecipientData }) {
  if (data.totalPages <= 1) return null;
  const href = (page: number) => {
    const query = new URLSearchParams();
    if (data.keyword) query.set("keyword", data.keyword);
    if (data.age !== "all") query.set("age", data.age);
    if (data.eligibility !== "all") query.set("eligibility", data.eligibility);
    query.set("page", String(page));
    return `/notifications?${query.toString()}`;
  };
  const start = Math.max(1, Math.min(data.page - 2, data.totalPages - 4));
  const pages = Array.from({ length: Math.min(5, data.totalPages) }, (_, index) => start + index);
  return <nav className={styles.pagination} aria-label="회원 목록 페이지"><Link aria-disabled={data.page === 1} href={href(Math.max(1, data.page - 1))}>이전</Link>{pages.map((page) => <Link className={page === data.page ? styles.activePage : ""} href={href(page)} key={page}>{page}</Link>)}<Link aria-disabled={data.page === data.totalPages} href={href(Math.min(data.totalPages, data.page + 1))}>다음</Link></nav>;
}
