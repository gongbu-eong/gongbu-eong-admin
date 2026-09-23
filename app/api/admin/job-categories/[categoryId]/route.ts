import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { deleteJobCategory, saveJobCategory } from "@/features/admin/server/jobs-management.repository";

type Context = { params: Promise<{ categoryId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { categoryId } = await params;
    const id = await saveJobCategory(await request.json(), categoryId);
    return id ? NextResponse.json({ ok: true, id }) : NextResponse.json({ ok: false, message: "직무를 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "직무를 수정하지 못했습니다." }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  const { categoryId } = await params;
  return (await deleteJobCategory(categoryId))
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ ok: false, message: "공고 또는 추천 기준에 연결되어 삭제할 수 없습니다." }, { status: 409 });
}
