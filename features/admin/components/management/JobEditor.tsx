"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ManagedJobDetail } from "@/features/admin/server/jobs-management.repository";
import styles from "./Management.module.css";

type Institution = { id: string; name: string };
type Category = { id: string; name: string; isActive: boolean };

export function JobEditor({ job, institutions, categories }: { job?: ManagedJobDetail; institutions: Institution[]; categories: Category[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const isCollected = job?.source === "alio";

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const data = new FormData(event.currentTarget);
    const payload = Object.fromEntries(data.entries()) as Record<string, unknown>;
    payload.categoryIds = data.getAll("categoryIds");
    payload.isActive = data.get("isActive") === "on";
    payload.isFeatured = data.get("isFeatured") === "on";
    try {
      const response = await fetch(job ? `/api/admin/jobs/${job.id}` : "/api/admin/jobs", {
        method: job ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
      if (!response.ok) throw new Error(result.message || "공고를 저장하지 못했습니다.");
      if (!job && result.id) {
        router.replace(`/jobs/${result.id}`);
        router.refresh();
        return;
      }
      setMessage("변경 내용을 저장했습니다.");
      router.refresh();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "공고를 저장하지 못했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={submit}>
      {isCollected ? (
        <div className={`${styles.notice} ${styles.noticeWarning}`}>
          알리오에서 수집한 원본 공고입니다. 수집 시 덮어쓰는 기본 정보는 읽기 전용이며, 공개 여부·홈 우선 노출·직무 분류만 변경할 수 있습니다.
        </div>
      ) : null}

      <section className={styles.formSection} id="basic">
        <h3 className={styles.sectionTitle}>기본 정보</h3>
        <p className={styles.sectionHint}>사용자 목록과 상세 화면에 표시되는 공고 정보입니다.</p>
        <div className={`${styles.fieldGrid} ${styles.fieldGridThree}`}>
          <Field label="공고 제목" wide>
            {isCollected ? <ReadOnly>{job?.title}</ReadOnly> : <input className={styles.input} name="title" defaultValue={job?.title || ""} required maxLength={250} />}
          </Field>
          <Field label="기관">
            {isCollected ? <ReadOnly>{job?.institutionName}</ReadOnly> : (
              <select className={styles.select} name="institutionId" defaultValue={job?.institutionId || ""}>
                <option value="">기관 미지정</option>
                {institutions.map((institution) => <option key={institution.id} value={institution.id}>{institution.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="고용형태">
            {isCollected ? <ReadOnly>{job?.employmentType}</ReadOnly> : <input className={styles.input} name="employmentType" defaultValue={job?.employmentType === "-" ? "" : job?.employmentType || ""} />}
          </Field>
          <Field label="근무지역">
            {isCollected ? <ReadOnly>{job?.region}</ReadOnly> : <input className={styles.input} name="workRegion" defaultValue={job?.region === "-" ? "" : job?.region || ""} />}
          </Field>
          <Field label="NCS 분류">
            {isCollected ? <ReadOnly>{job?.ncsCategory || "-"}</ReadOnly> : <input className={styles.input} name="ncsCategory" defaultValue={job?.ncsCategory || ""} />}
          </Field>
          <Field label="공고 직무">
            {isCollected ? <ReadOnly>{job?.jobCategory || "-"}</ReadOnly> : <input className={styles.input} name="jobCategory" defaultValue={job?.jobCategory || ""} />}
          </Field>
          <Field label="채용 인원">
            {isCollected ? <ReadOnly>{job?.hiringCount == null ? "-" : `${job.hiringCount}명`}</ReadOnly> : <input className={styles.input} name="hiringCount" defaultValue={job?.hiringCount ?? ""} inputMode="numeric" type="number" min="0" />}
          </Field>
          <Field label="학력 요건">
            {isCollected ? <ReadOnly>{job?.educationRequirement || "-"}</ReadOnly> : <input className={styles.input} name="educationRequirement" defaultValue={job?.educationRequirement || ""} />}
          </Field>
          <Field label="경력 요건">
            {isCollected ? <ReadOnly>{job?.careerRequirement || "-"}</ReadOnly> : <input className={styles.input} name="careerRequirement" defaultValue={job?.careerRequirement || ""} />}
          </Field>
        </div>
      </section>

      <section className={styles.formSection} id="schedule">
        <h3 className={styles.sectionTitle}>접수 일정·지원 경로</h3>
        <div className={`${styles.fieldGrid} ${styles.fieldGridThree}`}>
          <Field label="공고일">
            {isCollected ? <ReadOnly>{formatInputDate(job?.announcementAt)}</ReadOnly> : <input className={styles.input} name="announcementAt" type="datetime-local" defaultValue={formatInputDate(job?.announcementAt)} />}
          </Field>
          <Field label="접수 시작">
            {isCollected ? <ReadOnly>{formatInputDate(job?.applicationStartAt)}</ReadOnly> : <input className={styles.input} name="applicationStartAt" type="datetime-local" defaultValue={formatInputDate(job?.applicationStartAt)} />}
          </Field>
          <Field label="접수 종료">
            {isCollected ? <ReadOnly>{formatInputDate(job?.applicationEndAt)}</ReadOnly> : <input className={styles.input} name="applicationEndAt" type="datetime-local" defaultValue={formatInputDate(job?.applicationEndAt)} />}
          </Field>
          <Field label="지원 URL" wide>
            {isCollected ? <ReadOnly>{job?.applyUrl || "-"}</ReadOnly> : <input className={styles.input} name="applyUrl" type="url" defaultValue={job?.applyUrl || ""} placeholder="https://" />}
          </Field>
          <Field label="이메일 지원 주소" wide>
            {isCollected ? <ReadOnly>{job?.emailApplyAddress || "-"}</ReadOnly> : <input className={styles.input} name="emailApplyAddress" type="email" defaultValue={job?.emailApplyAddress || ""} />}
          </Field>
        </div>
      </section>

      {!isCollected ? (
        <section className={styles.formSection} id="content">
          <h3 className={styles.sectionTitle}>상세 내용</h3>
          <div className={styles.fieldGrid}>
            <TextArea label="기본 안내" name="basicInfo" value={job?.basicInfo} />
            <TextArea label="지원 자격" name="qualification" value={job?.qualification} />
            <TextArea label="결격 사유" name="disqualification" value={job?.disqualification} />
            <TextArea label="우대 사항" name="preference" value={job?.preference} />
            <TextArea label="전형 절차" name="screeningProcess" value={job?.screeningProcess} />
            <TextArea label="지원 방법" name="applicationMethod" value={job?.applicationMethod} />
            <TextArea label="제출 서류" name="requiredDocuments" value={job?.requiredDocuments} />
            <TextArea label="추가 안내" name="additionalNotice" value={job?.additionalNotice} />
          </div>
        </section>
      ) : null}

      <section className={styles.formSection} id="exposure">
        <h3 className={styles.sectionTitle}>노출·직무 분류</h3>
        <p className={styles.sectionHint}>비공개 시 일반 공고 목록에서 제외됩니다. 홈 우선 노출은 홈의 기존 노출 조건도 함께 충족해야 합니다.</p>
        <div className={styles.checkboxRow} style={{ marginTop: 14 }}>
          <label className={styles.checkbox}><input type="checkbox" name="isActive" defaultChecked={job ? job.isActive : false} />사용자에게 공개</label>
          <label className={styles.checkbox}><input type="checkbox" name="isFeatured" defaultChecked={job?.isFeatured || false} />홈 우선 노출</label>
        </div>
        <div className={styles.checkboxRow} style={{ marginTop: 16 }}>
          {categories.filter((category) => category.isActive || job?.categoryIds.includes(category.id)).map((category) => (
            <label className={styles.checkbox} key={category.id}>
              <input type="checkbox" name="categoryIds" value={category.id} defaultChecked={job?.categoryIds.includes(category.id)} />
              {category.name}
            </label>
          ))}
        </div>
      </section>

      <div className={styles.formActions}>
        {message ? <p className={message.includes("저장했습니다") ? styles.message : styles.error}>{message}</p> : null}
        <button className={styles.buttonSecondary} type="button" onClick={() => router.push("/jobs")}>목록으로</button>
        <button className={styles.button} type="submit" disabled={pending}>{pending ? "저장 중" : job ? "변경 저장" : "수동 공고 등록"}</button>
      </div>
    </form>
  );
}

function Field({ label, wide = false, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? styles.fieldWide : styles.field}><span>{label}</span>{children}</label>;
}

function TextArea({ label, name, value }: { label: string; name: string; value?: string }) {
  return <Field label={label}><textarea className={styles.textarea} name={name} defaultValue={value || ""} /></Field>;
}

function ReadOnly({ children }: { children: React.ReactNode }) {
  return <span className={styles.readonly}>{children || "-"}</span>;
}

function formatInputDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || "";
  return `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}T${valueOf("hour")}:${valueOf("minute")}`;
}
