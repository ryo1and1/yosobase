import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupConfirmPanel } from "@/components/auth/signup-confirm-panel";
import { buildPostAuthPath, sanitizeFocus, sanitizeReturnTo } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function SignupConfirmPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string; focus?: string }>;
}) {
  const params = await searchParams;
  const returnTo = sanitizeReturnTo(params.returnTo);
  const focus = sanitizeFocus(params.focus);
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect(buildPostAuthPath(returnTo, focus));
  }

  return <SignupConfirmPanel returnTo={returnTo} focus={focus} />;
}
