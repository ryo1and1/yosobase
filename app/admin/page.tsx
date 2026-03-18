"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { currentJstYearMonth, formatJstDateTime, toJstDateTimeLocalValue, todayJst } from "@/lib/time";
import type { GameStatus, Side, Team } from "@/lib/types";

type WinnerValue = Side | "none";
type SyncMode = "full" | "results_only";
type AuthState = "checking" | "authenticated" | "unauthenticated";
type AdminGame = { id: string; start_at: string; season_year: number; stadium: string | null; status: GameStatus; winner: Side | null; score_home: number | null; score_away: number | null; home_team: Team; away_team: Team };
type SyncLog = { started_at: string; summary: Record<string, unknown>; error: string | null } | null;
type Draft = { status: GameStatus; winner: WinnerValue; score_home: string; score_away: string };

const STATUS_OPTIONS: readonly GameStatus[] = ["scheduled", "in_progress", "final", "canceled"];
const STATUS_LABELS: Record<GameStatus, string> = { scheduled: "予定", in_progress: "試合中", final: "試合終了", canceled: "中止" };
const WINNER_OPTIONS: Array<{ value: WinnerValue; label: string }> = [
  { value: "none", label: "未設定" },
  { value: "home", label: "ホーム" },
  { value: "draw", label: "引き分け" },
  { value: "away", label: "ビジター" }
];
const SYNC_MODE_OPTIONS: Array<{ value: SyncMode; label: string }> = [
  { value: "full", label: "日程と結果を同期" },
  { value: "results_only", label: "結果のみ同期" }
];

const readError = (payload: unknown, fallback: string) => payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
const parseJson = (response: Response) => response.json().catch(() => null);
const toWinner = (value: WinnerValue): Side | null => (value === "none" ? null : value);
const toWinnerValue = (value: Side | null): WinnerValue => value ?? "none";
const toOptionalInt = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isInteger(parsed) ? parsed : null;
};
const summaryNumber = (summary: Record<string, unknown> | null, ...keys: string[]) => keys.map((key) => summary?.[key]).find((value): value is number => typeof value === "number") ?? 0;
const summaryWarnings = (summary: Record<string, unknown> | null) => Array.isArray(summary?.warnings) ? summary.warnings.filter((value): value is string => typeof value === "string") : [];
const winnerSideLabel = (value: WinnerValue | Side | null) => value === "home" ? "ホーム" : value === "away" ? "ビジター" : value === "draw" ? "引き分け" : "未設定";
const winnerResultLabel = (game: AdminGame) => game.winner === "home" ? `${game.home_team.name} 勝利` : game.winner === "away" ? `${game.away_team.name} 勝利` : game.winner === "draw" ? "引き分け" : "未設定";
const scoreLabel = (game: AdminGame) => game.score_home === null || game.score_away === null ? "未入力" : `${game.score_home} - ${game.score_away}`;

export default function AdminPage() {
  const currentYearMonth = currentJstYearMonth();
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [secretInput, setSecretInput] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [sync, setSync] = useState<{ npb_sync: SyncLog; settle: SyncLog } | null>(null);
  const [importSummary, setImportSummary] = useState<Record<string, unknown> | null>(null);
  const [settleSummary, setSettleSummary] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ season_year: currentYearMonth.year, start_at: toJstDateTimeLocalValue(new Date(Date.now() + 60 * 60 * 1000)), stadium: "", home_team_id: "", away_team_id: "", status: "scheduled" as GameStatus, winner: "none" as WinnerValue, score_home: "", score_away: "" });
  const [filters, setFilters] = useState({ date: todayJst(), season_year: "", status: "all" as "all" | GameStatus });
  const [importForm, setImportForm] = useState(() => ({ year: currentYearMonth.year, month: currentYearMonth.month, mode: "full" as SyncMode }));

  const isAuth = authState === "authenticated";
  const isDev = process.env.NODE_ENV === "development";
  const npbSummary = sync?.npb_sync?.summary ?? null;
  const npbWarnings = summaryWarnings(npbSummary);
  const stateLabel = useMemo(() => authState === "checking" ? "認証状態を確認中" : isAuth ? "ADMINセッション: 有効" : "ADMINセッション: 未認証", [authState, isAuth]);
  const topStats = useMemo(() => ([
    { label: "認証状態", value: isAuth ? "有効" : authState === "checking" ? "確認中" : "未認証", note: isAuth ? "このブラウザで管理操作ができます" : "ADMIN_API_SECRET の入力が必要です" },
    { label: "対象日", value: filters.date, note: filters.status === "all" ? "全ステータスを表示中" : `${STATUS_LABELS[filters.status]}のみ表示中` },
    { label: "表示中の試合", value: `${games.length}件`, note: `${games.filter((game) => game.status === "final").length}件が試合終了` },
    { label: "最終同期", value: sync?.npb_sync?.started_at ? formatJstDateTime(sync.npb_sync.started_at) : "未実行", note: sync?.npb_sync?.error ? "直近の同期でエラーあり" : "直近の同期は正常終了" }
  ]), [authState, filters.date, filters.status, games, isAuth, sync]);

  const adminFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    return fetch(path, { ...init, headers, cache: "no-store", credentials: "same-origin" });
  }, []);
  const loadTeams = useCallback(async () => {
    const response = await fetch("/api/teams", { cache: "no-store", credentials: "same-origin" });
    const payload = (await parseJson(response)) as { teams?: Team[] } | null;
    if (!response.ok) throw new Error(readError(payload, "チーム一覧の取得に失敗しました"));
    const nextTeams = payload?.teams ?? [];
    setTeams(nextTeams);
    setCreateForm((current) => ({ ...current, home_team_id: current.home_team_id || nextTeams[0]?.id || "", away_team_id: current.away_team_id || nextTeams[1]?.id || "" }));
  }, []);

  const loadGames = useCallback(async () => {
    const query = new URLSearchParams({ date: filters.date });
    if (filters.season_year.trim()) query.set("season_year", filters.season_year.trim());
    if (filters.status !== "all") query.set("status", filters.status);
    const response = await adminFetch(`/api/admin/games?${query.toString()}`);
    if (response.status === 401) { setAuthState("unauthenticated"); setGames([]); setDrafts({}); return; }
    const payload = (await parseJson(response)) as { games?: AdminGame[] } | null;
    if (!response.ok) throw new Error(readError(payload, "試合一覧の取得に失敗しました"));
    const nextGames = payload?.games ?? [];
    setGames(nextGames);
    const nextDrafts: Record<string, Draft> = {};
    nextGames.forEach((game) => { nextDrafts[game.id] = { status: game.status, winner: toWinnerValue(game.winner), score_home: game.score_home === null ? "" : String(game.score_home), score_away: game.score_away === null ? "" : String(game.score_away) }; });
    setDrafts(nextDrafts);
  }, [adminFetch, filters.date, filters.season_year, filters.status]);

  const loadSync = useCallback(async () => {
    const response = await adminFetch("/api/admin/sync-status");
    if (response.status === 401) { setAuthState("unauthenticated"); setSync(null); return false; }
    const payload = (await parseJson(response)) as { npb_sync: SyncLog; settle: SyncLog } | null;
    if (!response.ok) throw new Error(readError(payload, "同期状況の取得に失敗しました"));
    setSync(payload ?? null);
    return true;
  }, [adminFetch]);

  const loadProtectedData = useCallback(async () => {
    setBusy("load");
    try {
      const syncLoaded = await loadSync();
      if (!syncLoaded) return;
      setAuthState("authenticated");
      await Promise.all([loadTeams(), loadGames()]);
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "管理データの取得に失敗しました");
    } finally {
      setBusy(null);
    }
  }, [loadGames, loadSync, loadTeams]);

  useEffect(() => { void loadProtectedData(); }, [loadProtectedData]);

  async function onUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy("unlock");
      const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: secretInput.trim() }), cache: "no-store", credentials: "same-origin" });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "認証に失敗しました"));
      setSecretInput("");
      setMessage("管理セッションを開始しました");
      setError(null);
      setAuthState("authenticated");
      await Promise.all([loadTeams(), loadGames(), loadSync()]);
    } catch (nextError) {
      setAuthState("unauthenticated");
      setError(nextError instanceof Error ? nextError.message : "認証に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function onLock() {
    await fetch("/api/admin/session", { method: "DELETE", cache: "no-store", credentials: "same-origin" });
    setAuthState("unauthenticated");
    setGames([]);
    setDrafts({});
    setSync(null);
    setImportSummary(null);
    setSettleSummary(null);
    setMessage(null);
    setError(null);
  }

  function updateDraft(gameId: string, patch: Partial<Draft>) {
    setDrafts((current) => ({ ...current, [gameId]: { status: current[gameId]?.status ?? "scheduled", winner: current[gameId]?.winner ?? "none", score_home: current[gameId]?.score_home ?? "", score_away: current[gameId]?.score_away ?? "", ...patch } }));
  }
  async function onCreateGame(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusy("create");
      const response = await adminFetch("/api/admin/games", { method: "POST", body: JSON.stringify({ season_year: createForm.season_year, start_at: new Date(createForm.start_at).toISOString(), stadium: createForm.stadium.trim() || null, home_team_id: createForm.home_team_id, away_team_id: createForm.away_team_id, status: createForm.status, winner: toWinner(createForm.winner), score_home: toOptionalInt(createForm.score_home), score_away: toOptionalInt(createForm.score_away) }) });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "試合登録に失敗しました"));
      setMessage("試合を登録しました");
      setError(null);
      await loadGames();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "試合登録に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function onSaveGame(gameId: string) {
    try {
      setBusy(`save:${gameId}`);
      const draft = drafts[gameId];
      const response = await adminFetch(`/api/admin/games/${gameId}`, { method: "PATCH", body: JSON.stringify({ status: draft.status, winner: toWinner(draft.winner), score_home: toOptionalInt(draft.score_home), score_away: toOptionalInt(draft.score_away) }) });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "試合更新に失敗しました"));
      setMessage("試合情報を更新しました");
      setError(null);
      await loadGames();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "試合更新に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function onImportNpb() {
    try {
      setBusy("import");
      const response = await adminFetch("/api/admin/import/npb", { method: "POST", body: JSON.stringify(importForm) });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "NPB同期に失敗しました"));
      const summary = payload && typeof payload === "object" && "summary" in payload ? (payload.summary as Record<string, unknown>) : null;
      setImportSummary(summary);
      setMessage("NPB同期を実行しました");
      setError(null);
      await Promise.all([loadGames(), loadSync()]);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "NPB同期に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function onSettle() {
    try {
      setBusy("settle");
      const response = await adminFetch("/api/admin/settle", { method: "POST" });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "精算に失敗しました"));
      const totals = payload && typeof payload === "object" && "totals" in payload ? (payload.totals as Record<string, unknown>) : null;
      setSettleSummary(totals);
      setMessage("精算を実行しました");
      setError(null);
      await loadSync();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "精算に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  async function onInsertSample() {
    try {
      setBusy("sample");
      const response = await adminFetch("/api/admin/games/sample", { method: "POST" });
      const payload = await parseJson(response);
      if (!response.ok) throw new Error(readError(payload, "サンプル試合の投入に失敗しました"));
      setMessage("サンプル試合を投入しました");
      setError(null);
      await loadGames();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "サンプル試合の投入に失敗しました");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-page">
      <section className="admin-hero-card">
        <div className="admin-hero-top">
          <div className="admin-hero-copy">
            <p className="admin-kicker">運営コンソール</p>
            <h1 className="page-title">Admin / 試合運用</h1>
            <p className="admin-subtitle">試合登録、結果入力、NPB同期、精算を1画面で管理します。MVP運用で必要な操作だけをまとめています。</p>
          </div>
          <div className="admin-hero-tools">
            <span className={`pill ${isAuth ? "pill-ok" : "pill-warn"}`}>{stateLabel}</span>
            {isAuth ? <button type="button" className="home-btn home-btn-outline" onClick={() => void onLock()}>セッションを閉じる</button> : null}
          </div>
        </div>
        <div className="admin-stat-grid">
          {topStats.map((stat) => <article key={stat.label} className="admin-stat-card"><span>{stat.label}</span><strong>{stat.value}</strong><p>{stat.note}</p></article>)}
        </div>
      </section>

      {message ? <p className="admin-banner is-success">{message}</p> : null}
      {error ? <p className="admin-banner is-error">{error}</p> : null}

      {!isAuth ? (
        <section className="admin-section-card admin-auth-card">
          <div className="admin-section-head"><div><p className="admin-section-kicker">管理セッション</p><h2>運営者としてログイン</h2><p>パスワードを入力して、このブラウザで管理操作を有効にします。</p></div></div>
          <form onSubmit={onUnlock} className="admin-grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="admin-field min-w-0 md:col-span-2">
              <label htmlFor="admin-secret">パスワード</label>
              <input id="admin-secret" className="admin-input w-full min-w-0" type="password" value={secretInput} onChange={(event) => setSecretInput(event.target.value)} placeholder="管理シークレットを入力" autoComplete="current-password" />
            </div>
            <div className="actions min-w-0 md:col-span-2">
              <button type="submit" className="home-btn home-btn-primary" disabled={busy === "unlock" || authState === "checking"}>{busy === "unlock" ? "認証中..." : "管理画面を開く"}</button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <section id="create-game" className="admin-section-card">
            <div className="admin-section-head"><div><p className="admin-section-kicker">1. Create Game</p><h2>試合登録</h2><p>当日の試合を手動登録します。試合終了を登録する場合は、勝敗とスコアも一緒に入力してください。</p></div></div>
            <form onSubmit={onCreateGame} className="admin-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-season">season_year</label><input id="create-season" className="admin-input w-full min-w-0" type="number" value={createForm.season_year} onChange={(event) => setCreateForm((current) => ({ ...current, season_year: Number.parseInt(event.target.value || "0", 10) || current.season_year }))} /></div>
              <div className="admin-field min-w-0 xl:col-span-2"><label htmlFor="create-start-at">start_at</label><input id="create-start-at" className="admin-input w-full min-w-0" type="datetime-local" value={createForm.start_at} onChange={(event) => setCreateForm((current) => ({ ...current, start_at: event.target.value }))} /></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-stadium">stadium</label><input id="create-stadium" className="admin-input w-full min-w-0" value={createForm.stadium} onChange={(event) => setCreateForm((current) => ({ ...current, stadium: event.target.value }))} placeholder="東京ドーム" /></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-home-team">home_team_id</label><select id="create-home-team" className="admin-input w-full min-w-0 truncate" value={createForm.home_team_id} onChange={(event) => setCreateForm((current) => ({ ...current, home_team_id: event.target.value }))}><option value="">選択してください</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-away-team">away_team_id</label><select id="create-away-team" className="admin-input w-full min-w-0 truncate" value={createForm.away_team_id} onChange={(event) => setCreateForm((current) => ({ ...current, away_team_id: event.target.value }))}><option value="">選択してください</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-status">status</label><select id="create-status" className="admin-input w-full min-w-0 truncate" value={createForm.status} onChange={(event) => setCreateForm((current) => ({ ...current, status: event.target.value as GameStatus }))}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-winner">winner</label><select id="create-winner" className="admin-input w-full min-w-0 truncate" value={createForm.winner} onChange={(event) => setCreateForm((current) => ({ ...current, winner: event.target.value as WinnerValue }))}>{WINNER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-score-home">score_home</label><input id="create-score-home" className="admin-input w-full min-w-0" inputMode="numeric" value={createForm.score_home} onChange={(event) => setCreateForm((current) => ({ ...current, score_home: event.target.value }))} placeholder="3" /></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="create-score-away">score_away</label><input id="create-score-away" className="admin-input w-full min-w-0" inputMode="numeric" value={createForm.score_away} onChange={(event) => setCreateForm((current) => ({ ...current, score_away: event.target.value }))} placeholder="1" /></div>
              <div className="actions min-w-0 md:col-span-2 xl:col-span-6"><button type="submit" className="home-btn home-btn-primary" disabled={busy === "create" || busy === "load"}>{busy === "create" ? "登録中..." : "試合を登録"}</button></div>
            </form>
          </section>
          <section className="admin-section-card">
            <div className="admin-section-head"><div><p className="admin-section-kicker">2. Update Game</p><h2>試合一覧 / 結果入力</h2><p>終了試合は status を「試合終了」にして、勝敗とスコアを保存してください。</p></div></div>
            <div className="admin-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
              <div className="admin-field min-w-0 xl:col-span-2"><label htmlFor="filter-date">date</label><input id="filter-date" className="admin-input w-full min-w-0" type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} /></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="filter-season">season_year</label><input id="filter-season" className="admin-input w-full min-w-0" value={filters.season_year} onChange={(event) => setFilters((current) => ({ ...current, season_year: event.target.value }))} placeholder="2026" /></div>
              <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="filter-status">status</label><select id="filter-status" className="admin-input w-full min-w-0 truncate" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as "all" | GameStatus }))}><option value="all">すべて</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div>
              <div className="actions min-w-0 md:col-span-2 xl:col-span-2"><button type="button" className="home-btn home-btn-outline" onClick={() => void loadGames()} disabled={busy === "load"}>{busy === "load" ? "読込中..." : "一覧を更新"}</button></div>
            </div>
            {games.length === 0 ? <div className="admin-empty-card"><p className="admin-empty-title">対象日の試合はありません。</p><p className="admin-empty-sub">上の「試合登録」から作成するか、NPB同期で取り込んでください。</p></div> : <div className="admin-game-list">{games.map((game) => <article key={game.id} className="admin-game-card"><div className="admin-game-head"><div><p className="admin-game-time">{formatJstDateTime(game.start_at)}</p><h3 className="admin-game-title">{game.home_team.name} vs {game.away_team.name}</h3></div><div className="admin-chip-row"><span className={`status-badge status-${game.status}`}>{STATUS_LABELS[game.status]}</span><span className="pill pill-muted">{winnerSideLabel(game.winner)}</span></div></div><div className="admin-game-meta-grid"><div className="admin-meta-card"><span>球場</span><strong>{game.stadium ?? "未設定"}</strong></div><div className="admin-meta-card"><span>現在の結果</span><strong>{winnerResultLabel(game)}</strong></div><div className="admin-meta-card"><span>スコア</span><strong>{scoreLabel(game)}</strong></div><div className="admin-meta-card"><span>シーズン</span><strong>{game.season_year}</strong></div></div><div className="admin-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3"><div className="admin-field min-w-0 xl:col-span-2"><label htmlFor={`status-${game.id}`}>status</label><select id={`status-${game.id}`} className="admin-input w-full min-w-0 truncate" value={drafts[game.id]?.status ?? game.status} onChange={(event) => updateDraft(game.id, { status: event.target.value as GameStatus })}>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}</select></div><div className="admin-field min-w-0 xl:col-span-2"><label htmlFor={`winner-${game.id}`}>winner</label><select id={`winner-${game.id}`} className="admin-input w-full min-w-0 truncate" value={drafts[game.id]?.winner ?? toWinnerValue(game.winner)} onChange={(event) => updateDraft(game.id, { winner: event.target.value as WinnerValue })}>{WINNER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className="admin-field min-w-0 xl:col-span-1"><label htmlFor={`score-home-${game.id}`}>score_home</label><input id={`score-home-${game.id}`} className="admin-input w-full min-w-0" inputMode="numeric" value={drafts[game.id]?.score_home ?? ""} onChange={(event) => updateDraft(game.id, { score_home: event.target.value })} /></div><div className="admin-field min-w-0 xl:col-span-1"><label htmlFor={`score-away-${game.id}`}>score_away</label><input id={`score-away-${game.id}`} className="admin-input w-full min-w-0" inputMode="numeric" value={drafts[game.id]?.score_away ?? ""} onChange={(event) => updateDraft(game.id, { score_away: event.target.value })} /></div><div className="actions min-w-0 md:col-span-2 xl:col-span-6"><button type="button" className="home-btn home-btn-primary" disabled={busy === `save:${game.id}`} onClick={() => void onSaveGame(game.id)}>{busy === `save:${game.id}` ? "保存中..." : "保存"}</button><Link href={`/games/${game.id}`} className="home-btn home-btn-outline">試合詳細へ</Link></div></div></article>)}</div>}
          </section>

          <section className="admin-section-card">
            <div className="admin-section-head"><div><p className="admin-section-kicker">3. NPB Sync</p><h2>NPB同期 / 最終同期状況</h2><p>取り込み停止に気づけるように、最終実行時刻と結果サマリーを同じ場所で確認できます。</p></div></div>
            <div className="admin-sync-layout">
              <div className="admin-sync-card">
                <h3>手動同期</h3>
                <div className="admin-grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-3">
                  <div className="admin-field min-w-0 xl:col-span-2"><label htmlFor="sync-year">year</label><input id="sync-year" className="admin-input w-full min-w-0" type="number" value={importForm.year} onChange={(event) => setImportForm((current) => ({ ...current, year: Number.parseInt(event.target.value || "0", 10) || current.year }))} /></div>
                  <div className="admin-field min-w-0 xl:col-span-1"><label htmlFor="sync-month">month</label><input id="sync-month" className="admin-input w-full min-w-0" type="number" value={importForm.month} onChange={(event) => setImportForm((current) => ({ ...current, month: Number.parseInt(event.target.value || "0", 10) || current.month }))} /></div>
                  <div className="admin-field min-w-0 xl:col-span-3"><label htmlFor="sync-mode">mode</label><select id="sync-mode" className="admin-input w-full min-w-0 truncate" value={importForm.mode} onChange={(event) => setImportForm((current) => ({ ...current, mode: event.target.value as SyncMode }))}>{SYNC_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                </div>
                <div className="actions"><button type="button" className="home-btn home-btn-primary" onClick={() => void onImportNpb()} disabled={busy === "import"}>{busy === "import" ? "同期中..." : "同期する"}</button><button type="button" className="home-btn home-btn-outline" onClick={() => void loadSync()} disabled={busy === "load"}>同期状況を更新</button><a href="#create-game" className="home-btn home-btn-outline">今日の試合を手動登録</a></div>
                {importSummary ? <pre className="admin-json-block">{JSON.stringify(importSummary, null, 2)}</pre> : null}
                {npbWarnings.length > 0 ? <div className="admin-warning-list">{npbWarnings.slice(0, 5).map((warning) => <span key={warning} className="pill pill-warn">{warning}</span>)}</div> : null}
              </div>
              <div className="admin-sync-card">
                <h3>最終同期の状態</h3>
                <div className="admin-summary-grid"><article className="admin-summary-card"><span>inserted</span><strong>{summaryNumber(npbSummary, "inserted", "created")}</strong></article><article className="admin-summary-card"><span>updated</span><strong>{summaryNumber(npbSummary, "updated", "finalized")}</strong></article><article className="admin-summary-card"><span>skipped</span><strong>{summaryNumber(npbSummary, "skipped", "unchanged")}</strong></article><article className="admin-summary-card"><span>errors</span><strong>{summaryNumber(npbSummary, "errors")}</strong></article></div>
                <div className="admin-log-list"><div className="admin-log-row"><span>最終 npb-sync 実行日時</span><strong>{sync?.npb_sync?.started_at ? formatJstDateTime(sync.npb_sync.started_at) : "未実行"}</strong></div><div className="admin-log-row"><span>失敗理由</span><strong>{sync?.npb_sync?.error ?? "なし"}</strong></div><div className="admin-log-row"><span>最終 settle 実行日時</span><strong>{sync?.settle?.started_at ? formatJstDateTime(sync.settle.started_at) : "未実行"}</strong></div><div className="admin-log-row"><span>settle エラー</span><strong>{sync?.settle?.error ?? "なし"}</strong></div></div>
              </div>
            </div>
          </section>

          <section className="admin-section-card">
            <div className="admin-section-head"><div><p className="admin-section-kicker">4. Settle</p><h2>精算</h2><p>試合終了の更新後に実行してください。status、winner、score が揃っている試合だけが対象です。</p></div></div>
            <div className="actions"><button type="button" className="home-btn home-btn-primary" onClick={() => void onSettle()} disabled={busy === "settle"}>{busy === "settle" ? "精算中..." : "精算を実行"}</button></div>
            {settleSummary ? <div className="admin-summary-grid"><article className="admin-summary-card"><span>games_scanned</span><strong>{summaryNumber(settleSummary, "gamesScanned", "games_scanned")}</strong></article><article className="admin-summary-card"><span>settlements_inserted</span><strong>{summaryNumber(settleSummary, "settlementsInserted", "settlements_inserted")}</strong></article><article className="admin-summary-card"><span>user_stats_updates</span><strong>{summaryNumber(settleSummary, "userStatsUpdated", "user_stats_updates")}</strong></article><article className="admin-summary-card"><span>errors</span><strong>{summaryNumber(settleSummary, "errors")}</strong></article></div> : null}
          </section>

          {isDev ? <section className="admin-section-card"><div className="admin-section-head"><div><p className="admin-section-kicker">5. Development</p><h2>テストデータ投入</h2><p>ローカル確認用にサンプル試合を3件追加します。本番環境では表示されません。</p></div></div><div className="actions"><button type="button" className="home-btn home-btn-outline" onClick={() => void onInsertSample()} disabled={busy === "sample"}>{busy === "sample" ? "投入中..." : "サンプル試合を3件投入"}</button></div></section> : null}
        </>
      )}
    </div>
  );
}
