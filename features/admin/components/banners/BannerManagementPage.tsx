"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type {
  BANNER_PLACEMENTS,
  BannerPlacement,
  BannerStatus,
  ManagedBanner,
} from "@/features/admin/server/banner-management.repository";
import styles from "./BannerManagementPage.module.css";

type Placement = (typeof BANNER_PLACEMENTS)[number];
const MAX_BANNER_IMAGE_BYTES = 500 * 1024;

type EditorState = {
  id: string;
  placement: BannerPlacement;
  name: string;
  targetUrl: string;
  status: BannerStatus;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
  hasImage: boolean;
  imageFilename: string;
  hasMobileImage: boolean;
  mobileImageFilename: string;
};

const EMPTY_EDITOR: EditorState = {
  id: "",
  placement: "home_main",
  name: "",
  targetUrl: "",
  status: "draft",
  sortOrder: 0,
  startsAt: "",
  endsAt: "",
  hasImage: false,
  imageFilename: "",
  hasMobileImage: false,
  mobileImageFilename: "",
};

export function BannerManagementPage({
  placements,
  initialBanners,
}: {
  placements: readonly Placement[];
  initialBanners: ManagedBanner[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const mobileFileRef = useRef<HTMLInputElement>(null);
  const [activePlacement, setActivePlacement] = useState<BannerPlacement | "all">("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);
  const [removeMobileImage, setRemoveMobileImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );
  const mobileImagePreviewUrl = useMemo(
    () => (mobileImageFile ? URL.createObjectURL(mobileImageFile) : ""),
    [mobileImageFile],
  );
  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
  );
  useEffect(
    () => () => {
      if (mobileImagePreviewUrl) URL.revokeObjectURL(mobileImagePreviewUrl);
    },
    [mobileImagePreviewUrl],
  );
  const visibleBanners = useMemo(
    () =>
      activePlacement === "all"
        ? initialBanners
        : initialBanners.filter((banner) => banner.placement === activePlacement),
    [activePlacement, initialBanners],
  );
  const activeCount = initialBanners.filter((banner) => banner.status === "active").length;

  const openCreate = () => {
    setEditor({
      ...EMPTY_EDITOR,
      placement: activePlacement === "all" ? "home_main" : activePlacement,
    });
    setImageFile(null);
    setRemoveImage(false);
    setMobileImageFile(null);
    setRemoveMobileImage(false);
    setFeedback(null);
  };

  const openEdit = (banner: ManagedBanner) => {
    setEditor({
      id: banner.id,
      placement: banner.placement,
      name: banner.name,
      targetUrl: banner.targetUrl,
      status: banner.status,
      sortOrder: banner.sortOrder,
      startsAt: toDateTimeLocal(banner.startsAt),
      endsAt: toDateTimeLocal(banner.endsAt),
      hasImage: banner.hasImage,
      imageFilename: banner.imageFilename,
      hasMobileImage: banner.hasMobileImage,
      mobileImageFilename: banner.mobileImageFilename,
    });
    setImageFile(null);
    setRemoveImage(false);
    setMobileImageFile(null);
    setRemoveMobileImage(false);
    setFeedback(null);
  };

  const save = async () => {
    if (!editor || saving) return;
    if (!editor.name.trim()) {
      setFeedback({ tone: "error", text: "관리용 배너명을 입력해 주세요." });
      return;
    }
    if (editor.startsAt && editor.endsAt && new Date(editor.endsAt) <= new Date(editor.startsAt)) {
      setFeedback({ tone: "error", text: "노출 종료일시는 시작일시보다 이후여야 합니다." });
      return;
    }
    const willHaveDesktopImage = Boolean(imageFile) || (editor.hasImage && !removeImage);
    if (editor.status === "active" && !willHaveDesktopImage) {
      setFeedback({ tone: "error", text: "활성 배너에는 이미지가 필요합니다." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("placement", editor.placement);
      form.set("name", editor.name);
      form.set("targetUrl", editor.targetUrl);
      form.set("status", editor.status);
      form.set("sortOrder", String(editor.sortOrder));
      form.set("startsAt", toIsoString(editor.startsAt));
      form.set("endsAt", toIsoString(editor.endsAt));
      form.set("removeImage", String(removeImage));
      form.set("removeMobileImage", String(removeMobileImage));
      if (imageFile) form.set("image", imageFile);
      if (mobileImageFile) form.set("mobileImage", mobileImageFile);
      const response = await fetch(
        editor.id ? `/api/admin/banners/${editor.id}` : "/api/admin/banners",
        { method: editor.id ? "PATCH" : "POST", body: form },
      );
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "배너를 저장하지 못했습니다.");
      const removedDesktopImage = Boolean(editor.id && removeImage && !imageFile);
      const removedMobileImage = Boolean(editor.id && removeMobileImage && !mobileImageFile);
      setEditor(null);
      setFeedback({
        tone: "success",
        text: removedDesktopImage
          ? "PC용 이미지를 제거하고 배너를 비활성화했습니다."
          : removedMobileImage
            ? "모바일용 이미지를 제거했습니다. 모바일에서는 PC용 이미지가 노출됩니다."
            : editor.id
              ? "배너를 수정했습니다."
              : "배너를 등록했습니다.",
      });
      router.refresh();
    } catch (error) {
      setFeedback({ tone: "error", text: error instanceof Error ? error.message : "배너를 저장하지 못했습니다." });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (banner: ManagedBanner) => {
    if (!window.confirm(`'${banner.name}' 배너를 삭제할까요?`)) return;
    const response = await fetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    const body = (await response.json()) as { ok?: boolean; message?: string };
    if (!response.ok || !body.ok) {
      setFeedback({ tone: "error", text: body.message || "배너를 삭제하지 못했습니다." });
      return;
    }
    setFeedback({ tone: "success", text: "배너를 삭제했습니다." });
    router.refresh();
  };

  return (
    <main className={styles.page}>
      <section className={styles.summary} aria-label="배너 관리 현황">
        <div><span>고정 노출 위치</span><strong>{placements.length}곳</strong></div>
        <div><span>등록 배너</span><strong>{initialBanners.length}개</strong></div>
        <div><span>활성 배너</span><strong>{activeCount}개</strong></div>
        <p>활성 상태이며 현재 시각이 노출 기간에 포함되는 이미지 배너만 사용자 화면에 노출됩니다.</p>
      </section>

      <section className={styles.workspace}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="배너 노출 위치">
            <button className={activePlacement === "all" ? styles.activeTab : ""} onClick={() => setActivePlacement("all")} type="button">전체</button>
            {placements.map((placement) => (
              <button className={activePlacement === placement.key ? styles.activeTab : ""} key={placement.key} onClick={() => setActivePlacement(placement.key)} type="button">{placement.label}</button>
            ))}
          </div>
          <button className={styles.createButton} type="button" onClick={openCreate}>+ 배너 등록</button>
        </div>

        {feedback ? <p className={`${styles.feedback} ${feedback.tone === "error" ? styles.feedbackError : ""}`} role="status">{feedback.text}</p> : null}

        <div className={styles.placementGuide}>
          {(activePlacement === "all" ? placements : placements.filter((item) => item.key === activePlacement)).map((placement) => (
            <div key={placement.key}>
              <strong>{placement.label}</strong>
              <span>{placement.description}</span>
              <small>{placement.sizeGuide}</small>
            </div>
          ))}
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>PC·모바일 이미지</th><th>배너 정보</th><th>노출 위치</th><th>상태·순서</th><th>노출 기간</th><th>최근 수정</th><th aria-label="관리" /></tr></thead>
            <tbody>
              {visibleBanners.map((banner) => (
                <tr key={banner.id}>
                  <td className={styles.imageCell}>
                    <div className={styles.imageVariants}>
                      <div><small>PC</small>{banner.hasImage ? <Image unoptimized width={112} height={56} src={`/api/admin/banners/${banner.id}/image?v=${encodeURIComponent(banner.updatedAt)}`} alt="" /> : <span>이미지 없음</span>}</div>
                      <div><small>모바일</small>{banner.hasMobileImage ? <Image unoptimized width={112} height={56} src={`/api/admin/banners/${banner.id}/image?variant=mobile&v=${encodeURIComponent(banner.updatedAt)}`} alt="" /> : <span>PC 이미지 사용</span>}</div>
                    </div>
                  </td>
                  <td><strong>{banner.name}</strong><small>{banner.targetUrl || "이동 URL 없음"}</small></td>
                  <td>{placementLabel(placements, banner.placement)}</td>
                  <td><i className={`${styles.status} ${styles[`status_${banner.status}`]}`}>{statusLabel(banner.status)}</i><small>순서 {banner.sortOrder}</small></td>
                  <td>{formatPeriod(banner.startsAt, banner.endsAt)}<small>{periodStatus(banner)}</small></td>
                  <td>{formatDate(banner.updatedAt)}<small>{banner.updatedByName}</small></td>
                  <td className={styles.actions}><button type="button" onClick={() => openEdit(banner)}>수정</button><button className={styles.deleteButton} type="button" onClick={() => remove(banner)}>삭제</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!visibleBanners.length ? <div className={styles.empty}>이 위치에 등록된 배너가 없습니다.</div> : null}
        </div>
      </section>

      {editor ? (
        <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target && !saving) setEditor(null); }}>
          <section className={styles.editor} role="dialog" aria-modal="true" aria-labelledby="banner-editor-title">
            <header><div><h2 id="banner-editor-title">{editor.id ? "배너 수정" : "배너 등록"}</h2><p>고정 영역에 사용할 이미지, 이동 URL과 노출 기간을 설정합니다.</p></div><button type="button" aria-label="닫기" onClick={() => setEditor(null)} disabled={saving}>×</button></header>
            <div className={styles.formGrid}>
              <label><span>노출 위치</span><select value={editor.placement} onChange={(event) => setEditor({ ...editor, placement: event.target.value as BannerPlacement })}>{placements.map((placement) => <option key={placement.key} value={placement.key}>{placement.label}</option>)}</select><small>{placements.find((item) => item.key === editor.placement)?.sizeGuide}</small></label>
              <label><span>관리용 배너명</span><input maxLength={120} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="예: 자소서 코칭 가이드 배너" /></label>
              <label><span>상태</span><select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as BannerStatus })}><option value="draft">임시 저장</option><option value="active">활성</option><option value="inactive">비활성</option></select></label>
              <label><span>노출 순서</span><input min={0} max={999} type="number" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} /></label>
              <label><span>노출 시작일시</span><input type="datetime-local" step="1" value={editor.startsAt} onChange={(event) => setEditor({ ...editor, startsAt: event.target.value })} /><small>미입력 시 활성화 즉시 노출</small></label>
              <label><span>노출 종료일시</span><input type="datetime-local" step="1" value={editor.endsAt} onChange={(event) => setEditor({ ...editor, endsAt: event.target.value })} /><small>미입력 시 종료 제한 없음</small></label>
              <label className={styles.fullField}><span>이동 URL</span><input maxLength={2000} value={editor.targetUrl} onChange={(event) => setEditor({ ...editor, targetUrl: event.target.value })} placeholder="/ai-tools/coaching?jobPostingId={jobId}" /><small>공고 상세 배너에서는 <code>{"{jobId}"}</code>를 현재 보고 있는 공고 ID로 치환합니다. 자소서·면접 코칭에 공고를 바로 연결하려면 예시처럼 입력하세요.</small></label>
              <div className={`${styles.fullField} ${styles.imageUploadGrid}`}>
                <BannerImageUpload
                  label="PC용 배너 이미지 (필수)"
                  guide={imageUploadGuide(editor.placement, "desktop")}
                  fileRef={fileRef}
                  selectedFile={imageFile}
                  previewUrl={imagePreviewUrl}
                  currentImageUrl={editor.hasImage && !removeImage ? `/api/admin/banners/${editor.id}/image` : ""}
                  currentFilename={editor.imageFilename}
                  removed={removeImage}
                  canRemove={editor.hasImage && !imageFile && !removeImage}
                  onFile={(file) => { setImageFile(file); if (file) { setRemoveImage(false); setFeedback(null); } }}
                  onRemove={() => {
                    setRemoveImage(true);
                    setImageFile(null);
                    setEditor((current) => current ? { ...current, status: "inactive" } : current);
                    setFeedback(null);
                  }}
                  onUndoRemove={() => setRemoveImage(false)}
                  onError={(text) => setFeedback({ tone: "error", text })}
                />
                <BannerImageUpload
                  label="모바일용 배너 이미지"
                  guide={imageUploadGuide(editor.placement, "mobile")}
                  fileRef={mobileFileRef}
                  selectedFile={mobileImageFile}
                  previewUrl={mobileImagePreviewUrl}
                  currentImageUrl={editor.hasMobileImage && !removeMobileImage ? `/api/admin/banners/${editor.id}/image?variant=mobile` : ""}
                  currentFilename={editor.mobileImageFilename}
                  removed={removeMobileImage}
                  canRemove={editor.hasMobileImage && !mobileImageFile && !removeMobileImage}
                  onFile={(file) => { setMobileImageFile(file); if (file) { setRemoveMobileImage(false); setFeedback(null); } }}
                  onRemove={() => {
                    setRemoveMobileImage(true);
                    setMobileImageFile(null);
                    setFeedback(null);
                  }}
                  onUndoRemove={() => setRemoveMobileImage(false)}
                  onError={(text) => setFeedback({ tone: "error", text })}
                />
              </div>
            </div>
            {feedback?.tone === "error" ? <p className={`${styles.feedback} ${styles.feedbackError}`}>{feedback.text}</p> : null}
            <footer><button type="button" onClick={() => setEditor(null)} disabled={saving}>취소</button><button className={styles.saveButton} type="button" onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</button></footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function BannerImageUpload({
  label,
  guide,
  fileRef,
  selectedFile,
  previewUrl,
  currentImageUrl,
  currentFilename,
  removed,
  canRemove,
  onFile,
  onRemove,
  onUndoRemove,
  onError,
}: {
  label: string;
  guide: string;
  fileRef: RefObject<HTMLInputElement | null>;
  selectedFile: File | null;
  previewUrl: string;
  currentImageUrl: string;
  currentFilename: string;
  removed: boolean;
  canRemove: boolean;
  onFile: (file: File | null) => void;
  onRemove: () => void;
  onUndoRemove: () => void;
  onError: (text: string) => void;
}) {
  return (
    <div className={styles.uploadField}>
      <span>{label}</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          if (file && file.size > MAX_BANNER_IMAGE_BYTES) {
            event.target.value = "";
            onError("배너 이미지는 파일당 500KB 이하로 선택해 주세요.");
            return;
          }
          onFile(file);
        }}
      />
      <div className={styles.uploadPreview}>
        {removed ? <p className={styles.pendingRemoval}>저장하면 기존 이미지가 제거됩니다.</p> : previewUrl ? <Image unoptimized width={520} height={180} src={previewUrl} alt={`${label} 미리보기`} /> : currentImageUrl ? <Image unoptimized width={520} height={180} src={currentImageUrl} alt={`현재 ${label}`} /> : <p>등록된 이미지가 없습니다.</p>}
      </div>
      <div className={styles.uploadRow}>
        <button type="button" onClick={() => fileRef.current?.click()}>이미지 선택</button>
        <p>{removed ? "기존 이미지 제거 예정" : selectedFile?.name || currentFilename || "선택된 이미지 없음"}</p>
        {canRemove ? <button className={styles.removeImageButton} type="button" onClick={onRemove}>기존 이미지 제거</button> : null}
        {removed ? <button type="button" onClick={onUndoRemove}>제거 취소</button> : null}
      </div>
      <small>{guide}</small>
    </div>
  );
}

function placementLabel(placements: readonly Placement[], key: BannerPlacement) {
  return placements.find((placement) => placement.key === key)?.label || key;
}

function imageUploadGuide(
  placement: BannerPlacement,
  variant: "desktop" | "mobile",
) {
  if (placement === "resume_coaching" || placement === "interview_coaching") {
    return variant === "desktop"
      ? "표시 비율 600 × 114px · SVG 권장 · PNG/WebP는 1800 × 342px (3배율) · 최대 500KB"
      : "표시 영역 361 × 80px · SVG 권장 · PNG/WebP는 1083 × 240px (3배율) · 미등록 시 PC 이미지 사용 · 최대 500KB";
  }

  return variant === "desktop"
    ? "텍스트 포함 시 SVG 권장 · PNG/WebP는 1800 × 342px (3배율) · 최대 500KB"
    : "텍스트 포함 시 SVG 권장 · PNG/WebP는 1179 × 342px (3배율) · 미등록 시 PC 이미지 사용 · 최대 500KB";
}

function statusLabel(status: BannerStatus) {
  return status === "active" ? "활성" : status === "inactive" ? "비활성" : "임시 저장";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 19);
}

function toIsoString(value: string) {
  return value ? new Date(value).toISOString() : "";
}

function formatPeriod(startsAt: string | null, endsAt: string | null) {
  const start = startsAt ? formatDateTime(startsAt) : "즉시";
  const end = endsAt ? formatDateTime(endsAt) : "제한 없음";
  return `${start} ~ ${end}`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function periodStatus(banner: ManagedBanner) {
  if (banner.status !== "active") return "노출 안 함";
  const now = Date.now();
  if (banner.startsAt && new Date(banner.startsAt).getTime() > now) return "노출 예정";
  if (banner.endsAt && new Date(banner.endsAt).getTime() <= now) return "노출 종료";
  return "현재 노출 중";
}
