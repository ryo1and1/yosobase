import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/admin-auth";
import { getCronSecret } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronAuthorized(request: NextRequest): boolean {
  const expected = getCronSecret();
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  return bearer === expected || isAdminAuthorized(request);
}

async function invokeStep(request: NextRequest, path: string) {
  const authorization = request.headers.get("authorization");
  const response = await fetch(new URL(path, request.nextUrl.origin), {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
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

export async function POST(request: NextRequest) {
  return handleCronRequest(request);
}
