-- 1週間分のダミー試合を作成する
-- - JST基準で「今日〜6日後」
-- - 既存の dummy_seed を削除して再投入

begin;

delete from public.games
where external_source = 'dummy_seed';

with base_dates as (
  select
    (timezone('Asia/Tokyo', now())::date + day_offset)::date as game_date,
    day_offset
  from generate_series(0, 6) as day_offset
),
templates(slot, home_team_id, away_team_id, stadium, first_pitch) as (
  values
    (1, 'GIANTS',    'TIGERS',   '東京ドーム',       '18:00'::time),
    (2, 'BAYSTARS',  'SWALLOWS', '横浜スタジアム',   '18:00'::time),
    (3, 'CARP',      'DRAGONS',  'マツダスタジアム', '18:00'::time),
    (4, 'MARINES',   'LIONS',    'ZOZOマリン',       '18:00'::time),
    (5, 'BUFFALOES', 'EAGLES',   '京セラD大阪',      '18:00'::time),
    (6, 'HAWKS',     'FIGHTERS', 'みずほPayPay',     '18:00'::time)
),
expanded as (
  select
    d.game_date,
    d.day_offset,
    t.slot,
    t.stadium,
    t.first_pitch,
    case
      when mod(d.day_offset, 2) = 0 then t.home_team_id
      else t.away_team_id
    end as home_team_id,
    case
      when mod(d.day_offset, 2) = 0 then t.away_team_id
      else t.home_team_id
    end as away_team_id
  from base_dates d
  cross join templates t
),
upcoming as (
  select
    'NPB'::text as league,
    extract(year from game_date)::int as season_year,
    (to_char(game_date, 'YYYY-MM-DD') || ' ' || to_char(first_pitch, 'HH24:MI') || ':00+09:00')::timestamptz as start_at,
    stadium,
    home_team_id,
    away_team_id,
    'scheduled'::public.game_status as status,
    null::public.winner_side as winner,
    null::int as score_home,
    null::int as score_away,
    'dummy_seed'::text as external_source,
    format(
      'dummy_%s_%s_%s_%s',
      to_char(game_date, 'YYYYMMDD'),
      slot,
      home_team_id,
      away_team_id
    ) as external_game_key
  from expanded
)
insert into public.games (
  league,
  season_year,
  start_at,
  stadium,
  home_team_id,
  away_team_id,
  status,
  winner,
  score_home,
  score_away,
  external_source,
  external_game_key
)
select
  league,
  season_year,
  start_at,
  stadium,
  home_team_id,
  away_team_id,
  status,
  winner,
  score_home,
  score_away,
  external_source,
  external_game_key
from upcoming
order by start_at, external_game_key;

commit;
