import type { SupabaseClient, User } from "@supabase/supabase-js";

function normalizeDisplayName(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function displayNameFromEmail(email: string | null | undefined): string {
  const localPart = email?.split("@")[0]?.trim() ?? "";
  return localPart || "ユーザー";
}

function sanitizeFavoriteTeamId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

export async function ensurePublicUserProfile(supabase: SupabaseClient, user: User): Promise<void> {
  const { data: existingUser, error: existingUserError } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (existingUserError) {
    throw new Error(existingUserError.message);
  }
  if (existingUser) {
    return;
  }

  const metadata = typeof user.user_metadata === "object" && user.user_metadata ? user.user_metadata : {};
  const rawDisplayName = normalizeDisplayName(String(metadata.display_name ?? ""));
  const favoriteTeamId = sanitizeFavoriteTeamId(metadata.favorite_team_id);

  const { error: insertError } = await supabase.from("users").insert({
    id: user.id,
    email: user.email ?? null,
    display_name: rawDisplayName || displayNameFromEmail(user.email),
    favorite_team_id: favoriteTeamId
  });

  if (insertError && insertError.code !== "23505") {
    throw new Error(insertError.message);
  }
}
