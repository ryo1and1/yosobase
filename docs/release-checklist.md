# YosoBase MVP Release Checklist

公開前は `npm run release:check` を実行し、以下を順に確認する。

## 1. 自動チェック

1. `npm run typecheck`
2. `npm run lint`
3. `npm run build`

## 2. 手動スモークチェック

1. 会員登録できる
2. ログインできる
3. トップで試合一覧が表示される
4. 試合詳細で予想を保存できる
5. 締切後は予想ボタンが押せず、サーバーでも弾かれる
6. `/admin` で試合結果を `final + winner + score` で保存できる
7. `settle` 実行後に成績とランキングへ反映される
8. ログアウトできる

## 3. データ確認

1. `teams` に12球団が入っている
2. `games` に当日の試合が入っている
3. `sync_logs` に最新の `npb-sync` / `settle` 実行結果が残っている

## 4. 環境変数確認

1. `SUPABASE_URL`
2. `SUPABASE_SERVICE_ROLE_KEY`
3. `ADMIN_API_SECRET`
4. `CRON_SECRET`

どれか1つでも欠ける場合は公開しない。
