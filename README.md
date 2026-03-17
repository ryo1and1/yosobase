# YosoBase MVP

NPB の試合を予想してポイントを競う Next.js / Supabase / Vercel ベースの Web アプリです。

## Stack

- Next.js App Router
- TypeScript
- Supabase
- Vercel
- Google AdSense

## Environment Variables

`.env.example` をコピーして `.env.local` を作成してください。

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_API_SECRET=
CRON_SECRET=
NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT=ca-pub-1679412386569499
NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_TOP=
NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_GAME=
NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_RANKING=
```

本番では `NEXT_PUBLIC_SITE_URL=https://yosobase.com` を設定してください。

## Local Setup

1. 依存関係をインストールします。

```bash
npm install
```

2. Supabase に `db/schema.sql` と `db/seed_teams.sql` を反映します。

3. 開発サーバーを起動します。

```bash
npm run dev
```

## Supabase Auth Setup

YosoBase は Supabase Auth を使って、メールアドレス + パスワード認証を行います。

### 1. Email Provider を有効化

Supabase Dashboard の `Authentication > Providers > Email` で以下を有効化してください。

- `Enable Email Provider`
- `Confirm email`

### 2. Site URL / Redirect URLs

Supabase Dashboard の `Authentication > URL Configuration` を設定してください。

- `Site URL`
  - ローカル: `http://localhost:3000`
  - 本番: `https://yosobase.com`

- `Redirect URLs`
  - `http://localhost:3000/auth/confirm`
  - `https://yosobase.com/auth/confirm`
  - `http://localhost:3000/auth/reset-password`
  - `https://yosobase.com/auth/reset-password`

Vercel Preview でも認証メールを確認したい場合は、必要に応じて Preview URL のワイルドカードも追加してください。

### 3. 確認メールテンプレート

Supabase Dashboard の `Authentication > Email Templates > Confirm signup` を、SSR 向けの token hash 方式に変更してください。

例:

```html
<h2>Confirm your signup</h2>
<p>Follow this link to confirm your user:</p>
<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">
    Confirm your email
  </a>
</p>
```

この実装では、`signUp()` の `emailRedirectTo` に `/auth/confirm` を渡し、`/auth/confirm` Route Handler 側で `verifyOtp()` を実行します。

### 4. パスワードリセット

`forgot-password` フォームでは `resetPasswordForEmail()` の `redirectTo` に `/auth/reset-password` を渡しています。

そのため `Authentication > URL Configuration` に以下が含まれている必要があります。

- `http://localhost:3000/auth/reset-password`
- `https://yosobase.com/auth/reset-password`

### 5. Resend Custom SMTP

Supabase Dashboard の `Authentication > Settings > SMTP Settings` で Custom SMTP を設定してください。

Resend SMTP:

- `Host`: `smtp.resend.com`
- `Port`: `465`
- うまくいかない場合の代替: `587`
- `Username`: `resend`
- `Password`: `RESEND_API_KEY`

Sender 設定:

- `Sender name`: `YosoBase`
- `Sender email`: `no-reply@yosobase.com`

`yosobase.com` は Resend 側でドメイン認証済みである必要があります。

### 6. 備考

- Supabase Auth のメール送信上限や挙動は、Supabase 側の制限に従います。
- Custom SMTP 利用時でも、運用前に送信上限を確認してください。

## Auth Routes

実装済みの認証関連ページ:

- `/login`
- `/signup`
- `/forgot-password`
- `/auth/confirm`
- `/auth/reset-password`
- `/mypage`

`/mypage` はサーバー側でセッション確認を行い、未ログイン時は `/login` へリダイレクトします。

## Public User Profile

ゲーム用プロフィールは `public.users` に保持しています。

- 認証本体: `auth.users`
- ゲーム用プロフィール: `public.users`

`auth.users` 作成時に trigger で `public.users` を自動作成するため、既存のポイント・予想・成績ロジックと両立します。

## Ads

- Google AdSense は本番環境でのみ読み込みます。
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` は `ca-pub-1679412386569499` を使用します。
- 広告スロットは以下を使います。
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_TOP`
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_GAME`
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_RANKING`
- `public/ads.txt` は本番公開前に配置してください。

## Verification

```bash
npm run typecheck
npm run lint
```
