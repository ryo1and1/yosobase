import Link from "next/link";
import { Lexend } from "next/font/google";
import { AdSenseUnit } from "@/components/ads/adsense-unit";
import { ShareXButton } from "@/components/share-x-button";
import { getAdSenseUnitConfig } from "@/lib/ads";
import { fetchRanking } from "@/lib/data";
import { getViewerUserId } from "@/lib/guest-user";
import { createServiceClient } from "@/lib/supabase";
import { currentJstYear } from "@/lib/time";
import { parseRankingPeriod } from "@/lib/validation";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

type TeamRelation = { name: string }[] | { name: string } | null;

type UserFavoriteRow = {
  id: string;
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

function tierClass(rank: number): string {
  if (rank === 1) return "is-gold";
  if (rank === 2) return "is-silver";
  if (rank === 3) return "is-bronze";
  return "is-normal";
}

export default async function RankingsPage({
  searchParams
}: {
  searchParams: Promise<{
    period?: string;
    date?: string;
    endDate?: string;
    seasonYear?: string;
  }>;
}) {
  const params = await searchParams;
  const period = parseRankingPeriod(params.period ?? null);
  const viewerUserId = await getViewerUserId();
  const seasonYear = params.seasonYear ? Number(params.seasonYear) : currentJstYear();
  const rankingAd = getAdSenseUnitConfig("ranking");

  const ranking = await fetchRanking(period, {
    date: params.date,
    endDate: params.endDate,
    seasonYear,
    limit: 100,
    viewerUserId
  });

  const meText = ranking.me
    ? `YosoBaseランキング ${ranking.me.rank}位 ${ranking.me.points}pt 的中率${Math.round(
        ranking.me.hit_rate * 100
      )}% #YosoBase`
    : "YosoBaseでNPB予想に参加中 #YosoBase";

  const userIds = ranking.items.map((row) => row.user_id);
  const favoriteTeamMap = new Map<string, string>();
  if (userIds.length > 0) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("users")
      .select("id, favorite_team:teams!users_favorite_team_id_fkey(name)")
      .in("id", userIds);

    if (error) {
      throw new Error(`推し球団の取得に失敗しました: ${error.message}`);
    }

    (data as UserFavoriteRow[] | null)?.forEach((row) => {
      const name = normalizeTeamName(row.favorite_team);
      if (name) {
        favoriteTeamMap.set(row.id, name);
      }
    });
  }

  const showingText =
    ranking.total === 0 ? "0 / 0人" : `1-${Math.min(ranking.items.length, 100)} / ${ranking.total}人`;

  return (
    <div className={`${lexend.className} leaderboard-page`}>
      <section className="leaderboard-head">
        <div>
          <h1>ランキング</h1>
          <p>予想成績のランキングです。週次は JST 月曜 00:00 開始、日次は JST 集計です。</p>
        </div>
        <div className="leaderboard-actions">
          <ShareXButton text={meText} eventName="share_click_ranking" className="leaderboard-share-btn" />
        </div>
      </section>

      <section className="leaderboard-card">
        <div className="leaderboard-tabs">
          <Link className={`leaderboard-tab ${period === "daily" ? "is-active" : ""}`} href="/rankings?period=daily">
            日次
          </Link>
          <Link className={`leaderboard-tab ${period === "weekly" ? "is-active" : ""}`} href="/rankings?period=weekly">
            週次
          </Link>
          <Link
            className={`leaderboard-tab ${period === "monthly" ? "is-active" : ""}`}
            href="/rankings?period=monthly"
          >
            月間
          </Link>
          <Link
            className={`leaderboard-tab ${period === "season" ? "is-active" : ""}`}
            href="/rankings?period=season"
          >
            シーズン
          </Link>
        </div>

        {ranking.items.length === 0 ? (
          <p className="leaderboard-empty">まだランキングデータがありません。予想の精算後に反映されます。</p>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>順位</th>
                  <th>ユーザー</th>
                  <th>推し球団</th>
                  <th>的中率</th>
                  <th>連勝</th>
                  <th>ポイント</th>
                </tr>
              </thead>
              <tbody>
                {ranking.items.slice(0, 100).map((row) => {
                  const favoriteTeam = favoriteTeamMap.get(row.user_id) ?? "-";
                  const isMe = viewerUserId === row.user_id;

                  return (
                    <tr key={row.user_id} className={isMe ? "is-me" : undefined}>
                      <td>
                        <div className={`leaderboard-rank-dot ${tierClass(row.rank)}`}>{row.rank}</div>
                      </td>
                      <td>
                        <div className="leaderboard-user">
                          <div className="leaderboard-avatar">{row.display_name.slice(0, 2).toUpperCase()}</div>
                          <div>
                            <p>
                              {row.display_name}
                              {row.public_code ? ` #${row.public_code}` : ""}
                            </p>
                            <small>{isMe ? "あなた" : "参加ユーザー"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="leaderboard-team-badge" title={favoriteTeam}>
                          {favoriteTeam === "-" ? "-" : teamMark(favoriteTeam)}
                        </div>
                      </td>
                      <td>
                        <span className="leaderboard-acc">{Math.round(row.hit_rate * 100)}%</span>
                      </td>
                      <td>
                        <span className="leaderboard-acc">{row.current_streak ?? 0}</span>
                      </td>
                      <td>
                        <strong>{row.points.toLocaleString()}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="leaderboard-me-sticky">
          {ranking.me ? (
            <div className="leaderboard-me-row">
              <div className="leaderboard-me-rank">{ranking.me.rank}</div>
              <div className="leaderboard-me-name">
                <div className="leaderboard-avatar is-me">{ranking.me.display_name.slice(0, 2).toUpperCase()}</div>
                <div>
                  <p>あなた</p>
                  <small>{ranking.me.public_code ? `公開ID #${ranking.me.public_code}` : "公開ID 未設定"}</small>
                </div>
              </div>
              <div className="leaderboard-me-meta">{Math.round(ranking.me.hit_rate * 100)}% 的中</div>
              <div className="leaderboard-me-points">{ranking.me.points.toLocaleString()} pt</div>
            </div>
          ) : (
            <div className="leaderboard-me-row is-empty">
              <p>
                {viewerUserId
                  ? "まだ成績が反映されていません。予想した試合の精算後に、あなたの順位がここに表示されます。"
                  : "ログインして予想すると、精算後にあなたの順位がここに表示されます。"}
              </p>
              <Link href={viewerUserId ? "/" : "/login"} className="home-btn home-btn-primary">
                {viewerUserId ? "今日の試合へ" : "ログインして参加"}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="leaderboard-footer">
        <p>表示中: {showingText}</p>
      </section>
      {rankingAd ? <AdSenseUnit client={rankingAd.client} slot={rankingAd.slot} className="leaderboard-ad-slot" /> : null}
    </div>
  );
}
