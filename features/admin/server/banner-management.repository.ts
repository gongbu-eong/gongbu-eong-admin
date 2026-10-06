import { query } from "@/features/admin/server/db";

const MAX_BANNER_IMAGE_BYTES = 500 * 1024;

export const BANNER_PLACEMENTS = [
  {
    key: "home_main",
    label: "홈",
    description: "홈 화면의 진단 결과 영역과 주요 안내 배너",
    sizeGuide: "현재 홈 배너 영역의 너비와 높이를 그대로 사용",
  },
  {
    key: "ai_tools_main",
    label: "AI 도구",
    description: "AI 취업 도구 목록 화면의 주요 안내 배너",
    sizeGuide: "AI 도구 본문 너비에 맞춰 반응형으로 사용",
  },
  {
    key: "resume_coaching",
    label: "AI NCS 자소서 코칭",
    description: "자소서 코칭 진입 화면의 가이드·프로모션 배너",
    sizeGuide: "웹 최대 600px, 모바일 본문 너비에 맞춰 사용",
  },
  {
    key: "interview_coaching",
    label: "AI NCS 면접 코칭",
    description: "면접 코칭 진입 화면의 가이드·프로모션 배너",
    sizeGuide: "웹 최대 600px, 모바일 본문 너비에 맞춰 사용",
  },
  {
    key: "job_detail",
    label: "공고 상세",
    description: "공고 상세 하단의 고정형 코칭 배너",
    sizeGuide: "현재 공고 상세 배너 영역의 고정 높이와 반응형 너비 사용",
  },
] as const;

export type BannerPlacement = (typeof BANNER_PLACEMENTS)[number]["key"];
export type BannerStatus = "draft" | "active" | "inactive";

export type ManagedBanner = {
  id: string;
  placement: BannerPlacement;
  name: string;
  targetUrl: string;
  status: BannerStatus;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  imageFilename: string;
  imageMimeType: string;
  imageSizeBytes: number;
  hasImage: boolean;
  mobileImageFilename: string;
  mobileImageMimeType: string;
  mobileImageSizeBytes: number;
  hasMobileImage: boolean;
  updatedAt: string;
  updatedByName: string;
};

export type BannerInput = {
  placement: string;
  name: string;
  targetUrl: string;
  status: string;
  sortOrder: number;
  startsAt: string;
  endsAt: string;
  image?: { data: Buffer; filename: string; mimeType: string } | null;
  removeImage?: boolean;
  mobileImage?: { data: Buffer; filename: string; mimeType: string } | null;
  removeMobileImage?: boolean;
};

type BannerRow = {
  id: string;
  placement: BannerPlacement;
  name: string;
  target_url: string | null;
  status: BannerStatus;
  sort_order: number;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  image_filename: string | null;
  image_mime_type: string | null;
  image_size_bytes: number | string | null;
  has_image: boolean;
  mobile_image_filename: string | null;
  mobile_image_mime_type: string | null;
  mobile_image_size_bytes: number | string | null;
  has_mobile_image: boolean;
  updated_at: Date | string;
  updated_by_name: string | null;
};

let bannerSchemaReady = false;

export async function ensureBannerManagementSchema() {
  if (bannerSchemaReady) return;
  await query("CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public");
  await query(`
    CREATE TABLE IF NOT EXISTS public.site_banners (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      placement VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      target_url TEXT,
      image_data BYTEA,
      image_filename VARCHAR(255),
      image_mime_type VARCHAR(80),
      image_size_bytes INTEGER,
      mobile_image_data BYTEA,
      mobile_image_filename VARCHAR(255),
      mobile_image_mime_type VARCHAR(80),
      mobile_image_size_bytes INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT site_banners_placement_check CHECK (
        placement IN ('home_main', 'ai_tools_main', 'resume_coaching', 'interview_coaching', 'job_detail')
      ),
      CONSTRAINT site_banners_status_check CHECK (status IN ('draft', 'active', 'inactive')),
      CONSTRAINT site_banners_sort_order_check CHECK (sort_order BETWEEN 0 AND 999),
      CONSTRAINT site_banners_period_check CHECK (
        starts_at IS NULL OR ends_at IS NULL OR ends_at > starts_at
      ),
      CONSTRAINT site_banners_image_size_check CHECK (
        image_size_bytes IS NULL OR image_size_bytes BETWEEN 1 AND 5242880
      ),
      CONSTRAINT site_banners_mobile_image_size_check CHECK (
        mobile_image_size_bytes IS NULL OR mobile_image_size_bytes BETWEEN 1 AND 5242880
      )
    )
  `);
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ");
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ");
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS mobile_image_data BYTEA");
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS mobile_image_filename VARCHAR(255)");
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS mobile_image_mime_type VARCHAR(80)");
  await query("ALTER TABLE public.site_banners ADD COLUMN IF NOT EXISTS mobile_image_size_bytes INTEGER");
  await query(`
    CREATE INDEX IF NOT EXISTS idx_site_banners_active_period
      ON public.site_banners(placement, status, starts_at, ends_at, sort_order, updated_at DESC)
  `);
  bannerSchemaReady = true;
}

export async function listManagedBanners() {
  await ensureBannerManagementSchema();
  const result = await query<BannerRow>(`
    SELECT
      banners.id,
      banners.placement,
      banners.name,
      banners.target_url,
      banners.status,
      banners.sort_order,
      banners.starts_at,
      banners.ends_at,
      banners.image_filename,
      banners.image_mime_type,
      banners.image_size_bytes,
      (banners.image_data IS NOT NULL) AS has_image,
      banners.mobile_image_filename,
      banners.mobile_image_mime_type,
      banners.mobile_image_size_bytes,
      (banners.mobile_image_data IS NOT NULL) AS has_mobile_image,
      banners.updated_at,
      admins.name AS updated_by_name
    FROM public.site_banners banners
    LEFT JOIN public.admin_users admins ON admins.id = banners.updated_by
    ORDER BY banners.placement, banners.sort_order, banners.updated_at DESC
  `);
  return result.rows.map(mapBanner);
}

export async function createManagedBanner(input: BannerInput, adminUserId: string) {
  await ensureBannerManagementSchema();
  const value = validateBannerInput(input);
  if (value.status === "active" && !value.image) {
    throw new Error("활성 배너에는 이미지가 필요합니다.");
  }
  const result = await query<{ id: string }>(
    `
      INSERT INTO public.site_banners (
        placement, name, target_url,
        image_data, image_filename, image_mime_type, image_size_bytes,
        mobile_image_data, mobile_image_filename, mobile_image_mime_type, mobile_image_size_bytes,
        status, sort_order, starts_at, ends_at, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $16)
      RETURNING id
    `,
    [
      value.placement,
      value.name,
      value.targetUrl || null,
      value.image?.data || null,
      value.image?.filename || null,
      value.image?.mimeType || null,
      value.image?.data.length || null,
      value.mobileImage?.data || null,
      value.mobileImage?.filename || null,
      value.mobileImage?.mimeType || null,
      value.mobileImage?.data.length || null,
      value.status,
      value.sortOrder,
      value.startsAt,
      value.endsAt,
      adminUserId,
    ],
  );
  return result.rows[0].id;
}

export async function updateManagedBanner(
  bannerId: string,
  input: BannerInput,
  adminUserId: string,
) {
  await ensureBannerManagementSchema();
  const value = validateBannerInput(input);
  const current = await query<{ has_image: boolean }>(
    `SELECT
       image_data IS NOT NULL AS has_image
     FROM public.site_banners WHERE id = $1 LIMIT 1`,
    [bannerId],
  );
  if (!current.rows[0]) return null;
  const willHaveImage = Boolean(value.image) || (current.rows[0].has_image && !value.removeImage);
  const nextStatus = value.status === "active" && !willHaveImage ? "inactive" : value.status;
  const params: unknown[] = [
    bannerId,
    value.placement,
    value.name,
    value.targetUrl || null,
    nextStatus,
    value.sortOrder,
    value.startsAt,
    value.endsAt,
    adminUserId,
    Boolean(value.image),
    Boolean(value.removeImage),
    value.image?.data || null,
    value.image?.filename || null,
    value.image?.mimeType || null,
    value.image?.data.length || null,
    Boolean(value.mobileImage),
    Boolean(value.removeMobileImage),
    value.mobileImage?.data || null,
    value.mobileImage?.filename || null,
    value.mobileImage?.mimeType || null,
    value.mobileImage?.data.length || null,
  ];
  const result = await query<{ id: string }>(
    `
      UPDATE public.site_banners
      SET placement = $2,
          name = $3,
          target_url = $4,
          status = $5,
          sort_order = $6,
          starts_at = $7,
          ends_at = $8,
          updated_by = $9,
          image_data = CASE WHEN $10::boolean THEN $12 WHEN $11::boolean THEN NULL ELSE image_data END,
          image_filename = CASE WHEN $10::boolean THEN $13 WHEN $11::boolean THEN NULL ELSE image_filename END,
          image_mime_type = CASE WHEN $10::boolean THEN $14 WHEN $11::boolean THEN NULL ELSE image_mime_type END,
          image_size_bytes = CASE WHEN $10::boolean THEN $15 WHEN $11::boolean THEN NULL ELSE image_size_bytes END,
          mobile_image_data = CASE WHEN $16::boolean THEN $18 WHEN $17::boolean THEN NULL ELSE mobile_image_data END,
          mobile_image_filename = CASE WHEN $16::boolean THEN $19 WHEN $17::boolean THEN NULL ELSE mobile_image_filename END,
          mobile_image_mime_type = CASE WHEN $16::boolean THEN $20 WHEN $17::boolean THEN NULL ELSE mobile_image_mime_type END,
          mobile_image_size_bytes = CASE WHEN $16::boolean THEN $21 WHEN $17::boolean THEN NULL ELSE mobile_image_size_bytes END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `,
    params,
  );
  return result.rows[0]?.id || null;
}

export async function deleteManagedBanner(bannerId: string) {
  await ensureBannerManagementSchema();
  const result = await query<{ id: string }>(
    "DELETE FROM public.site_banners WHERE id = $1 RETURNING id",
    [bannerId],
  );
  return Boolean(result.rows[0]);
}

export async function getManagedBannerImage(bannerId: string, variant: "desktop" | "mobile") {
  await ensureBannerManagementSchema();
  const result = await query<{
    image_data: Buffer | null;
    image_mime_type: string | null;
    image_filename: string | null;
  }>(
    variant === "mobile"
      ? `SELECT
           COALESCE(mobile_image_data, image_data) AS image_data,
           COALESCE(mobile_image_mime_type, image_mime_type) AS image_mime_type,
           COALESCE(mobile_image_filename, image_filename) AS image_filename
         FROM public.site_banners WHERE id = $1 LIMIT 1`
      : `SELECT image_data, image_mime_type, image_filename FROM public.site_banners WHERE id = $1 LIMIT 1`,
    [bannerId],
  );
  return result.rows[0] || null;
}

function validateBannerInput(input: BannerInput) {
  const placement = input.placement as BannerPlacement;
  if (!BANNER_PLACEMENTS.some((item) => item.key === placement)) {
    throw new Error("배너 노출 위치를 선택해 주세요.");
  }
  const name = String(input.name || "").trim();
  if (!name || name.length > 120) throw new Error("관리용 배너명은 1~120자로 입력해 주세요.");
  const targetUrl = String(input.targetUrl || "").trim();
  if (targetUrl.length > 2_000 || (targetUrl && !isSafeTargetUrl(targetUrl))) {
    throw new Error("이동 URL은 /로 시작하는 내부 경로 또는 http(s) URL로 입력해 주세요.");
  }
  const status = input.status as BannerStatus;
  if (!(["draft", "active", "inactive"] as string[]).includes(status)) {
    throw new Error("배너 상태가 올바르지 않습니다.");
  }
  const sortOrder = Math.floor(Number(input.sortOrder));
  if (!Number.isFinite(sortOrder) || sortOrder < 0 || sortOrder > 999) {
    throw new Error("노출 순서는 0~999 사이로 입력해 주세요.");
  }
  const startsAt = parseBannerDate(input.startsAt, "노출 시작일시");
  const endsAt = parseBannerDate(input.endsAt, "노출 종료일시");
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("노출 종료일시는 시작일시보다 이후여야 합니다.");
  }
  if (input.image) validateImage(input.image);
  if (input.mobileImage) validateImage(input.mobileImage);
  return { ...input, placement, name, targetUrl, status, sortOrder, startsAt, endsAt };
}

function parseBannerDate(value: string, label: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) throw new Error(`${label}가 올바르지 않습니다.`);
  return parsed.toISOString();
}

function validateImage(image: NonNullable<BannerInput["image"]>) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(image.mimeType)) throw new Error("JPG, PNG, WEBP, GIF 이미지만 등록할 수 있습니다.");
  if (!image.data.length || image.data.length > MAX_BANNER_IMAGE_BYTES) {
    throw new Error("배너 이미지는 파일당 500KB 이하로 등록해 주세요.");
  }
  if (!image.filename || image.filename.length > 255) throw new Error("이미지 파일명이 올바르지 않습니다.");
}

function isSafeTargetUrl(value: string) {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function mapBanner(row: BannerRow): ManagedBanner {
  return {
    id: row.id,
    placement: row.placement,
    name: row.name,
    targetUrl: row.target_url || "",
    status: row.status,
    sortOrder: Number(row.sort_order || 0),
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    imageFilename: row.image_filename || "",
    imageMimeType: row.image_mime_type || "",
    imageSizeBytes: Number(row.image_size_bytes || 0),
    hasImage: Boolean(row.has_image),
    mobileImageFilename: row.mobile_image_filename || "",
    mobileImageMimeType: row.mobile_image_mime_type || "",
    mobileImageSizeBytes: Number(row.mobile_image_size_bytes || 0),
    hasMobileImage: Boolean(row.has_mobile_image),
    updatedAt: new Date(row.updated_at).toISOString(),
    updatedByName: row.updated_by_name || "관리자",
  };
}
