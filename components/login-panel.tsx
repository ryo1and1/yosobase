"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Team } from "@/lib/types";

type AuthUser = {
  id: string;
  display_name: string;
  email: string;
  favorite_team_id: string | null;
};

type AuthMeResponse =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      user: AuthUser;
    };

type RegisterForm = {
  display_name: string;
  email: string;
  password: string;
  favorite_team_id: string;
};

type LoginForm = {
  email: string;
  password: string;
};

async function parseJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function readError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return fallback;
}

export function LoginPanel() {
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<"register" | "login">("register");
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingAuthState, setLoadingAuthState] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    display_name: "",
    email: "",
    password: "",
    favorite_team_id: ""
  });
  const [loginForm, setLoginForm] = useState<LoginForm>({
    email: "",
    password: ""
  });

  const returnTo = useMemo(() => {
    const raw = searchParams.get("returnTo");
    if (!raw) return null;
    return raw.startsWith("/") ? raw : null;
  }, [searchParams]);

  const focus = useMemo(() => {
    const raw = searchParams.get("focus");
    return raw === "prediction" ? raw : null;
  }, [searchParams]);

  const redirectTo = useMemo(() => {
    if (!returnTo) return null;
    if (!focus) return returnTo;
    const separator = returnTo.includes("?") ? "&" : "?";
    return `${returnTo}${separator}focus=${encodeURIComponent(focus)}`;
  }, [focus, returnTo]);

  function redirectAfterAuth() {
    window.location.assign(redirectTo ?? "/");
  }

  useEffect(() => {
    async function initialize() {
      setLoadingTeams(true);
      setLoadingAuthState(true);

      try {
        const [teamsRes, meRes] = await Promise.all([
          fetch("/api/teams", { cache: "no-store" }),
          fetch("/api/auth/me", { cache: "no-store" })
        ]);

        const teamsPayload = await parseJson(teamsRes);
        if (teamsRes.ok && teamsPayload && typeof teamsPayload === "object" && "teams" in teamsPayload && Array.isArray(teamsPayload.teams)) {
          const nextTeams = teamsPayload.teams.filter((row): row is Team => {
            return Boolean(row && typeof row === "object" && typeof row.id === "string" && typeof row.name === "string");
          });
          setTeams(nextTeams);
        }

        const mePayload = (await parseJson(meRes)) as AuthMeResponse | null;
        if (meRes.ok && mePayload?.authenticated) {
          setCurrentUser(mePayload.user);
          setLoginForm((current) => ({ ...current, email: mePayload.user.email }));
        } else {
          setCurrentUser(null);
        }
      } finally {
        setLoadingTeams(false);
        setLoadingAuthState(false);
      }
    }

    void initialize();
  }, []);

  async function onRegisterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(registerForm)
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(readError(payload, "会員登録に失敗しました。"));
      }

      const user =
        payload && typeof payload === "object" && "user" in payload && payload.user && typeof payload.user === "object"
          ? (payload.user as AuthUser)
          : null;

      if (!user) {
        throw new Error("会員登録結果の形式が不正です。");
      }

      setCurrentUser(user);
      setLoginForm((current) => ({
        ...current,
        email: user.email
      }));
      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "会員登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginForm)
      });

      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(readError(payload, "ログインに失敗しました。"));
      }

      const user =
        payload && typeof payload === "object" && "user" in payload && payload.user && typeof payload.user === "object"
          ? (payload.user as AuthUser)
          : null;

      if (!user) {
        throw new Error("ログイン結果の形式が不正です。");
      }

      setCurrentUser(user);
      redirectAfterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function onLogout() {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      const payload = await parseJson(response);
      if (!response.ok) {
        throw new Error(readError(payload, "ログアウトに失敗しました。"));
      }

      setCurrentUser(null);
      setMessage("ログアウトしました。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログアウトに失敗しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">アカウント</p>
          <h1>会員登録 / ログイン</h1>
          <p>ニックネーム・メールアドレス・パスワードで登録できます。好きな球団は任意です。</p>
        </div>
      </header>

      {returnTo ? <p className="auth-return-note">ログイン後に元のページへ戻ります。</p> : null}

      {loadingAuthState ? (
        <section className="auth-status-card">
          <p>認証状態を確認しています...</p>
        </section>
      ) : currentUser ? (
        <section className="auth-status-card">
          <p className="auth-status-label">ログイン中</p>
          <strong>{currentUser.display_name}</strong>
          <span>{currentUser.email}</span>
          <button type="button" className="auth-secondary-btn" onClick={() => void onLogout()} disabled={submitting}>
            ログアウト
          </button>
        </section>
      ) : null}

      <section className="auth-card">
        <div className="auth-tabs">
          <button type="button" className={`auth-tab ${mode === "register" ? "is-active" : ""}`} onClick={() => setMode("register")}>
            会員登録
          </button>
          <button type="button" className={`auth-tab ${mode === "login" ? "is-active" : ""}`} onClick={() => setMode("login")}>
            ログイン
          </button>
        </div>

        {mode === "register" ? (
          <form onSubmit={onRegisterSubmit} className="auth-form-grid">
            <label className="auth-field" htmlFor="register-display-name">
              <span>ニックネーム</span>
              <input
                id="register-display-name"
                type="text"
                maxLength={32}
                value={registerForm.display_name}
                onChange={(event) => setRegisterForm((current) => ({ ...current, display_name: event.target.value }))}
                placeholder="例: 太郎"
                autoComplete="nickname"
              />
            </label>

            <label className="auth-field" htmlFor="register-email">
              <span>メールアドレス</span>
              <input
                id="register-email"
                type="email"
                value={registerForm.email}
                onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="auth-field" htmlFor="register-password">
              <span>パスワード</span>
              <input
                id="register-password"
                type="password"
                minLength={8}
                value={registerForm.password}
                onChange={(event) => setRegisterForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="********"
                autoComplete="new-password"
              />
            </label>

            <label className="auth-field" htmlFor="register-favorite-team">
              <span>好きな球団（任意）</span>
              <select
                id="register-favorite-team"
                value={registerForm.favorite_team_id}
                onChange={(event) => setRegisterForm((current) => ({ ...current, favorite_team_id: event.target.value }))}
                disabled={loadingTeams}
              >
                <option value="">あとで選ぶ</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="auth-primary-btn" disabled={submitting || loadingTeams}>
              {submitting ? "登録中..." : "会員登録する"}
            </button>
          </form>
        ) : (
          <form onSubmit={onLoginSubmit} className="auth-form-grid">
            <label className="auth-field" htmlFor="login-email">
              <span>メールアドレス</span>
              <input
                id="login-email"
                type="email"
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="auth-field" htmlFor="login-password">
              <span>パスワード</span>
              <input
                id="login-password"
                type="password"
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                placeholder="********"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="auth-primary-btn" disabled={submitting}>
              {submitting ? "ログイン中..." : "ログインする"}
            </button>
          </form>
        )}
      </section>

      {message ? <p className="auth-message is-success">{message}</p> : null}
      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
