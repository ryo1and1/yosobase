import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { buildPostAuthPath, sanitizeFocus, sanitizeReturnTo } from "@/lib/auth-redirect";
import { ensurePublicUserProfile } from "@/lib/public-user-profile";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = sanitizeReturnTo(searchParams.get("next"));
  const focus = sanitizeFocus(searchParams.get("focus"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash
    });

    if (!error) {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        try {
          await ensurePublicUserProfile(supabase, user);
        } catch {
          // Profile creation is best-effort here. The authenticated session is already valid.
        }
      }

      return NextResponse.redirect(new URL(buildPostAuthPath(next, focus), request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_confirm_failed", request.url));
}
