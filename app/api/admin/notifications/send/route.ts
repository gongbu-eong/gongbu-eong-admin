import { NextResponse } from "next/server";
import { getAdminSession } from "@/features/admin/server/auth.repository";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, message: "관리자 로그인이 필요합니다." }, { status: 401 });

  const payload = await request.json().catch(() => null) as { userIds?: unknown } | null;
  const userIds = Array.isArray(payload?.userIds)
    ? Array.from(new Set(payload.userIds.filter((value): value is string => typeof value === "string" && UUID_PATTERN.test(value))))
    : [];
  if (!userIds.length || userIds.length > 100) {
    return NextResponse.json({ ok: false, message: "발송 대상은 1명 이상 100명 이하로 선택해 주세요." }, { status: 400 });
  }

  const key = process.env.ADMIN_NOTIFICATION_API_KEY?.trim();
  const backendUrl = (
    process.env.NOTIFICATION_BACKEND_URL ||
    process.env.GONGBUEONG_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
  if (!key) return NextResponse.json({ ok: false, message: "알림 발송 API 키가 설정되지 않았습니다." }, { status: 503 });

  try {
    const response = await fetch(`${backendUrl}/api/internal/admin/notifications/alimtalk`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-notification-key": key,
      },
      body: JSON.stringify({ userIds, requestedBy: admin.adminUserId }),
      cache: "no-store",
      signal: AbortSignal.timeout(120_000),
    });
    const body = await response.json().catch(() => null) as Record<string, unknown> | null;
    if (!response.ok || !body?.ok) {
      return NextResponse.json({ ok: false, message: typeof body?.message === "string" ? body.message : "백엔드 알림 발송 요청에 실패했습니다." }, { status: response.status || 502 });
    }
    return NextResponse.json(body);
  } catch (error) {
    console.error("[Admin notification] Backend request failed", error);
    return NextResponse.json({ ok: false, message: "백엔드 알림 발송 API에 연결하지 못했습니다." }, { status: 502 });
  }
}
