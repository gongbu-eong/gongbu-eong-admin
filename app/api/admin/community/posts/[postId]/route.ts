import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { updateCommunityPostModeration } from "@/features/admin/server/community-management.repository";

type Context = { params: Promise<{ postId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  if (!(await getAdminSession())) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });
  try {
    const { postId } = await params;
    const updated = await updateCommunityPostModeration(postId, await request.json());
    return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ ok: false, message: "게시글을 찾을 수 없습니다." }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : "게시글 상태를 변경하지 못했습니다." }, { status: 400 });
  }
}
