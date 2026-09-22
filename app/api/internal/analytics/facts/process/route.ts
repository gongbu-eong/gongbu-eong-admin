import { NextRequest, NextResponse } from "next/server";
import { processAnalyticsFactQueue } from "@/features/admin/server/analytics-fact-worker.repository";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest) {
  const expected = process.env.ANALYTICS_FACT_WORKER_KEY;
  return Boolean(expected) && request.headers.get("x-analytics-fact-worker-key") === expected;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || "20");
  const processed = await processAnalyticsFactQueue({ limit: requestedLimit });

  return NextResponse.json({ ok: true, processed });
}
