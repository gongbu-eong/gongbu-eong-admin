import { NextRequest, NextResponse } from "next/server";
import { processAnalyticsFactQueue } from "@/features/admin/server/analytics-fact-worker.repository";
import { ADMIN_ANALYTICS_RELEASE } from "@/features/admin/traffic-channel";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";

const responseHeaders = {
  "Cache-Control": "no-store, no-transform",
  "X-Admin-Analytics-Release": ADMIN_ANALYTICS_RELEASE,
};

function isAuthorized(request: NextRequest) {
  const expected = process.env.ANALYTICS_FACT_WORKER_KEY;
  return Boolean(expected) && request.headers.get("x-analytics-fact-worker-key") === expected;
}

// Public release probe only: no database query, queue claim, or configuration.
export async function GET() {
  return NextResponse.json({ release: ADMIN_ANALYTICS_RELEASE }, { headers: responseHeaders });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401, headers: responseHeaders });
  }

  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "1");
  if (!Number.isInteger(requestedLimit) || requestedLimit < 1) {
    return NextResponse.json({ ok: false, message: "limit must be a positive integer" }, { status: 400, headers: responseHeaders });
  }

  const requestId = randomUUID();
  const encoder = new TextEncoder();
  let connected = true;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (text: string) => {
        if (connected) controller.enqueue(encoder.encode(text));
      };

      // Leading JSON whitespace keeps nginx's upstream read timer alive while
      // retaining the JSON response expected by Invoke-RestMethod and cron.
      send("\n");
      heartbeat = setInterval(() => send("\n"), 10_000);
      try {
        console.info("[analytics facts] HTTP refresh started", { requestId, requestedLimit, limit: 1 });
        const processed = await processAnalyticsFactQueue({ limit: 1, workerId: `http-${requestId}` });
        send(JSON.stringify({ ok: true, processed, requestId, release: ADMIN_ANALYTICS_RELEASE }));
      } catch (error) {
        console.error("[analytics facts] Queue processing failed", { requestId, error });
        // Headers have already been sent. Clients must check ok, not HTTP 200.
        send(JSON.stringify({
          ok: false,
          requestId,
          release: ADMIN_ANALYTICS_RELEASE,
          message: "Refresh failed. Check analytics_fact_refresh_queue and worker logs before retrying.",
        }));
      } finally {
        clearInterval(heartbeat);
        if (connected) controller.close();
      }
    },
    cancel() {
      connected = false;
      clearInterval(heartbeat);
      // A disconnected client must not release a still-running database claim.
    },
  });

  return new NextResponse(stream, {
    headers: {
      ...responseHeaders,
      "Content-Type": "application/json; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}
