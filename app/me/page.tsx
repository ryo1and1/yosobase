import Link from "next/link";
import { INITIAL_POINT_BALANCE } from "@/lib/game-rules";
import { FavoriteTeamForm } from "@/components/favorite-team-form";
import { ShareXButton } from "@/components/share-x-button";
import { fetchMeHistory, fetchMeSummary } from "@/lib/data";
import { publicUserCodeFromId } from "@/lib/public-user-code";
import { createServiceClient } from "@/lib/supabase";
import { currentJstYear, formatJstDateTime } from "@/lib/time";
import type { Team } from "@/lib/types";
import { getRequestViewerUserId } from "@/lib/viewer-server";

type TeamRelation = { name: string }[] | { name: string } | null;

type UserProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
  favorite_team_id: string | null;
  favorite_team: TeamRelation;
};

function normalizeTeamName(team: TeamRelation): string | null {
  if (!team) return null;
  if (Array.isArray(team)) {
    return team[0]?.name ?? null;
  }
  return team.name ?? null;
}

function teamMark(name: string): string {
  const compact = name.replace(/\s+/g, "");
  return compact.slice(0, 2).toUpperCase();
}

export default async function MePage() {
  const viewerUserId = await getRequestViewerUserId();

  if (!viewerUserId) {
    return (
      <div className="profile-page">
        <section className="profile-empty">
          <h1 className="profile-title">成績</h1>
          <p className="profile-empty-sub">ログインすると、予想履歴・保有ポイント・的中率を確認できます。</p>
          <div className="profile-empty-actions">
            <Link href="/login" className="home-btn home-btn-primary">
              ログイン / 登録
            </Link>
            <Link href="/" className="home-btn home-btn-outline">
              トップへ戻る
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const year = currentJstYear();
  const supabase = createServiceClient();
  const [summary, history, profileRes, teamsRes] = await Promise.all([
    fetchMeSummary(viewerUserId, year),
    fetchMeHistory(viewerUserId, 20),
    supabase
      .from("users")
      .select("id, display_name, created_at, favorite_team_id, favorite_team:teams!users_favorite_team_id_fkey(name)")
      .eq("id", viewerUserId)
      .maybeSingle(),
    supabase.from("teams").select("id, name").order("id", { ascending: true })
  ]);

  if (profileRes.error) {
    throw new Error(`ユーザー情報の取得に失敗しました: ${profileRes.error.message}`);
  }
  if (teamsRes.error) {
    throw new Error(`球団一覧の取得に失敗しました: ${teamsRes.error.message}`);
  }

  const profile = (profileRes.data as UserProfileRow | null) ?? null;
  const teams = ((teamsRes.data as Team[] | null) ?? []).filter((team) => team?.id && team?.name);
  const displayName = profile?.display_name ?? "ユーザー";
  const memberSince = profile?.created_at
    ? new Intl.DateTimeFormat("ja-JP", { month: "long", year: "numeric", timeZone: "Asia/Tokyo" }).format(
        new Date(profile.created_at)
      )
    : "未設定";
  const favoriteTeamId = profile?.favorite_team_id ?? null;
  const publicCode = publicUserCodeFromId(viewerUserId);
  const favoriteTeam = normalizeTeamName(profile?.favorite_team ?? null) ?? "未設定";
  const shareText = `YosoBaseで ${summary.correct}/${summary.predictions} 的中、${summary.points}pt獲得中 #YosoBase`;

  return (
    <div className="profile-page">
      <section className="profile-header-card">
        <div className="profile-header-main">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">{teamMark(favoriteTeam)}</div>
          </div>
          <div className="profile-user-meta">
            <div className="profile-name-row">
              <h1 className="profile-title">{displayName}</h1>
              <span className="profile-badge is-primary">会員</span>
            </div>
            <p className="profile-meta-line">登録時期: {memberSince}</p>
            <p className="profile-meta-line">
              公開ID: <strong>#{publicCode}</strong>
            </p>
            <p className="profile-meta-line">
              好きな球団: <strong>{favoriteTeam}</strong>
            </p>
            <FavoriteTeamForm teams={teams} initialFavoriteTeamId={favoriteTeamId} />
          </div>
        </div>

        <div className="profile-header-actions">
          <ShareXButton text={shareText} eventName="share_click_me" className="home-btn home-btn-outline" />
        </div>
      </section>

      <section className="profile-stats-grid">
        <article className="profile-stat-card">
          <p>総予想数</p>
          <div>
            <strong>{summary.predictions}</strong>
            <span>{year}シーズン</span>
          </div>
        </article>

        <article className="profile-stat-card">
          <p>的中率</p>
          <div>
            <strong>{Math.round(summary.hitRate * 100)}%</strong>
            <span>
              {summary.correct} / {summary.predictions}
            </span>
          </div>
        </article>

        <article className="profile-stat-card">
          <p>保有ポイント</p>
          <div>
            <strong>{summary.balance.toLocaleString()}</strong>
            <span>初期値 {INITIAL_POINT_BALANCE.toLocaleString()}pt</span>
          </div>
        </article>

        <article className="profile-stat-card">
          <p>シーズン獲得pt</p>
          <div>
            <strong>{summary.points}</strong>
            <span>連勝中 {summary.currentStreak} 試合</span>
          </div>
        </article>
      </section>

      <section className="profile-history">
        <div className="profile-history-head">
          <h2>予想履歴</h2>
          <Link href="/rankings" className="home-btn home-btn-outline">
            ランキングを見る
          </Link>
        </div>

        {history.length === 0 ? (
          <p className="profile-history-empty">まだ予想履歴はありません。</p>
        ) : (
          <div className="profile-history-table-wrap">
            <table className="profile-history-table">
              <thead>
                <tr>
                  <th>精算日時</th>
                  <th>対戦カード</th>
                  <th>あなたの予想</th>
                  <th>結果</th>
                  <th>獲得ポイント</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const isRefund = item.status === "canceled";
                  const isHit = !isRefund && item.points_delta > 0;
                  const resultLabel = item.winner ? (isHit ? "的中" : "不的中") : "未確定";
                  const scoreClass =
                    isRefund ? "is-zero" : item.points_delta > 0 ? "is-plus" : item.points_delta < 0 ? "is-minus" : "is-zero";
                  const pointText = item.points_delta > 0 ? `+${item.points_delta}` : `${item.points_delta}`;
                  const displayResultLabel = isRefund ? "返金" : resultLabel;
                  const resultClass = isRefund ? "is-refund" : isHit ? "is-win" : "is-loss";

                  return (
                    <tr key={`${item.game_id}:${item.settled_at}`}>
                      <td>{formatJstDateTime(item.settled_at)}</td>
                      <td>
                        <Link href={`/games/${item.game_id}?focus=prediction`} className="profile-matchup-link">
                          <div className="profile-matchup">
                            <span>{item.home_team_name}</span>
                            <small>vs</small>
                            <span>{item.away_team_name}</span>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className="profile-pill">{item.pick_summary}</span>
                      </td>
                      <td>
                        <span className={`profile-result ${resultClass}`}>{displayResultLabel}</span>
                      </td>
                      <td>
                        <span className={`profile-points ${scoreClass}`}>{pointText}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
