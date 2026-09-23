import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { processCommunityReport } from "@/features/admin/server/community-management.repository";

type Context = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { reportId } = await params;
    const body = await request.json();
    const updated = await processCommunityReport(reportId, {
      status: String(body.status || ""),
      action: String(body.action || "none"),
      reviewNote: String(body.reviewNote || ""),
    });
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "신고를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "신고를 처리하지 못했습니다." }, { status: 400 });
  }
}
