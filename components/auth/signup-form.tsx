"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildAuthConfirmPath, buildQuerySuffix } from "@/lib/auth-redirect";
import { mapSignUpError } from "@/lib/auth-feedback";
import { getAppBaseUrl } from "@/lib/app-url";
import { isValidEmail, isValidPassword, normalizeEmail } from "@/lib/auth-validation";
import { writePendingSignupEmail } from "@/lib/pending-signup";
import { createClient } from "@/lib/supabase/client";

type SignupFormProps = {
  returnTo: string | null;
  focus: string | null;
};

type Team = {
  id: string;
  name: string;
};

type TeamsResponse = {
  teams?: Team[];
};

function normalizeDisplayName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function SignupForm({ returnTo, focus }: SignupFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [favoriteTeamId, setFavoriteTeamId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTeams() {
      try {
        const response = await fetch("/api/teams", {
          cache: "no-store"
        });
        const payload = (await response.json()) as TeamsResponse;

        if (!response.ok || !Array.isArray(payload.teams)) {
          return;
        }

        if (isMounted) {
          setTeams(payload.teams);
        }
      } catch {
        // Keep signup usable even if the optional team list fails to load.
      } finally {
        if (isMounted) {
          setIsLoadingTeams(false);
        }
      }
    }

    void loadTeams();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedDisplayName = normalizeDisplayName(displayName);

    if (!normalizedDisplayName || normalizedDisplayName.length > 32) {
      setError("ニックネームは1文字以上32文字以内で入力してください。");
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError("メールアドレスの形式が正しくありません。");
      return;
    }
    if (!isValidPassword(password)) {
      setError("パスワードは8文字以上で入力してください。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致しません。");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const { error: signUpError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: new URL(buildAuthConfirmPath(returnTo, focus), getAppBaseUrl()).toString(),
        data: {
          display_name: normalizedDisplayName,
          favorite_team_id: favoriteTeamId || null
        }
      }
    });

    if (signUpError) {
      setError(mapSignUpError(signUpError));
      setIsSubmitting(false);
      return;
    }

    writePendingSignupEmail(normalizedEmail);
    router.replace(`/signup/confirm${buildQuerySuffix(returnTo, focus)}`);
    router.refresh();
  }

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>会員登録</h1>
          <p>ニックネームと好きな球団を登録してから、メール認証へ進めます。</p>
        </div>
      </header>

      {returnTo ? <p className="auth-return-note">認証後に元のページへ戻る導線を保持します。</p> : null}

      <section className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form-grid">
          <label className="auth-field" htmlFor="signup-display-name">
            <span>ニックネーム</span>
            <input
              id="signup-display-name"
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="例: 太郎"
              autoComplete="nickname"
              maxLength={32}
            />
          </label>

          <label className="auth-field" htmlFor="signup-email">
            <span>メールアドレス</span>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field" htmlFor="signup-password">
            <span>パスワード</span>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8文字以上"
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field" htmlFor="signup-password-confirm">
            <span>パスワード確認</span>
            <input
              id="signup-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field" htmlFor="signup-favorite-team">
            <span>好きな球団</span>
            <select
              id="signup-favorite-team"
              value={favoriteTeamId}
              onChange={(event) => setFavoriteTeamId(event.target.value)}
              disabled={isLoadingTeams}
            >
              <option value="">{isLoadingTeams ? "読み込み中..." : "あとで選ぶ"}</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : "会員登録する"}
          </button>
        </form>
      </section>

      <div className="auth-links-row">
        <Link href={`/login${buildQuerySuffix(returnTo, focus)}`} className="auth-text-link">
          すでに登録済みの方はこちら
        </Link>
      </div>

      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
