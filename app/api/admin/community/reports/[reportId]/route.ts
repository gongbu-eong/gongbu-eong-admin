import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { processCommunityReport } from "@/features/admin/server/community-management.repository";

type Context = { params: Promise<{ reportId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { reportId } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)) {
      return NextResponse.json({ ok: false, message: "신고 번호가 올바르지 않습니다." }, { status: 400 });
    }
    const body = await request.json();
    const updated = await processCommunityReport(reportId, {
      decision: String(body.decision || ""),
      reviewNote: String(body.reviewNote || ""),
      expectedStatus: String(body.expectedStatus || ""),
      expectedUpdatedAt: String(body.expectedUpdatedAt || ""),
      expectedTargetStatus: String(body.expectedTargetStatus || ""),
    }, admin);
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "신고를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "신고를 처리하지 못했습니다." }, { status: error instanceof Error && error.name === "ReportConflictError" ? 409 : 400 });
  }
}
