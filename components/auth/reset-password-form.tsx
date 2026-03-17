"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { mapResetPasswordError } from "@/lib/auth-feedback";
import { isValidPassword } from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canUpdatePassword, setCanUpdatePassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!cancelled) {
        setCanUpdatePassword(Boolean(session));
        setIsInitializing(false);
      }
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) {
        return;
      }

      if (event === "PASSWORD_RECOVERY" || Boolean(session)) {
        setCanUpdatePassword(Boolean(session));
      }

      setIsInitializing(false);
    });

    void loadSession();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    if (!canUpdatePassword) {
      setError("再設定メール内のリンクからこのページを開いてください。");
      setMessage(null);
      return;
    }
    if (!isValidPassword(password)) {
      setError("パスワードは8文字以上で入力してください。");
      setMessage(null);
      return;
    }
    if (password !== passwordConfirm) {
      setError("確認用パスワードが一致しません。");
      setMessage(null);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password
    });

    if (updateError) {
      setError(mapResetPasswordError(updateError));
      setIsSubmitting(false);
      return;
    }

    setMessage("パスワードを更新しました。再度ログインしてください。");
    await supabase.auth.signOut();
    router.replace("/login?message=password_updated");
    router.refresh();
  }

  return (
    <section className="auth-page">
      <header className="auth-head">
        <div>
          <p className="auth-kicker">Account</p>
          <h1>新しいパスワードを設定</h1>
          <p>メールのリンクからアクセスした場合のみ更新できます。</p>
        </div>
      </header>

      {!canUpdatePassword && !isInitializing ? (
        <p className="auth-return-note">再設定メール内のリンクからこのページを開いてください。</p>
      ) : null}

      <section className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form-grid">
          <label className="auth-field" htmlFor="reset-password">
            <span>新しいパスワード</span>
            <input
              id="reset-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8文字以上"
              autoComplete="new-password"
            />
          </label>

          <label className="auth-field" htmlFor="reset-password-confirm">
            <span>新しいパスワード確認</span>
            <input
              id="reset-password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="もう一度入力"
              autoComplete="new-password"
            />
          </label>

          <button type="submit" className="auth-primary-btn" disabled={isSubmitting || isInitializing || !canUpdatePassword}>
            {isSubmitting ? "更新中..." : "更新する"}
          </button>
        </form>
      </section>

      {message ? <p className="auth-message is-success">{message}</p> : null}
      {error ? <p className="auth-message is-error">{error}</p> : null}
    </section>
  );
}
