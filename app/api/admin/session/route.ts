import { NextRequest, NextResponse } from "next/server";
import {
  createAdminSessionValue,
  getAdminCookieName,
  getAdminSessionMaxAge,
  hasValidAdminSession
} from "@/lib/admin-auth";
import { getAdminSecret } from "@/lib/env";

type AdminSessionBody = {
  secret?: string;
};

function clearAdminCookie(response: NextResponse): NextResponse {
  response.cookies.set(getAdminCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/"
  });
  return response;
}

export async function POST(request: NextRequest) {
  try {
    if (hasValidAdminSession(request)) {
      return NextResponse.json({ ok: true });
    }

    const body = (await request.json()) as AdminSessionBody;
    const secret = body.secret?.trim() ?? "";
    if (!secret || secret !== getAdminSecret()) {
      return clearAdminCookie(NextResponse.json({ error: "unauthorized" }, { status: 401 }));
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(getAdminCookieName(), createAdminSessionValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: getAdminSessionMaxAge(),
      path: "/"
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed to create admin session";
    return clearAdminCookie(NextResponse.json({ error: message }, { status: 500 }));
  }
}

export async function DELETE() {
  return clearAdminCookie(NextResponse.json({ ok: true }));
}
