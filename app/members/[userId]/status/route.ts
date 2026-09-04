import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { updateMemberStatus } from "@/features/admin/server/members.repository";

type MemberStatusRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(
  request: NextRequest,
  { params }: MemberStatusRouteContext,
) {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return NextResponse.json(
      { ok: false, message: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { userId } = await params;
  const body = (await request.json().catch(() => null)) as {
    status?: string;
    days?: unknown;
  } | null;
  const status = body?.status;

  if (status !== "active" && status !== "blocked" && status !== "withdrawn") {
    return NextResponse.json(
      { ok: false, message: "변경할 상태가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const days = Number(body?.days);
  if (
    status !== "active" &&
    (!Number.isInteger(days) || days < 1 || days > 365000)
  ) {
    return NextResponse.json(
      { ok: false, message: "기간은 1일부터 365000일 사이 숫자로 입력해 주세요." },
      { status: 400 },
    );
  }

  const updated = await updateMemberStatus(
    userId,
    status,
    status === "active" ? undefined : days,
  );

  if (!updated) {
    return NextResponse.json(
      { ok: false, message: "회원 상태를 변경하지 못했습니다." },
      { status: 404 },
    );
  }

  revalidatePath("/members");
  revalidatePath(`/members/${userId}`);

  return NextResponse.json({ ok: true });
}
