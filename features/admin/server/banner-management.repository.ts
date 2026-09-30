import { query } from "@/features/admin/server/db";

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
  contentMarkup: string;
  targetUrl: string;
  status: BannerStatus;
  sortOrder: number;
  imageFilename: string;
  imageMimeType: string;
  imageSizeBytes: number;
  hasImage: boolean;
  updatedAt: string;
  updatedByName: string;
};

export type BannerInput = {
  placement: string;
  name: string;
  contentMarkup: string;
  targetUrl: string;
  status: string;
  sortOrder: number;
  image?: { data: Buffer; filename: string; mimeType: string } | null;
  removeImage?: boolean;
};

type BannerRow = {
  id: string;
  placement: BannerPlacement;
  name: string;
  content_markup: string | null;
  target_url: string | null;
  status: BannerStatus;
  sort_order: number;
  image_filename: string | null;
  image_mime_type: string | null;
  image_size_bytes: number | string | null;
  has_image: boolean;
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
      content_markup TEXT NOT NULL DEFAULT '',
      target_url TEXT,
      image_data BYTEA,
      image_filename VARCHAR(255),
      image_mime_type VARCHAR(80),
      image_size_bytes INTEGER,
      status VARCHAR(20) NOT NULL DEFAULT 'draft',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT site_banners_placement_check CHECK (
        placement IN ('home_main', 'ai_tools_main', 'resume_coaching', 'interview_coaching', 'job_detail')
      ),
      CONSTRAINT site_banners_status_check CHECK (status IN ('draft', 'active', 'inactive')),
      CONSTRAINT site_banners_sort_order_check CHECK (sort_order BETWEEN 0 AND 999),
      CONSTRAINT site_banners_image_size_check CHECK (
        image_size_bytes IS NULL OR image_size_bytes BETWEEN 1 AND 5242880
      )
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_site_banners_placement_status_sort
      ON public.site_banners(placement, status, sort_order, updated_at DESC)
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
      banners.content_markup,
      banners.target_url,
      banners.status,
      banners.sort_order,
      banners.image_filename,
      banners.image_mime_type,
      banners.image_size_bytes,
      (banners.image_data IS NOT NULL) AS has_image,
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
  const result = await query<{ id: string }>(
    `
      INSERT INTO public.site_banners (
        placement, name, content_markup, target_url,
        image_data, image_filename, image_mime_type, image_size_bytes,
        status, sort_order, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
      RETURNING id
    `,
    [
      value.placement,
      value.name,
      value.contentMarkup,
      value.targetUrl || null,
      value.image?.data || null,
      value.image?.filename || null,
      value.image?.mimeType || null,
      value.image?.data.length || null,
      value.status,
      value.sortOrder,
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
  const imageSql = value.image
    ? `image_data = $9, image_filename = $10, image_mime_type = $11, image_size_bytes = $12,`
    : value.removeImage
      ? `image_data = NULL, image_filename = NULL, image_mime_type = NULL, image_size_bytes = NULL,`
      : "";
  const params: unknown[] = [
    bannerId,
    value.placement,
    value.name,
    value.contentMarkup,
    value.targetUrl || null,
    value.status,
    value.sortOrder,
    adminUserId,
  ];
  if (value.image) {
    params.push(value.image.data, value.image.filename, value.image.mimeType, value.image.data.length);
  }
  const result = await query<{ id: string }>(
    `
      UPDATE public.site_banners
      SET placement = $2,
          name = $3,
          content_markup = $4,
          target_url = $5,
          status = $6,
          sort_order = $7,
          updated_by = $8,
          ${imageSql}
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

export async function getManagedBannerImage(bannerId: string) {
  await ensureBannerManagementSchema();
  const result = await query<{
    image_data: Buffer | null;
    image_mime_type: string | null;
    image_filename: string | null;
  }>(
    `SELECT image_data, image_mime_type, image_filename FROM public.site_banners WHERE id = $1 LIMIT 1`,
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
  const contentMarkup = String(input.contentMarkup || "").trim();
  if (contentMarkup.length > 50_000) throw new Error("배너 내용은 50,000자 이하로 입력해 주세요.");
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
  if (input.image) validateImage(input.image);
  return { ...input, placement, name, contentMarkup, targetUrl, status, sortOrder };
}

function validateImage(image: NonNullable<BannerInput["image"]>) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(image.mimeType)) throw new Error("JPG, PNG, WEBP, GIF 이미지만 등록할 수 있습니다.");
  if (!image.data.length || image.data.length > 5 * 1024 * 1024) {
    throw new Error("배너 이미지는 5MB 이하로 등록해 주세요.");
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
    contentMarkup: row.content_markup || "",
    targetUrl: row.target_url || "",
    status: row.status,
    sortOrder: Number(row.sort_order || 0),
    imageFilename: row.image_filename || "",
    imageMimeType: row.image_mime_type || "",
    imageSizeBytes: Number(row.image_size_bytes || 0),
    hasImage: Boolean(row.has_image),
    updatedAt: new Date(row.updated_at).toISOString(),
    updatedByName: row.updated_by_name || "관리자",
  };
}
