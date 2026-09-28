"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { availableReportDecisions, REPORT_DECISIONS, type ReportDecision } from "@/features/admin/community-reports";
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

export function ReportProcessor({ reportId, currentStatus, targetStatus, updatedAt }: { reportId: string; currentStatus: string; targetStatus: string; updatedAt: string }) {
  const router = useRouter();
  const decisions = availableReportDecisions(currentStatus, targetStatus);
  const [decision, setDecision] = useState<ReportDecision>(decisions[0]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [succeeded, setSucceeded] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending || succeeded) return;
    const form = new FormData(event.currentTarget);
    if (decision === "hide" && !window.confirm("신고 대상을 숨기고 처리를 완료할까요? 원문은 보존되며 회원에게 내용이 노출되지 않습니다.")) return;
    if (decision === "restore" && !window.confirm("숨겨진 원문을 다시 공개하고 위반 없음으로 종결할까요? 작성자가 삭제한 내용일 수도 있으니 확인해 주세요.")) return;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/admin/community/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reviewNote: form.get("reviewNote"), expectedStatus: currentStatus, expectedUpdatedAt: updatedAt, expectedTargetStatus: targetStatus }),
      });
      const result = await response.json().catch(() => ({})) as JsonResult;
      if (!response.ok) throw new Error(result.message || "신고를 처리하지 못했습니다.");
      setSucceeded(true);
      setMessage("처리 결과와 이력을 저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "신고를 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form className={styles.reportForm} onSubmit={submit}>
      <label className={styles.field}><span>처리 조치</span>
        <select className={styles.select} name="decision" value={decision} onChange={(event) => setDecision(event.target.value as ReportDecision)} disabled={pending || succeeded}>
          {decisions.map((key) => <option key={key} value={key}>{REPORT_DECISIONS[key].label}</option>)}
        </select>
      </label>
      <label className={styles.field}><span>처리 사유 {decision === "review" ? "(선택)" : "(필수)"}</span>
        <textarea className={styles.textarea} name="reviewNote" maxLength={1000} required={decision !== "review"} disabled={pending || succeeded} placeholder="판단 근거와 조치 사유" />
      </label>
      <button className={decision === "hide" ? styles.buttonDanger : styles.button} type="submit" disabled={pending || succeeded}>{pending ? "처리 중" : REPORT_DECISIONS[decision].label}</button>
      {message ? <p role={succeeded ? "status" : "alert"} className={succeeded ? styles.message : styles.error}>{message}</p> : null}
      {message && !succeeded ? <button type="button" className={styles.buttonSecondary} onClick={() => router.refresh()}>최신 상태 확인</button> : null}
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
