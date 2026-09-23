"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Management.module.css";

type Institution = {
  id: string;
  name: string;
  sourceId: string | null;
  type: string;
  region: string;
  homepageUrl: string;
  jobCount: number;
  activeJobCount: number;
};

type Category = {
  id: string;
  sourceCode: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  jobCount: number;
  mappingCount: number;
};

export function InstitutionManager({ institutions }: { institutions: Institution[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Institution | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage("");
    const payload = Object.fromEntries(new FormData(formElement).entries());
    try {
      const response = await fetch(editing ? `/api/admin/institutions/${editing.id}` : "/api/admin/institutions", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "기관을 저장하지 못했습니다.");
      setEditing(null);
      formElement.reset();
      setMessage("저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "기관을 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  const remove = async (item: Institution) => {
    if (!window.confirm(`${item.name} 기관을 삭제할까요? 연결된 공고가 있으면 삭제되지 않습니다.`)) return;
    const response = await fetch(`/api/admin/institutions/${item.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "삭제했습니다." : result.message || "삭제하지 못했습니다.");
    if (response.ok) router.refresh();
  };
  return (
    <>
      <form className={styles.compactForm} key={editing?.id || "new"} onSubmit={save}>
        <Field label="기관명"><input className={styles.input} name="name" defaultValue={editing?.name || ""} required /></Field>
        <Field label="기관 유형"><input className={styles.input} name="type" defaultValue={editing?.type || ""} placeholder="공기업" /></Field>
        <Field label="지역"><input className={styles.input} name="region" defaultValue={editing?.region || ""} placeholder="서울" /></Field>
        <Field label="홈페이지"><input className={styles.input} name="homepageUrl" type="url" defaultValue={editing?.homepageUrl || ""} placeholder="https://" /></Field>
        <div className={styles.rowActions}>
          {editing ? <button className={styles.buttonSecondary} type="button" onClick={() => setEditing(null)}>취소</button> : null}
          <button className={styles.button} type="submit" disabled={pending}>{pending ? "저장 중" : editing ? "수정 저장" : "기관 추가"}</button>
        </div>
      </form>
      {message ? <p className={message.includes("했습니다") ? styles.message : styles.error}>{message}</p> : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>기관</th><th>유형</th><th>지역</th><th>전체 공고</th><th>공개 공고</th><th>관리</th></tr></thead>
          <tbody>
            {institutions.map((item) => (
              <tr key={item.id}>
                <td><span className={styles.primaryCell}><strong>{item.name}</strong><small>{item.sourceId ? `ALIO ${item.sourceId}` : "수동 등록 기관"}</small></span></td>
                <td data-label="유형">{item.type || "-"}</td>
                <td data-label="지역">{item.region || "-"}</td>
                <td data-label="전체 공고" className={styles.numberCell}>{item.jobCount.toLocaleString("ko-KR")}</td>
                <td data-label="공개 공고" className={styles.numberCell}>{item.activeJobCount.toLocaleString("ko-KR")}</td>
                <td data-label="관리"><span className={styles.rowActions}><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(item)}>수정</button><button className={styles.buttonDanger} type="button" onClick={() => void remove(item)}>삭제</button></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Category | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setMessage("");
    const data = new FormData(formElement);
    const payload = { ...Object.fromEntries(data.entries()), isActive: data.get("isActive") === "on" };
    try {
      const response = await fetch(editing ? `/api/admin/job-categories/${editing.id}` : "/api/admin/job-categories", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message || "직무를 저장하지 못했습니다.");
      setEditing(null);
      formElement.reset();
      setMessage("저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "직무를 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };
  const remove = async (item: Category) => {
    if (!window.confirm(`${item.name} 직무를 삭제할까요? 연결된 공고나 추천 기준이 있으면 삭제되지 않습니다.`)) return;
    const response = await fetch(`/api/admin/job-categories/${item.id}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { message?: string };
    setMessage(response.ok ? "삭제했습니다." : result.message || "삭제하지 못했습니다.");
    if (response.ok) router.refresh();
  };
  return (
    <>
      <form className={styles.compactForm} key={editing?.id || "new"} onSubmit={save}>
        <Field label="직무 코드"><input className={styles.input} name="sourceCode" defaultValue={editing?.sourceCode || ""} required /></Field>
        <Field label="직무명"><input className={styles.input} name="name" defaultValue={editing?.name || ""} required /></Field>
        <Field label="노출 순서"><input className={styles.input} name="sortOrder" type="number" defaultValue={editing?.sortOrder ?? categories.length + 1} /></Field>
        <label className={styles.checkbox} style={{ height: 42 }}><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} />필터에 사용</label>
        <div className={styles.rowActions}>
          {editing ? <button className={styles.buttonSecondary} type="button" onClick={() => setEditing(null)}>취소</button> : null}
          <button className={styles.button} type="submit" disabled={pending}>{pending ? "저장 중" : editing ? "수정 저장" : "직무 추가"}</button>
        </div>
      </form>
      {message ? <p className={message.includes("했습니다") ? styles.message : styles.error}>{message}</p> : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>순서</th><th>직무</th><th>상태</th><th>연결 공고</th><th>추천 성향</th><th>관리</th></tr></thead>
          <tbody>
            {categories.map((item) => (
              <tr key={item.id}>
                <td data-label="순서" className={styles.numberCell}>{item.sortOrder}</td>
                <td><span className={styles.primaryCell}><strong>{item.name}</strong><small>{item.sourceCode}</small></span></td>
                <td data-label="상태">{item.isActive ? "사용 중" : "사용 안 함"}</td>
                <td data-label="연결 공고" className={styles.numberCell}>{item.jobCount.toLocaleString("ko-KR")}</td>
                <td data-label="추천 성향" className={styles.numberCell}>{item.mappingCount.toLocaleString("ko-KR")}</td>
                <td data-label="관리"><span className={styles.rowActions}><button className={styles.buttonSecondary} type="button" onClick={() => setEditing(item)}>수정</button><button className={styles.buttonDanger} type="button" onClick={() => void remove(item)}>삭제</button></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className={styles.field}><span>{label}</span>{children}</label>;
}
