import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lexend } from "next/font/google";
import { PredictionPanel } from "@/components/prediction-panel";
import { fetchGameDetail } from "@/lib/data";
import { getAuthenticatedViewerUserId } from "@/lib/guest-user";
import { formatJstDateTime, minutesUntil } from "@/lib/time";
import { statusLabel } from "@/lib/ui";

const lexend = Lexend({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"]
});

function teamAbbr(name: string): string {
  return name.replace(/\s+/g, "").slice(0, 2).toUpperCase();
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ gameId: string }>;
}): Promise<Metadata> {
  const { gameId } = await params;
  const detail = await fetchGameDetail(gameId, null);
  if (!detail) {
    return { title: "試合が見つかりません" };
  }

  return {
    title: `${detail.game.home_team.name} 対 ${detail.game.away_team.name}`,
    description: `${detail.game.home_team.name} 対 ${detail.game.away_team.name} の予想詳細ページ`
  };
}

export default async function GameDetailPage({
  params
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const authenticatedUserId = await getAuthenticatedViewerUserId();
  const detail = await fetchGameDetail(gameId, authenticatedUserId);

  if (!detail) {
    notFound();
  }

  const { game } = detail;
  const mins = minutesUntil(game.start_at);
  const isStarted = mins <= 0 || game.status !== "scheduled";
  const winnerTeam =
    game.winner === "home" ? game.home_team.name : game.winner === "away" ? game.away_team.name : null;
  const isAuthenticated = Boolean(authenticatedUserId);
  const isWinningPrediction = (detail.settlement?.points_delta ?? 0) > 0;
  const loginHref = `/login?returnTo=${encodeURIComponent(`/games/${game.id}`)}&focus=prediction`;

  return (
    <div className={`${lexend.className} game-detail-page`}>
      <section className="game-detail-head">
        <div>
          <p className="game-detail-kicker">試合詳細</p>
          <h1>
            {game.home_team.name} 対 {game.away_team.name}
          </h1>
          <p>
            {formatJstDateTime(game.start_at)}
            {game.stadium ? ` / ${game.stadium}` : ""}
          </p>
        </div>
        <div className="game-detail-head-actions">
          <span className={`status-badge status-${game.status}`}>{statusLabel(game.status)}</span>
          {game.status === "scheduled" && mins > 0 ? (
            <span className="pill pill-warn">開始まで {mins} 分</span>
          ) : (
            <span className="pill pill-muted">{isStarted ? "受付終了" : "ステータス更新待ち"}</span>
          )}
        </div>
      </section>

      <section className="game-detail-card">
        <div className="game-detail-matchup">
          <div className="game-detail-team">
            <div className="game-detail-team-badge">{teamAbbr(game.home_team.name)}</div>
            <strong>{game.home_team.name}</strong>
            <span>ホーム</span>
          </div>
          <div className="game-detail-vs">
            <strong>対</strong>
            <span>{statusLabel(game.status)}</span>
          </div>
          <div className="game-detail-team">
            <div className="game-detail-team-badge">{teamAbbr(game.away_team.name)}</div>
            <strong>{game.away_team.name}</strong>
            <span>ビジター</span>
          </div>
        </div>

        <div className="game-detail-meta-grid">
          <article className="game-detail-meta-card">
            <small>開始時刻</small>
            <p>{formatJstDateTime(game.start_at)}</p>
          </article>
          <article className="game-detail-meta-card">
            <small>球場</small>
            <p>{game.stadium ?? "未定"}</p>
          </article>
          <article className="game-detail-meta-card">
            <small>試合ステータス</small>
            <p>{statusLabel(game.status)}</p>
          </article>
          <article className="game-detail-meta-card">
            <small>試合結果</small>
            <p>
              {winnerTeam
                ? `${winnerTeam} 勝利`
                : game.status === "final"
                  ? "引き分け/勝敗なし"
                  : "未確定"}
            </p>
          </article>
        </div>

        {game.status === "final" && (
          <p className={`game-detail-result-banner${isWinningPrediction ? " is-hit" : ""}`}>
            {winnerTeam ? `${winnerTeam} が勝利しました。` : "この試合は引き分け、または勝敗なしで終了しました。"}
          </p>
        )}
      </section>

      {isAuthenticated ? (
        <PredictionPanel
          gameId={game.id}
          homeTeamName={game.home_team.name}
          awayTeamName={game.away_team.name}
          scoreHome={game.score_home}
          scoreAway={game.score_away}
          startAt={game.start_at}
          status={game.status}
          winner={game.winner}
          mode={detail.mode}
          odds={detail.odds}
          initialAllocations={detail.user_bets}
          pointBalance={detail.point_balance ?? 0}
          settlementPoints={detail.settlement?.points_delta ?? null}
        />
      ) : (
        <section id="prediction-panel" className="prediction-card">
          <div className="prediction-head">
            <div>
              <h2>勝敗予想</h2>
              <p>予想の登録にはログインが必要です。登録は無料です。</p>
            </div>
            <p className="prediction-deadline">未ログイン</p>
          </div>
          <div className="prediction-actions">
            <Link href={loginHref} className="prediction-submit">
              無料で予想する（登録）
            </Link>
          </div>
        </section>
      )}

      <section className="game-detail-links">
        <Link href="/" className="home-btn home-btn-outline">
          トップへ戻る
        </Link>
        <Link href="/rankings" className="home-btn home-btn-primary">
          ランキングを見る
        </Link>
      </section>
    </div>
  );
}
