"use client";

import Link from "next/link";
import { useState } from "react";
import { mapForgotPasswordError } from "@/lib/auth-feedback";
import { normalizeEmail, isValidEmail } from "@/lib/auth-validation";
import { getAppBaseUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      setError("メールアドレスの形式が正しくありません。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: new URL("/auth/reset-password", getAppBaseUrl()).toString()
    });

    if (resetError) {
      setError(mapForgotPasswordError(resetError));
      setIsSubmitting(false);
      return;
    }

    setMessage("パスワード再設定メールを送信しました。メールをご確認ください。");
    setIsSubmitting(false);
  }

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>パスワード再設定</h1>
          <p>登録済みメールアドレスに再設定用リンクを送信します。</p>
        </div>
      </header>

      <section className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form-grid">
          <label className="auth-field" htmlFor="forgot-password-email">
            <span>メールアドレス</span>
            <input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
            {isSubmitting ? "送信中..." : "送信する"}
          </button>
        </form>
      </section>

      <div className="auth-links-row">
        <Link href="/login" className="auth-text-link">
          ログインへ戻る
        </Link>
      </div>

      {message ? <p className="auth-message is-success">{message}</p> : null}
      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
