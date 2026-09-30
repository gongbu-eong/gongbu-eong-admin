import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { createManagedBanner } from "@/features/admin/server/banner-management.repository";
import { parseBannerFormData } from "@/features/admin/server/banner-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const id = await createManagedBanner(await parseBannerFormData(request), admin.adminUserId);
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "배너를 등록하지 못했습니다." },
      { status: 400 },
    );
  }
}
