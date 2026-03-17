type AuthLikeError = {
  message?: string | null;
  code?: string | null;
  status?: number | null;
};

function normalizeMessage(error: AuthLikeError | null | undefined): string {
  return (error?.message ?? "").toLowerCase();
}

export function mapLoginError(error: AuthLikeError | null | undefined): string {
  const message = normalizeMessage(error);

  if (message.includes("email not confirmed")) {
    return "メール認証が完了していません。確認メールのリンクを開いてください。";
  }
  if (message.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (message.includes("too many requests")) {
    return "試行回数が多すぎます。少し時間をおいてから再度お試しください。";
  }

  return "ログインに失敗しました。入力内容をご確認のうえ、再度お試しください。";
}

export function mapSignUpError(error: AuthLikeError | null | undefined): string {
  const message = normalizeMessage(error);

  if (message.includes("user already registered")) {
    return "このメールアドレスはすでに登録されています。ログインしてください。";
  }
  if (message.includes("over_email_send_rate_limit")) {
    return "確認メールの送信回数が上限に達しました。少し時間をおいて再度お試しください。";
  }
  if (message.includes("too many requests")) {
    return "試行回数が多すぎます。少し時間をおいてから再度お試しください。";
  }

  return "会員登録に失敗しました。時間をおいて再度お試しください。";
}

export function mapResendError(error: AuthLikeError | null | undefined): string {
  const message = normalizeMessage(error);

  if (message.includes("for security purposes")) {
    return "再送の間隔が短すぎます。少し時間をおいてからお試しください。";
  }
  if (message.includes("user not found")) {
    return "このメールアドレスでは確認メールを再送できません。";
  }

  return "確認メールの再送に失敗しました。時間をおいて再度お試しください。";
}

export function mapForgotPasswordError(error: AuthLikeError | null | undefined): string {
  const message = normalizeMessage(error);

  if (message.includes("too many requests")) {
    return "再設定メールの送信回数が上限に達しました。少し時間をおいてから再度お試しください。";
  }

  return "パスワード再設定メールの送信に失敗しました。時間をおいて再度お試しください。";
}

export function mapResetPasswordError(error: AuthLikeError | null | undefined): string {
  const message = normalizeMessage(error);

  if (message.includes("same password")) {
    return "現在のパスワードとは異なる新しいパスワードを設定してください。";
  }
  if (message.includes("weak password")) {
    return "より安全なパスワードを設定してください。";
  }

  return "パスワードの更新に失敗しました。もう一度お試しください。";
}
