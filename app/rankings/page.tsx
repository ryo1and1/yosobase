import Link from "next/link";
import { Lexend } from "next/font/google";
import { AdSenseUnit } from "@/components/ads/adsense-unit";
import { ShareXButton } from "@/components/share-x-button";
import { getAdSenseUnitConfig } from "@/lib/ads";
import { fetchRanking } from "@/lib/data";
import { currentJstYear } from "@/lib/time";
import { parseRankingPeriod } from "@/lib/validation";
import { getRequestViewerUserId } from "@/lib/viewer-server";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

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
  const viewerUserId = await getRequestViewerUserId();
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
    ? `YosoBaseランキング ${ranking.me.rank}位・${ranking.me.points}pt・的中率 ${Math.round(ranking.me.hit_rate * 100)}% #YosoBase`
    : "YosoBaseでNPB予想に参加中 #YosoBase";

  const showingText =
    ranking.total === 0 ? "0 / 0件" : `1-${Math.min(ranking.items.length, 100)} / ${ranking.total}件`;

  return (
    <div className={`${lexend.className} leaderboard-page`}>
      <section className="leaderboard-head">
        <div>
          <h1>ランキング</h1>
          <p>日次・週次・月次・シーズン別で、予想成績の上位ユーザーを確認できます。</p>
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
            月次
          </Link>
          <Link
            className={`leaderboard-tab ${period === "season" ? "is-active" : ""}`}
            href="/rankings?period=season"
          >
            シーズン
          </Link>
        </div>

        {ranking.items.length === 0 ? (
          <p className="leaderboard-empty">まだランキング対象のデータがありません。予想に参加して最初の成績を作ってください。</p>
        ) : (
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th>順位</th>
                  <th>ユーザー</th>
                  <th>推し</th>
                  <th>的中率</th>
                  <th>連勝</th>
                  <th>獲得pt</th>
                </tr>
              </thead>
              <tbody>
                {ranking.items.slice(0, 100).map((row) => {
                  const favoriteTeam = row.favorite_team_name ?? "-";
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
                            <small>{isMe ? "あなた" : "ユーザー"}</small>
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
              <div className="leaderboard-me-meta">{Math.round(ranking.me.hit_rate * 100)}% 的中率</div>
              <div className="leaderboard-me-points">{ranking.me.points.toLocaleString()} pt</div>
            </div>
          ) : (
            <div className="leaderboard-me-row is-empty">
              <p>
                {viewerUserId
                  ? "まだランキング対象の成績がありません。予想に参加して最初の順位を作ってください。"
                  : "ログインして予想に参加すると、自分の順位をここで確認できます。"}
              </p>
              <Link href={viewerUserId ? "/" : "/login"} className="home-btn home-btn-primary">
                {viewerUserId ? "予想に参加する" : "ログインする"}
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="leaderboard-footer">
        <p>表示件数: {showingText}</p>
      </section>
      {rankingAd ? <AdSenseUnit client={rankingAd.client} slot={rankingAd.slot} className="leaderboard-ad-slot" /> : null}
    </div>
  );
}
