import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  getAdminAlimtalkTemplate,
  sendAdminAlimtalk,
} from "@/features/admin/server/alimtalk";
import { getAdminSession } from "@/features/admin/server/auth.repository";
import { getEligibleNotificationRecipients } from "@/features/admin/server/notification-management.repository";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RECIPIENTS = 100;
const SEND_CONCURRENCY = 5;

type SendOutcome = {
  status: "sent" | "failed";
  reason?: string;
};

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json(
      { ok: false, message: "관리자 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as { userIds?: unknown } | null;
  const userIds = Array.isArray(payload?.userIds)
    ? Array.from(
        new Set(
          payload.userIds.filter(
            (value): value is string => typeof value === "string" && UUID_PATTERN.test(value),
          ),
        ),
      )
    : [];

  if (!userIds.length || userIds.length > MAX_RECIPIENTS) {
    return NextResponse.json(
      { ok: false, message: `발송 대상은 1명 이상 ${MAX_RECIPIENTS}명 이하로 선택해 주세요.` },
      { status: 400 },
    );
  }

  const template = getAdminAlimtalkTemplate();
  if (!template) {
    return NextResponse.json(
      { ok: false, message: "관리자 알림톡 템플릿 설정이 누락되었습니다." },
      { status: 503 },
    );
  }

  const recipients = await getEligibleNotificationRecipients(userIds);
  const batchId = randomUUID();
  const outcomes: SendOutcome[] = [];

  for (let index = 0; index < recipients.length; index += SEND_CONCURRENCY) {
    const chunk = recipients.slice(index, index + SEND_CONCURRENCY);
    const chunkOutcomes = await Promise.all(
      chunk.map(async (recipient): Promise<SendOutcome> => {
        try {
          await sendAdminAlimtalk({ recipientPhone: recipient.phone, template });
          return { status: "sent" };
        } catch (error) {
          console.error("[Admin Alimtalk] Send failed", {
            adminUserId: admin.adminUserId,
            userId: recipient.id,
            batchId,
            error,
          });
          return {
            status: "failed",
            reason: error instanceof Error ? error.message : "provider_error",
          };
        }
      }),
    );
    outcomes.push(...chunkOutcomes);
  }

  const reasons = outcomes.reduce<Record<string, number>>((result, outcome) => {
    if (outcome.reason) result[outcome.reason] = (result[outcome.reason] || 0) + 1;
    return result;
  }, {});
  const sent = outcomes.filter((outcome) => outcome.status === "sent").length;
  const failed = outcomes.length - sent;

  return NextResponse.json({
    ok: true,
    result: {
      requested: userIds.length,
      sent,
      skipped: userIds.length - recipients.length,
      failed,
      reasons,
      batchId,
    },
  });
}
