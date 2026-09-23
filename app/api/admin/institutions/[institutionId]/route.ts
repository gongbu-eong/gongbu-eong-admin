import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { deleteInstitution, saveInstitution } from "@/features/admin/server/jobs-management.repository";

type Context = { params: Promise<{ institutionId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { institutionId } = await params;
    const id = await saveInstitution(await request.json(), institutionId);
    return id ? NextResponse.json({ ok: true, id }) : NextResponse.json({ ok: false, message: "기관을 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "기관을 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { institutionId } = await params;
  return (await deleteInstitution(institutionId))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, message: "연결된 공고가 있어 삭제할 수 없습니다." }, { status: 409 });
}
