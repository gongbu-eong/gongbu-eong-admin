import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { archiveManagedJob, updateManagedJob } from "@/features/admin/server/jobs-management.repository";

type Context = { params: Promise<{ jobId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { jobId } = await params;
    const source = await updateManagedJob(jobId, await request.json());
    if (!source) return NextResponse.json({ ok: false, message: "공고를 찾을 수 없습니다." }, { status: 404 });
    return NextResponse.json({ ok: true, source });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "공고를 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { jobId } = await params;
  const archived = await archiveManagedJob(jobId);
  return archived
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, message: "공고를 찾을 수 없습니다." }, { status: 404 });
}
