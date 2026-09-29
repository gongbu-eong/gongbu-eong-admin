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

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "1");
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ ok: false, message: "limit must be a positive integer" }, { status: 400 });
  }

  try {
    const processed = await processAnalyticsFactQueue({ limit: requestedLimit });
    return NextResponse.json({ ok: true, processed });
  } catch (error) {
    console.error("[analytics facts] Queue processing failed", error);
    return NextResponse.json({
      ok: false,
      message: "Refresh failed. Check analytics_fact_refresh_queue before retrying; earlier jobs may have completed.",
    }, { status: 503 });
  }
}
