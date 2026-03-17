import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/auth/logout-button";
import { ensurePublicUserProfile } from "@/lib/public-user-profile";
import { publicUserCodeFromId } from "@/lib/public-user-code";
import { createClient } from "@/lib/supabase/server";

type TeamRelation = { name: string }[] | { name: string } | null;

type UserProfileRow = {
  display_name: string;
  email: string | null;
  favorite_team_id: string | null;
  favorite_team: TeamRelation;
};

function normalizeTeamName(team: TeamRelation): string | null {
  if (!team) {
    return null;
  }
  if (Array.isArray(team)) {
    return team[0]?.name ?? null;
  }
  return team.name ?? null;
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensurePublicUserProfile(supabase, user);

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, email, favorite_team_id, favorite_team:teams!users_favorite_team_id_fkey(name)")
    .eq("id", user.id)
    .maybeSingle<UserProfileRow>();

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "ユーザー";
  const favoriteTeam = normalizeTeamName(profile?.favorite_team ?? null) ?? "未設定";
  const publicCode = publicUserCodeFromId(user.id);

  return (
    <div className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">My Page</p>
          <h1>マイページ</h1>
          <p>ログイン中のアカウント情報です。</p>
        </div>
      </header>

      <section className="auth-status-card">
        <p className="auth-status-label">ログイン中</p>
        <strong>{displayName}</strong>
        <span>{user.email ?? profile?.email ?? ""}</span>
        <span>公開ID: #{publicCode}</span>
        <span>好きな球団: {favoriteTeam}</span>

        <div className="auth-inline-actions">
          <Link href="/me" className="auth-secondary-btn">
            成績を見る
          </Link>
          <LogoutButton className="auth-primary-btn" redirectTo="/login" />
        </div>
      </section>
    </div>
  );
}
