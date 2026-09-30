import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import {
  deleteManagedBanner,
  updateManagedBanner,
} from "@/features/admin/server/banner-management.repository";
import { parseBannerFormData } from "@/features/admin/server/banner-request";

export const runtime = "nodejs";

type Context = { params: Promise<{ bannerId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  try {
    const { bannerId } = await params;
    const id = await updateManagedBanner(
      bannerId,
      await parseBannerFormData(request),
      admin.adminUserId,
    );
    return id
      ? NextResponse.json({ ok: true, id })
      : NextResponse.json({ ok: false, message: "배너를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "배너를 수정하지 못했습니다." },
      { status: 400 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) {
    return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  }
  const { bannerId } = await params;
  const deleted = await deleteManagedBanner(bannerId);
  return deleted
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, message: "배너를 찾을 수 없습니다." }, { status: 404 });
}
