"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { buildAuthConfirmPath, buildPostAuthPath, buildQuerySuffix } from "@/lib/auth-redirect";
import { mapLoginError, mapResendError } from "@/lib/auth-feedback";
import { getAppBaseUrl } from "@/lib/app-url";
import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

type LoginFormProps = {
  returnTo: string | null;
  focus: string | null;
  errorCode: string | null;
  messageCode: string | null;
};

function initialMessage(messageCode: string | null): string | null {
  if (messageCode === "password_updated") {
    return "パスワードを更新しました。再度ログインしてください。";
  }
  return null;
}

function initialError(errorCode: string | null): string | null {
  if (errorCode === "auth_confirm_failed") {
    return "メール認証の処理に失敗しました。確認メールのリンクからもう一度お試しください。";
  }
  return null;
}

function isEmailNotConfirmedError(message: string | null | undefined): boolean {
  return (message ?? "").toLowerCase().includes("email not confirmed");
}

export function LoginForm({ returnTo, focus, errorCode, messageCode }: LoginFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage(messageCode));
  const [error, setError] = useState<string | null>(initialError(errorCode));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("メールアドレスの形式が正しくありません。");
      setMessage(null);
      setCanResendConfirmation(false);
      return;
    }
    if (!password) {
      setError("パスワードを入力してください。");
      setMessage(null);
      setCanResendConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);
    setCanResendConfirmation(false);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (signInError) {
      setCanResendConfirmation(isEmailNotConfirmedError(signInError.message));
      setError(mapLoginError(signInError));
      setIsSubmitting(false);
      return;
    }

    router.replace(buildPostAuthPath(returnTo, focus));
    router.refresh();
  }

  async function handleResend() {
    if (isResending) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("確認メールを再送するメールアドレスを入力してください。");
      setMessage(null);
      return;
    }

    setIsResending(true);
    setMessage(null);
    setError(null);

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: {
        emailRedirectTo: new URL(buildAuthConfirmPath(returnTo, focus), getAppBaseUrl()).toString()
      }
    });

    if (resendError) {
      setError(mapResendError(resendError));
      setIsResending(false);
      return;
    }

    setMessage("確認メールを再送しました。メールをご確認ください。");
    setIsResending(false);
  }

  const linkSuffix = buildQuerySuffix(returnTo, focus);

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>ログイン</h1>
          <p>メールアドレスとパスワードでログインできます。</p>
        </div>
      </header>

      {returnTo ? <p className="auth-return-note">ログイン後に元のページへ戻る導線を保持します。</p> : null}

      <section className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form-grid">
          <label className="auth-field" htmlFor="login-email">
            <span>メールアドレス</span>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <label className="auth-field" htmlFor="login-password">
            <span>パスワード</span>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="********"
              autoComplete="current-password"
            />
          </label>

          <button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "ログイン中..." : "ログインする"}
          </button>
        </form>
      </section>

      <div className="auth-links-row">
        <Link href={`/signup${linkSuffix}`} className="auth-text-link">
          会員登録はこちら
        </Link>
        <Link href="/forgot-password" className="auth-text-link">
          パスワードを忘れた方
        </Link>
      </div>

      {canResendConfirmation ? (
        <button type="button" className="auth-secondary-btn auth-inline-button" onClick={handleResend} disabled={isResending}>
          {isResending ? "再送中..." : "確認メールを再送する"}
        </button>
      ) : null}

      {message ? <p className="auth-message is-success">{message}</p> : null}
      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
