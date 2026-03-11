# YosoBase MVP

NPB公式戦を対象にした無料の勝敗予想ゲーム（Web）です。  
MVP仕様に合わせて、予想投稿・精算・ランキング・マイ成績・計測イベントを実装しています。

## 技術スタック

- Next.js (App Router, TypeScript)
- Supabase (PostgreSQL)
- Vercel Cron（`/api/cron/settle`）

## セットアップ

1. 依存をインストール

```bash
npm install
```

2. 環境変数を設定

`.env.example` を `.env.local` にコピーして値を入れてください。

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_API_SECRET=
CRON_SECRET=
```

3. Supabase にスキーマを適用

- `db/schema.sql`
- `db/seed_teams.sql`

4. 開発サーバー起動

```bash
npm run dev
```

## 主要ルート

- `/` 今日の試合
- `/games/[gameId]` 試合詳細と予想
- `/rankings` ランキング（日次/週次/シーズン）
- `/me` マイ成績
- `/login` 認証導線（MVP段階）
- `/about` `/terms` `/privacy` 静的ページ

## API

- `GET /api/games?date=YYYY-MM-DD`
- `GET /api/games/:gameId`
- `POST /api/games/:gameId/prediction`
- `DELETE /api/games/:gameId/prediction`
- `GET /api/rankings?period=daily|weekly|season`
- `GET /api/me/summary`
- `GET /api/me/history`
- `POST /api/admin/games`
- `PATCH /api/admin/games/:gameId`
- `POST /api/admin/import/npb` (月次スクレイピング同期)
- `POST /api/auth/register` (ニックネーム/メール/パスワード/好きな球団で会員登録)
- `POST /api/auth/login` (メール/パスワードログイン)
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/cron/settle`
- `POST /api/cron/npb-sync`
- `POST /api/events`

## 管理API認証

`/api/admin/*` は以下いずれかで認証します。

- Header: `x-admin-secret: <ADMIN_API_SECRET>`
- Query: `?secret=<ADMIN_API_SECRET>`

## Cron

`vercel.json` で定期実行:

```json
{
  "crons": [
    {
      "path": "/api/cron/npb-sync",
      "schedule": "5,35 * * * *"
    },
    {
      "path": "/api/cron/settle",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

- `/api/cron/npb-sync` は月次日程/結果を公式ページから自動同期します。
- `/api/cron/settle` は精算処理を実行します。
- どちらも `Authorization: Bearer <CRON_SECRET>` または `?secret=` で認証します。

## MVPの実装方針

- ゲスト投稿（A案）を優先し、`yosobase_guest_id` Cookieで同一ユーザーを識別
- 締切判定はサーバー側で `now < game.start_at` を強制
- 精算は `settlements.prediction_id` の一意制約で冪等化
- ランキングは `daily/weekly` を `settlements` 集計、`season` を `user_stats` 参照
- 計測イベントは `analytics_events` に保存
