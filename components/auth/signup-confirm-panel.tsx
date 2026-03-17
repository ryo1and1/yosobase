"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAuthConfirmPath, buildQuerySuffix } from "@/lib/auth-redirect";
import { mapResendError } from "@/lib/auth-feedback";
import { getAppBaseUrl } from "@/lib/app-url";
import { isValidEmail, normalizeEmail } from "@/lib/auth-validation";
import { readPendingSignupEmail, writePendingSignupEmail } from "@/lib/pending-signup";
import { createClient } from "@/lib/supabase/client";

type SignupConfirmPanelProps = {
  returnTo: string | null;
  focus: string | null;
};

export function SignupConfirmPanel({ returnTo, focus }: SignupConfirmPanelProps) {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(readPendingSignupEmail());
  }, []);

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

    writePendingSignupEmail(normalizedEmail);
    setEmail(normalizedEmail);
    setMessage("確認メールを再送しました。メールをご確認ください。");
    setIsResending(false);
  }

  const linkSuffix = buildQuerySuffix(returnTo, focus);

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>確認メールを送信しました</h1>
          <p>登録したメールアドレス宛に確認メールを送っています。メール内のリンクを開くと会員登録が完了します。</p>
        </div>
      </header>

      <section className="auth-status-card">
        <span className="auth-status-label">Email</span>
        <strong>{email || "会員登録に使ったメールアドレス"}</strong>
        <p>メールが見当たらない場合は、迷惑メールフォルダも確認してください。</p>
      </section>

      <section className="auth-card">
        <div className="auth-form-grid">
          <p className="auth-form-note">確認メールを再送する場合は、登録したメールアドレスを確認してから実行してください。</p>

          <label className="auth-field" htmlFor="signup-confirm-email">
            <span>メールアドレス</span>
            <input
              id="signup-confirm-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          <button type="button" className="auth-secondary-btn" onClick={handleResend} disabled={isResending}>
            {isResending ? "再送中..." : "確認メールを再送する"}
          </button>
        </div>
      </section>

      <div className="auth-links-row">
        <Link href={`/login${linkSuffix}`} className="auth-text-link">
          ログインへ戻る
        </Link>
        <Link href={`/signup${linkSuffix}`} className="auth-text-link">
          別のメールで登録する
        </Link>
      </div>

      {message ? <p className="auth-message is-success">{message}</p> : null}
      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
