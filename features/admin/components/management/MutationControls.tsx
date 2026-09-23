"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Management.module.css";

const COMMUNITY_CATEGORIES = ["자유·잡담", "공시 정보", "공부·스터디", "질문·답변", "합격·면접 후기", "유머·짤"];

type JsonResult = { ok?: boolean; message?: string };

export function ModerationButton({ endpoint, body, confirmMessage, children, danger = false }: { endpoint: string; body: Record<string, unknown>; confirmMessage?: string; children: React.ReactNode; danger?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const run = async () => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as JsonResult;
      if (!response.ok) throw new Error(result.message || "처리하지 못했습니다.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  return (
    <span>
      <button className={danger ? styles.buttonDanger : styles.buttonSecondary} type="button" onClick={run} disabled={pending}>{pending ? "처리 중" : children}</button>
      {error ? <span className={styles.error}>{error}</span> : null}
    </span>
  );
}

export function ReportProcessor({ reportId, currentStatus, targetStatus }: { reportId: string; currentStatus: string; targetStatus: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/community/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: form.get("status"), action: form.get("action"), reviewNote: form.get("reviewNote") }),
      });
      const result = await response.json().catch(() => ({})) as JsonResult;
      if (!response.ok) throw new Error(result.message || "신고를 처리하지 못했습니다.");
      setMessage("저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "신고를 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form className={styles.reportForm} onSubmit={submit}>
      <select className={styles.select} name="status" defaultValue={currentStatus} aria-label="신고 상태">
        <option value="pending">처리 대기</option>
        <option value="reviewing">검토 중</option>
        <option value="resolved">처리 완료</option>
        <option value="rejected">위반 없음</option>
      </select>
      <select className={styles.select} name="action" defaultValue="none" aria-label="콘텐츠 조치">
        <option value="none">상태만 변경</option>
        <option value="hide">대상 숨김</option>
        {targetStatus === "deleted" ? <option value="restore">대상 복구</option> : null}
      </select>
      <textarea className={styles.textarea} name="reviewNote" placeholder="판단 근거와 조치 내용을 남겨 주세요." />
      <button className={styles.button} type="submit" disabled={pending}>{pending ? "저장 중" : "처리 저장"}</button>
      {message ? <p className={message === "저장했습니다." ? styles.message : styles.error}>{message}</p> : null}
    </form>
  );
}

export function PostModerationPanel({ postId, category, status }: { postId: string; category: string; status: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/community/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: data.get("category"), status: data.get("status") }),
      });
      const result = await response.json().catch(() => ({})) as JsonResult;
      if (!response.ok) throw new Error(result.message || "게시글을 변경하지 못했습니다.");
      setMessage("변경 내용을 저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "게시글을 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form className={styles.form} onSubmit={submit}>
      <label className={styles.field}><span>카테고리</span><select className={styles.select} name="category" defaultValue={category}>{COMMUNITY_CATEGORIES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <label className={styles.field}><span>게시 상태</span><select className={styles.select} name="status" defaultValue={status === "deleted" ? "deleted" : "active"}><option value="active">공개</option><option value="deleted">관리자 숨김</option></select></label>
      <div className={styles.notice}>회원이 작성한 제목과 본문은 보존합니다. 개인정보 또는 운영 정책 위반 시 게시글을 숨기고 신고 처리 메모에 판단 근거를 남겨 주세요.</div>
      {message ? <p className={message.includes("저장했습니다") ? styles.message : styles.error}>{message}</p> : null}
      <button className={status === "deleted" ? styles.button : styles.buttonDanger} type="submit" disabled={pending}>{pending ? "저장 중" : status === "deleted" ? "변경·복구 저장" : "변경·숨김 저장"}</button>
    </form>
  );
}
