import { NextRequest, NextResponse } from "next/server";
import { isCronAuthorized, withCronSecret } from "@/lib/cron-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function invokeStep(request: NextRequest, path: string) {
  const response = await fetch(new URL(withCronSecret(path), request.nextUrl.origin), {
    method: "GET",
    cache: "no-store"
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `failed to run ${path}`;
    throw new Error(message);
  }

  return body;
}

async function handleCronRequest(request: NextRequest) {
  try {
    if (!isCronAuthorized(request)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const tomorrowSync = await invokeStep(request, "/api/cron/npb-sync?mode=next_day_schedule");
    const resultsSync = await invokeStep(request, "/api/cron/npb-sync?mode=results_only");
    const settle = await invokeStep(request, "/api/cron/settle");

    return NextResponse.json({
      ok: true,
      steps: {
        tomorrow_sync: tomorrowSync,
        results_sync: resultsSync,
        settle
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to run daily maintenance";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleCronRequest(request);
}
