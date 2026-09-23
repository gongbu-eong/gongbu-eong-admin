import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { createManualJob } from "@/features/admin/server/jobs-management.repository";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const id = await createManualJob(await request.json());
    return NextResponse.json({ ok: true, id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "공고를 등록하지 못했습니다." }, { status: 400 });
  }
}
