"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
type EditorState = {
  id: string;
  placement: BannerPlacement;
  name: string;
  contentMarkup: string;
  targetUrl: string;
  status: BannerStatus;
  sortOrder: number;
  hasImage: boolean;
  imageFilename: string;
};

const EMPTY_EDITOR: EditorState = {
  id: "",
  placement: "home_main",
  name: "",
  contentMarkup: "",
  targetUrl: "",
  status: "draft",
  sortOrder: 0,
  hasImage: false,
  imageFilename: "",
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
  const [activePlacement, setActivePlacement] = useState<BannerPlacement | "all">("all");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : ""),
    [imageFile],
  );
  useEffect(
    () => () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    },
    [imagePreviewUrl],
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
    setFeedback(null);
  };

  const openEdit = (banner: ManagedBanner) => {
    setEditor({
      id: banner.id,
      placement: banner.placement,
      name: banner.name,
      contentMarkup: banner.contentMarkup,
      targetUrl: banner.targetUrl,
      status: banner.status,
      sortOrder: banner.sortOrder,
      hasImage: banner.hasImage,
      imageFilename: banner.imageFilename,
    });
    setImageFile(null);
    setRemoveImage(false);
    setFeedback(null);
  };

  const save = async () => {
    if (!editor || saving) return;
    if (!editor.name.trim()) {
      setFeedback({ tone: "error", text: "관리용 배너명을 입력해 주세요." });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const form = new FormData();
      form.set("placement", editor.placement);
      form.set("name", editor.name);
      form.set("contentMarkup", editor.contentMarkup);
      form.set("targetUrl", editor.targetUrl);
      form.set("status", editor.status);
      form.set("sortOrder", String(editor.sortOrder));
      form.set("removeImage", String(removeImage));
      if (imageFile) form.set("image", imageFile);
      const response = await fetch(
        editor.id ? `/api/admin/banners/${editor.id}` : "/api/admin/banners",
        { method: editor.id ? "PATCH" : "POST", body: form },
      );
      const body = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !body.ok) throw new Error(body.message || "배너를 저장하지 못했습니다.");
      setEditor(null);
      setFeedback({ tone: "success", text: editor.id ? "배너를 수정했습니다." : "배너를 등록했습니다." });
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
        <p>현재 사용자 사이트 배너에는 아직 연결되지 않습니다. 등록 자료는 추후 연동을 위한 관리 데이터로만 저장됩니다.</p>
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
            <thead><tr><th>이미지</th><th>배너 정보</th><th>노출 위치</th><th>상태·순서</th><th>최근 수정</th><th aria-label="관리" /></tr></thead>
            <tbody>
              {visibleBanners.map((banner) => (
                <tr key={banner.id}>
                  <td className={styles.imageCell}>
                    {banner.hasImage ? <Image unoptimized width={112} height={56} src={`/api/admin/banners/${banner.id}/image?v=${encodeURIComponent(banner.updatedAt)}`} alt="" /> : <span>이미지 없음</span>}
                  </td>
                  <td><strong>{banner.name}</strong><small>{banner.targetUrl || "이동 URL 없음"}</small><code>{banner.contentMarkup ? `${banner.contentMarkup.slice(0, 70)}${banner.contentMarkup.length > 70 ? "..." : ""}` : "내용 코드 없음"}</code></td>
                  <td>{placementLabel(placements, banner.placement)}</td>
                  <td><i className={`${styles.status} ${styles[`status_${banner.status}`]}`}>{statusLabel(banner.status)}</i><small>순서 {banner.sortOrder}</small></td>
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
            <header><div><h2 id="banner-editor-title">{editor.id ? "배너 수정" : "배너 등록"}</h2><p>고정 영역에 사용할 이미지와 코드, 이동 URL을 저장합니다.</p></div><button type="button" aria-label="닫기" onClick={() => setEditor(null)} disabled={saving}>×</button></header>
            <div className={styles.formGrid}>
              <label><span>노출 위치</span><select value={editor.placement} onChange={(event) => setEditor({ ...editor, placement: event.target.value as BannerPlacement })}>{placements.map((placement) => <option key={placement.key} value={placement.key}>{placement.label}</option>)}</select><small>{placements.find((item) => item.key === editor.placement)?.sizeGuide}</small></label>
              <label><span>관리용 배너명</span><input maxLength={120} value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} placeholder="예: 자소서 코칭 가이드 배너" /></label>
              <label><span>상태</span><select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as BannerStatus })}><option value="draft">임시 저장</option><option value="active">활성</option><option value="inactive">비활성</option></select></label>
              <label><span>노출 순서</span><input min={0} max={999} type="number" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} /></label>
              <label className={styles.fullField}><span>이동 URL</span><input maxLength={2000} value={editor.targetUrl} onChange={(event) => setEditor({ ...editor, targetUrl: event.target.value })} placeholder="/ai-tools/coaching 또는 https://..." /></label>
              <label className={styles.fullField}><span>배너 내용 코드</span><textarea maxLength={50000} rows={10} value={editor.contentMarkup} onChange={(event) => setEditor({ ...editor, contentMarkup: event.target.value })} placeholder={'HTML 태그와 CSS를 입력하세요.\n예: <strong class="title">...</strong>\n<style>...</style>'} /><small>관리자 화면에서는 보안을 위해 코드를 실행하지 않습니다.</small></label>
              <div className={`${styles.fullField} ${styles.uploadField}`}><span>배너 이미지</span><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => { const file = event.target.files?.[0] || null; if (file && file.size > 5 * 1024 * 1024) { event.target.value = ""; setFeedback({ tone: "error", text: "배너 이미지는 5MB 이하로 선택해 주세요." }); return; } setImageFile(file); if (file) { setRemoveImage(false); setFeedback(null); } }} /><div className={styles.uploadPreview}>{imagePreviewUrl ? <Image unoptimized width={520} height={180} src={imagePreviewUrl} alt="선택한 배너 이미지 미리보기" /> : editor.hasImage && !removeImage ? <Image unoptimized width={520} height={180} src={`/api/admin/banners/${editor.id}/image`} alt="현재 배너 이미지 미리보기" /> : <p>등록된 이미지가 없습니다.</p>}</div><div className={styles.uploadRow}><button type="button" onClick={() => fileRef.current?.click()}>이미지 선택</button><p>{imageFile?.name || (editor.hasImage && !removeImage ? editor.imageFilename : "선택된 이미지 없음")}</p>{editor.hasImage && !imageFile && !removeImage ? <button className={styles.removeImageButton} type="button" onClick={() => setRemoveImage(true)}>기존 이미지 제거</button> : null}</div><small>JPG, PNG, WEBP, GIF · 최대 5MB</small></div>
            </div>
            {feedback?.tone === "error" ? <p className={`${styles.feedback} ${styles.feedbackError}`}>{feedback.text}</p> : null}
            <footer><button type="button" onClick={() => setEditor(null)} disabled={saving}>취소</button><button className={styles.saveButton} type="button" onClick={save} disabled={saving}>{saving ? "저장 중..." : "저장"}</button></footer>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function placementLabel(placements: readonly Placement[], key: BannerPlacement) {
  return placements.find((placement) => placement.key === key)?.label || key;
}

function statusLabel(status: BannerStatus) {
  return status === "active" ? "활성" : status === "inactive" ? "비활성" : "임시 저장";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value));
}
