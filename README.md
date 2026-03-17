# YosoBase MVP

NPB の試合を予想してポイントを競う Next.js / Supabase ベースの Web アプリです。

## Stack

- Next.js App Router
- TypeScript
- Supabase (PostgreSQL)
- Vercel

## Setup

1. 依存関係を入れます。

```bash
npm install
```

2. `.env.example` を `.env.local` にコピーして値を設定します。

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

3. 必要なスキーマを Supabase に適用します。

- `db/schema.sql`
- `db/seed_teams.sql`

4. 開発サーバーを起動します。

```bash
npm run dev
```

## Ads

- Google AdSense は本番環境でのみ表示します。
- `NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT` は `ca-pub-1679412386569499` を使用しています。
- スロットIDは配置ごとに分けています。
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_TOP`
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_GAME`
  - `NEXT_PUBLIC_GOOGLE_ADSENSE_SLOT_RANKING`
- `public/ads.txt` は本番運用前に配置してください。リポジトリには内容を固定せず、AdSense 側で発行された値をそのまま置く前提です。

## Main Pages

- `/`
- `/games/[gameId]`
- `/rankings`
- `/me`
- `/about`
- `/terms`
- `/privacy`

## Verification

```bash
npm run typecheck
npm run lint
```
