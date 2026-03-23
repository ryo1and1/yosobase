create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default 'Guest',
  -- Reserved for a future DB-managed public ID. The current app derives the
  -- public code from users.id in lib/public-user-code.ts and does not read this column.
  public_code text,
  email text,
  password_hash text,
  favorite_team_id text,
  point_balance int not null default 10000,
  last_login_bonus_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add column if not exists public_code text,
  add column if not exists email text,
  add column if not exists password_hash text,
  add column if not exists favorite_team_id text,
  add column if not exists point_balance int not null default 10000,
  add column if not exists last_login_bonus_date date;

alter table public.users
  drop column if exists is_guest;

create index if not exists idx_users_created_at on public.users(created_at);
create unique index if not exists uq_users_email_lower
on public.users ((lower(email)))
where email is not null;

create table if not exists public.teams (
  id text primary key,
  name text not null,
  league text not null default 'NPB',
  created_at timestamptz not null default now()
);

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_favorite_team_id_fkey'
  ) then
    alter table public.users
      add constraint users_favorite_team_id_fkey
      foreign key (favorite_team_id) references public.teams(id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'game_status') then
    create type public.game_status as enum ('scheduled', 'in_progress', 'final', 'canceled');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'winner_side') then
    create type public.winner_side as enum ('home', 'draw', 'away');
  end if;
end $$;

do $$ begin
  if exists (select 1 from pg_type where typname = 'winner_side') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.winner_side'::regtype
        and enumlabel = 'draw'
    ) then
      alter type public.winner_side add value 'draw';
    end if;
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'pick_side') then
    create type public.pick_side as enum ('home', 'away');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'prediction_option') then
    create type public.prediction_option as enum (
      'home_win',
      'draw',
      'away_win',
      'home_by1',
      'home_by2',
      'home_by3plus',
      'home_by2plus',
      'away_by1',
      'away_by2',
      'away_by3plus',
      'away_by2plus'
    );
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_type where typname = 'prediction_option') then
    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.prediction_option'::regtype
        and enumlabel = 'home_by2'
    ) then
      alter type public.prediction_option add value 'home_by2';
    end if;

    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.prediction_option'::regtype
        and enumlabel = 'home_by3plus'
    ) then
      alter type public.prediction_option add value 'home_by3plus';
    end if;

    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.prediction_option'::regtype
        and enumlabel = 'away_by2'
    ) then
      alter type public.prediction_option add value 'away_by2';
    end if;

    if not exists (
      select 1
      from pg_enum
      where enumtypid = 'public.prediction_option'::regtype
        and enumlabel = 'away_by3plus'
    ) then
      alter type public.prediction_option add value 'away_by3plus';
    end if;
  end if;
end $$;

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  league text not null default 'NPB',
  season_year int not null,
  start_at timestamptz not null,
  stadium text,
  score_home int,
  score_away int,
  home_team_id text not null references public.teams(id),
  away_team_id text not null references public.teams(id),
  status public.game_status not null default 'scheduled',
  winner public.winner_side,
  external_source text,
  external_game_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_home_away_diff check (home_team_id <> away_team_id)
);

alter table public.games
  add column if not exists external_source text,
  add column if not exists external_game_key text,
  add column if not exists score_home int,
  add column if not exists score_away int;

create index if not exists idx_games_start_at on public.games(start_at);
create index if not exists idx_games_status on public.games(status);
create index if not exists idx_games_season_year on public.games(season_year);
create unique index if not exists uq_games_external
on public.games (external_source, external_game_key)
where external_source is not null and external_game_key is not null;

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  pick public.pick_side not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_predictions_game_user unique (game_id, user_id)
);

create index if not exists idx_predictions_game_id on public.predictions(game_id);
create index if not exists idx_predictions_user_id on public.predictions(user_id);

create table if not exists public.prediction_bets (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  option public.prediction_option not null,
  stake_points int not null check (stake_points > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_prediction_bets_game_user_option unique (game_id, user_id, option)
);

create index if not exists idx_prediction_bets_game_id on public.prediction_bets(game_id);
create index if not exists idx_prediction_bets_user_id on public.prediction_bets(user_id);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid references public.predictions(id) on delete cascade,
  game_id uuid not null references public.games(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_correct boolean not null,
  stake_points int not null default 0 check (stake_points >= 0),
  points_delta int not null,
  settled_at timestamptz not null default now(),
  constraint settlements_points_delta_check check (points_delta >= -stake_points),
  constraint uq_settlements_game_user unique (game_id, user_id)
);

alter table public.settlements
  alter column prediction_id drop not null;

alter table public.settlements
  add column if not exists stake_points int not null default 0;

do $$
declare
  v_constraint_name text;
begin
  for v_constraint_name in
    select conname
    from pg_constraint
    where conrelid = 'public.settlements'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%points_delta >= 0%'
  loop
    execute format('alter table public.settlements drop constraint %I', v_constraint_name);
  end loop;
end $$;

alter table public.settlements
  drop constraint if exists settlements_points_delta_check;

alter table public.settlements
  add constraint settlements_points_delta_check check (points_delta >= -stake_points);

alter table public.settlements
  drop constraint if exists uq_settlements_prediction;

do $$ begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'uq_settlements_game_user'
      and conrelid = 'public.settlements'::regclass
  ) then
    alter table public.settlements
      add constraint uq_settlements_game_user unique (game_id, user_id);
  end if;
end $$;

create index if not exists idx_settlements_user_id on public.settlements(user_id);
create index if not exists idx_settlements_game_id on public.settlements(game_id);
create index if not exists idx_settlements_settled_at on public.settlements(settled_at);

create table if not exists public.user_stats (
  user_id uuid not null references public.users(id) on delete cascade,
  season_year int not null,
  points_total int not null default 0,
  predictions_total int not null default 0,
  correct_total int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_year)
);

create index if not exists idx_user_stats_points on public.user_stats(season_year, points_total desc);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid,
  session_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_event_name on public.analytics_events(event_name);
create index if not exists idx_analytics_events_created_at on public.analytics_events(created_at desc);

create table if not exists public.auth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_auth_sessions_user_id on public.auth_sessions(user_id);
create index if not exists idx_auth_sessions_expires_at on public.auth_sessions(expires_at);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  ok boolean not null default false,
  summary jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_logs_source_started_at
on public.sync_logs(source, started_at desc);

create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  count int not null default 0 check (count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists idx_rate_limit_buckets_reset_at
on public.rate_limit_buckets(reset_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
  v_favorite_team_id text;
begin
  v_display_name := left(
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'ユーザー'
    ),
    32
  );

  select teams.id
  into v_favorite_team_id
  from public.teams
  where teams.id = nullif(trim(new.raw_user_meta_data ->> 'favorite_team_id'), '')
  limit 1;

  insert into public.users (id, email, display_name, favorite_team_id, point_balance)
  values (new.id, new.email, v_display_name, v_favorite_team_id, 10000)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

drop trigger if exists trg_games_updated_at on public.games;
create trigger trg_games_updated_at
before update on public.games
for each row
execute function public.set_updated_at();

drop trigger if exists trg_predictions_updated_at on public.predictions;
create trigger trg_predictions_updated_at
before update on public.predictions
for each row
execute function public.set_updated_at();

drop trigger if exists trg_prediction_bets_updated_at on public.prediction_bets;
create trigger trg_prediction_bets_updated_at
before update on public.prediction_bets
for each row
execute function public.set_updated_at();

drop trigger if exists trg_user_stats_updated_at on public.user_stats;
create trigger trg_user_stats_updated_at
before update on public.user_stats
for each row
execute function public.set_updated_at();

create or replace function public.apply_user_stats_delta(
  p_user_id uuid,
  p_season_year int,
  p_points int,
  p_predictions int,
  p_correct int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (
    user_id,
    season_year,
    points_total,
    predictions_total,
    correct_total
  )
  values (
    p_user_id,
    p_season_year,
    p_points,
    greatest(p_predictions, 0),
    greatest(p_correct, 0)
  )
  on conflict (user_id, season_year)
  do update set
    points_total = public.user_stats.points_total + p_points,
    predictions_total = greatest(public.user_stats.predictions_total + p_predictions, 0),
    correct_total = greatest(public.user_stats.correct_total + p_correct, 0),
    updated_at = now();
end;
$$;

create or replace function public.check_rate_limit(
  p_bucket_key text,
  p_limit int,
  p_window_ms int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reset_at timestamptz;
  v_count int;
begin
  if coalesce(length(trim(p_bucket_key)), 0) = 0 then
    raise exception 'bucket key is required';
  end if;
  if p_limit <= 0 then
    raise exception 'limit must be greater than zero';
  end if;
  if p_window_ms <= 0 then
    raise exception 'window must be greater than zero';
  end if;

  v_reset_at := v_now + (p_window_ms || ' milliseconds')::interval;

  insert into public.rate_limit_buckets (bucket_key, count, reset_at, updated_at)
  values (p_bucket_key, 1, v_reset_at, v_now)
  on conflict (bucket_key) do update
  set
    count = case
      when public.rate_limit_buckets.reset_at <= v_now then 1
      else public.rate_limit_buckets.count + 1
    end,
    reset_at = case
      when public.rate_limit_buckets.reset_at <= v_now then v_reset_at
      else public.rate_limit_buckets.reset_at
    end,
    updated_at = v_now
  returning count into v_count;

  if random() < 0.01 then
    delete from public.rate_limit_buckets
    where reset_at < v_now - interval '1 day';
  end if;

  return v_count <= p_limit;
end;
$$;

create or replace function public.upsert_prediction_bets_atomic(
  p_user_id uuid,
  p_game_id uuid,
  p_mode text,
  p_allocations jsonb,
  p_max_stake int,
  p_lock_minutes int
)
returns table(point_balance int, total_stake int, allocations jsonb)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_balance int;
  v_current_stake int := 0;
  v_new_total int := 0;
  v_stake_diff int := 0;
  v_next_balance int;
  v_allocations jsonb := '[]'::jsonb;
  v_allowed_options text[];
begin
  if p_mode = 'simple' then
    v_allowed_options := array['home_win', 'draw', 'away_win'];
  elsif p_mode = 'detailed' then
    v_allowed_options := array['home_by1', 'home_by2', 'home_by3plus', 'draw', 'away_by1', 'away_by2', 'away_by3plus'];
  else
    raise exception 'invalid prediction mode';
  end if;

  if jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'invalid allocations';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_allocations) as item
    where jsonb_typeof(item) <> 'object'
      or (item->>'option') is null
      or not ((item->>'option') = any(v_allowed_options))
      or (item->>'stake_points') is null
      or (item->>'stake_points') !~ '^[0-9]+$'
      or ((item->>'stake_points')::int) <= 0
  ) then
    raise exception 'invalid allocations';
  end if;

  select *
  into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'game not found';
  end if;

  if v_game.status <> 'scheduled'
     or clock_timestamp() >= v_game.start_at - (p_lock_minutes || ' minutes')::interval then
    raise exception 'prediction deadline passed';
  end if;

  with normalized as (
    select
      (item->>'option')::public.prediction_option as option,
      sum((item->>'stake_points')::int) as stake_points
    from jsonb_array_elements(p_allocations) as item
    group by 1
  )
  select coalesce(sum(stake_points), 0)
  into v_new_total
  from normalized;

  if v_new_total <= 0 or v_new_total > p_max_stake then
    raise exception 'total stake must be 1..%', p_max_stake;
  end if;

  select public.users.point_balance
  into v_balance
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  select coalesce(sum(stake_points), 0)
  into v_current_stake
  from public.prediction_bets
  where game_id = p_game_id
    and user_id = p_user_id;

  v_stake_diff := v_new_total - v_current_stake;

  if v_stake_diff > 0 and v_balance < v_stake_diff then
    raise exception 'point balance is not enough';
  end if;

  update public.users
  set point_balance = public.users.point_balance - v_stake_diff
  where id = p_user_id
  returning public.users.point_balance into v_next_balance;

  delete from public.prediction_bets
  where game_id = p_game_id
    and user_id = p_user_id;

  insert into public.prediction_bets (game_id, user_id, option, stake_points)
  select
    p_game_id,
    p_user_id,
    normalized.option,
    normalized.stake_points
  from (
    select
      (item->>'option')::public.prediction_option as option,
      sum((item->>'stake_points')::int) as stake_points
    from jsonb_array_elements(p_allocations) as item
    group by 1
  ) as normalized;

  select coalesce(
    jsonb_agg(
      jsonb_build_object('option', option::text, 'stake_points', stake_points)
      order by option::text
    ),
    '[]'::jsonb
  )
  into v_allocations
  from public.prediction_bets
  where game_id = p_game_id
    and user_id = p_user_id;

  return query
  select v_next_balance, v_new_total, v_allocations;
end;
$$;

create or replace function public.delete_prediction_bets_atomic(
  p_user_id uuid,
  p_game_id uuid,
  p_lock_minutes int
)
returns table(point_balance int, refunded int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_game public.games%rowtype;
  v_balance int;
  v_refund int := 0;
  v_next_balance int;
begin
  select *
  into v_game
  from public.games
  where id = p_game_id
  for update;

  if not found then
    raise exception 'game not found';
  end if;

  if v_game.status <> 'scheduled'
     or clock_timestamp() >= v_game.start_at - (p_lock_minutes || ' minutes')::interval then
    raise exception 'prediction deadline passed';
  end if;

  select public.users.point_balance
  into v_balance
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  select coalesce(sum(stake_points), 0)
  into v_refund
  from public.prediction_bets
  where game_id = p_game_id
    and user_id = p_user_id;

  delete from public.prediction_bets
  where game_id = p_game_id
    and user_id = p_user_id;

  if v_refund > 0 then
    update public.users
    set point_balance = public.users.point_balance + v_refund
    where id = p_user_id
    returning public.users.point_balance into v_next_balance;
  else
    v_next_balance := v_balance;
  end if;

  return query
  select v_next_balance, v_refund;
end;
$$;

create or replace function public.grant_daily_login_bonus(
  p_user_id uuid,
  p_today_jst date,
  p_bonus_points int default 50
)
returns table(
  applied boolean,
  point_balance int,
  bonus_points int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user public.users%rowtype;
begin
  if p_bonus_points <= 0 then
    raise exception 'invalid login bonus points';
  end if;

  select *
  into v_user
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  if v_user.last_login_bonus_date = p_today_jst then
    return query
    select false, v_user.point_balance, 0;
    return;
  end if;

  update public.users
  set
    point_balance = public.users.point_balance + p_bonus_points,
    last_login_bonus_date = p_today_jst,
    updated_at = now()
  where id = p_user_id
  returning public.users.point_balance
  into v_user.point_balance;

  return query
  select true, v_user.point_balance, p_bonus_points;
end;
$$;

create or replace function public.apply_settlement_atomic(
  p_game_id uuid,
  p_user_id uuid,
  p_season_year int,
  p_is_correct boolean,
  p_stake_points int,
  p_points_delta int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.settlements%rowtype;
  v_balance_adjustment int := 0;
  v_stats_points_adjustment int := 0;
  v_prediction_adjustment int := 0;
  v_correct_adjustment int := 0;
  v_new_payout_points int := 0;
  v_existing_payout_points int := 0;
  v_existing_counts_prediction boolean := false;
begin
  if p_stake_points < 0 or p_points_delta < -p_stake_points then
    raise exception 'invalid settlement values';
  end if;
  if p_is_correct <> (p_points_delta > 0) then
    raise exception 'invalid settlement correctness';
  end if;

  v_new_payout_points := p_stake_points + p_points_delta;

  perform 1
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  select *
  into v_existing
  from public.settlements
  where game_id = p_game_id
    and user_id = p_user_id
  for update;

  if not found then
    insert into public.settlements (
      prediction_id,
      game_id,
      user_id,
      is_correct,
      stake_points,
      points_delta
    )
    values (
      null,
      p_game_id,
      p_user_id,
      p_is_correct,
      p_stake_points,
      p_points_delta
    );

    v_balance_adjustment := v_new_payout_points;
    v_stats_points_adjustment := p_points_delta;
    v_prediction_adjustment := 1;
    v_correct_adjustment := case when p_is_correct then 1 else 0 end;
  else
    v_existing_counts_prediction :=
      not (
        v_existing.is_correct = false
        and v_existing.points_delta = v_existing.stake_points
        and v_existing.points_delta > 0
      );
    v_existing_payout_points :=
      case
        when v_existing_counts_prediction then greatest(v_existing.stake_points + v_existing.points_delta, 0)
        else v_existing.points_delta
      end;

    if v_existing.is_correct = p_is_correct
       and v_existing.stake_points = p_stake_points
       and v_existing.points_delta = p_points_delta then
      return false;
    end if;

    update public.settlements
    set
      is_correct = p_is_correct,
      stake_points = p_stake_points,
      points_delta = p_points_delta,
      settled_at = now()
    where id = v_existing.id;

    v_balance_adjustment := v_new_payout_points - v_existing_payout_points;
    v_stats_points_adjustment :=
      p_points_delta -
      case
        when v_existing_counts_prediction then v_existing.points_delta
        else 0
      end;
    v_prediction_adjustment :=
      1 -
      case
        when v_existing_counts_prediction then 1
        else 0
      end;
    v_correct_adjustment :=
      (case when p_is_correct then 1 else 0 end) -
      (case when v_existing_counts_prediction and v_existing.is_correct then 1 else 0 end);
  end if;

  if v_balance_adjustment <> 0 then
    update public.users
    set point_balance = point_balance + v_balance_adjustment
    where id = p_user_id;
  end if;

  if v_stats_points_adjustment <> 0
     or v_prediction_adjustment <> 0
     or v_correct_adjustment <> 0 then
    perform public.apply_user_stats_delta(
      p_user_id,
      p_season_year,
      v_stats_points_adjustment,
      v_prediction_adjustment,
      v_correct_adjustment
    );
  end if;

  return true;
end;
$$;

create or replace function public.list_unsettled_final_games()
returns table(
  id uuid,
  season_year int,
  winner public.winner_side,
  score_home int,
  score_away int
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.season_year,
    g.winner,
    g.score_home,
    g.score_away
  from public.games g
  where g.status = 'final'
    and g.winner is not null
    and exists (
      select 1
      from public.prediction_bets pb
      left join public.settlements s
        on s.game_id = pb.game_id
       and s.user_id = pb.user_id
      where pb.game_id = g.id
        and (s.id is null or s.settled_at < g.updated_at)
    )
  order by g.updated_at asc, g.id asc;
$$;

create or replace function public.apply_canceled_refund_atomic(
  p_game_id uuid,
  p_user_id uuid,
  p_season_year int,
  p_refund_points int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.settlements%rowtype;
  v_balance_adjustment int := 0;
  v_stats_points_adjustment int := 0;
  v_prediction_adjustment int := 0;
  v_correct_adjustment int := 0;
  v_existing_payout_points int := 0;
  v_existing_counts_prediction boolean := false;
begin
  if p_refund_points < 0 then
    raise exception 'invalid refund values';
  end if;

  perform 1
  from public.users
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user not found';
  end if;

  select *
  into v_existing
  from public.settlements
  where game_id = p_game_id
    and user_id = p_user_id
  for update;

  if not found then
    insert into public.settlements (
      prediction_id,
      game_id,
      user_id,
      is_correct,
      stake_points,
      points_delta
    )
    values (
      null,
      p_game_id,
      p_user_id,
      false,
      p_refund_points,
      p_refund_points
    );

    v_balance_adjustment := p_refund_points;
  else
    v_existing_counts_prediction :=
      not (
        v_existing.is_correct = false
        and v_existing.points_delta = v_existing.stake_points
        and v_existing.points_delta > 0
      );
    v_existing_payout_points :=
      case
        when v_existing_counts_prediction then greatest(v_existing.stake_points + v_existing.points_delta, 0)
        else v_existing.points_delta
      end;

    if v_existing.is_correct = false
       and v_existing.stake_points = p_refund_points
       and v_existing.points_delta = p_refund_points then
      return false;
    end if;

    update public.settlements
    set
      is_correct = false,
      stake_points = p_refund_points,
      points_delta = p_refund_points,
      settled_at = now()
    where id = v_existing.id;

    v_balance_adjustment := p_refund_points - v_existing_payout_points;
    v_stats_points_adjustment :=
      0 -
      case
        when v_existing_counts_prediction then v_existing.points_delta
        else 0
      end;
    v_prediction_adjustment :=
      0 -
      case
        when v_existing_counts_prediction then 1
        else 0
      end;
    v_correct_adjustment :=
      0 -
      case
        when v_existing_counts_prediction and v_existing.is_correct then 1
        else 0
      end;
  end if;

  if v_balance_adjustment <> 0 then
    update public.users
    set point_balance = point_balance + v_balance_adjustment
    where id = p_user_id;
  end if;

  if v_stats_points_adjustment <> 0
     or v_prediction_adjustment <> 0
     or v_correct_adjustment <> 0 then
    perform public.apply_user_stats_delta(
      p_user_id,
      p_season_year,
      v_stats_points_adjustment,
      v_prediction_adjustment,
      v_correct_adjustment
    );
  end if;

  return true;
end;
$$;

create or replace function public.list_unsettled_resolved_games()
returns table(
  id uuid,
  season_year int,
  status public.game_status,
  winner public.winner_side,
  score_home int,
  score_away int
)
language sql
security definer
set search_path = public
as $$
  select
    g.id,
    g.season_year,
    g.status,
    g.winner,
    g.score_home,
    g.score_away
  from public.games g
  where (
      (g.status = 'final' and g.winner is not null)
      or g.status = 'canceled'
    )
    and exists (
      select 1
      from public.prediction_bets pb
      left join public.settlements s
        on s.game_id = pb.game_id
       and s.user_id = pb.user_id
      where pb.game_id = g.id
        and (s.id is null or s.settled_at < g.updated_at)
    )
  order by g.updated_at asc, g.id asc;
$$;

revoke all on function public.apply_user_stats_delta(uuid, int, int, int, int) from public, anon, authenticated;
grant execute on function public.apply_user_stats_delta(uuid, int, int, int, int) to service_role;

revoke all on function public.grant_daily_login_bonus(uuid, date, int) from public, anon, authenticated;
grant execute on function public.grant_daily_login_bonus(uuid, date, int) to service_role;

revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;

revoke all on function public.upsert_prediction_bets_atomic(uuid, uuid, text, jsonb, int, int) from public, anon, authenticated;
grant execute on function public.upsert_prediction_bets_atomic(uuid, uuid, text, jsonb, int, int) to service_role;

revoke all on function public.delete_prediction_bets_atomic(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.delete_prediction_bets_atomic(uuid, uuid, int) to service_role;

revoke all on function public.apply_settlement_atomic(uuid, uuid, int, boolean, int, int) from public, anon, authenticated;
grant execute on function public.apply_settlement_atomic(uuid, uuid, int, boolean, int, int) to service_role;

revoke all on function public.apply_canceled_refund_atomic(uuid, uuid, int, int) from public, anon, authenticated;
grant execute on function public.apply_canceled_refund_atomic(uuid, uuid, int, int) to service_role;

revoke all on function public.list_unsettled_final_games() from public, anon, authenticated;
grant execute on function public.list_unsettled_final_games() to service_role;

revoke all on function public.list_unsettled_resolved_games() from public, anon, authenticated;
grant execute on function public.list_unsettled_resolved_games() to service_role;

alter table public.users enable row level security;
alter table public.teams enable row level security;
alter table public.games enable row level security;
alter table public.predictions enable row level security;
alter table public.prediction_bets enable row level security;
alter table public.settlements enable row level security;
alter table public.user_stats enable row level security;
alter table public.analytics_events enable row level security;
alter table public.auth_sessions enable row level security;
alter table public.sync_logs enable row level security;
alter table public.rate_limit_buckets enable row level security;

drop policy if exists "public read teams" on public.teams;
create policy "public read teams"
on public.teams for select
using (true);

drop policy if exists "public read games" on public.games;
create policy "public read games"
on public.games for select
using (true);

drop policy if exists "users self or service read" on public.users;
create policy "users self or service read"
on public.users for select
using (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "users self or service write" on public.users;
create policy "users self or service write"
on public.users for all
using (auth.uid() = id or auth.role() = 'service_role')
with check (auth.uid() = id or auth.role() = 'service_role');

drop policy if exists "predictions owner or service read" on public.predictions;
create policy "predictions owner or service read"
on public.predictions for select
using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "predictions owner or service write" on public.predictions;
create policy "predictions owner or service write"
on public.predictions for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "prediction_bets owner or service read" on public.prediction_bets;
create policy "prediction_bets owner or service read"
on public.prediction_bets for select
using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "prediction_bets owner or service write" on public.prediction_bets;
create policy "prediction_bets owner or service write"
on public.prediction_bets for all
using (auth.uid() = user_id or auth.role() = 'service_role')
with check (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "settlements owner or service read" on public.settlements;
create policy "settlements owner or service read"
on public.settlements for select
using (auth.uid() = user_id or auth.role() = 'service_role');

drop policy if exists "settlements service write" on public.settlements;
create policy "settlements service write"
on public.settlements for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "user_stats public read" on public.user_stats;
create policy "user_stats public read"
on public.user_stats for select
using (true);

drop policy if exists "user_stats service write" on public.user_stats;
create policy "user_stats service write"
on public.user_stats for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "analytics service write" on public.analytics_events;
create policy "analytics service write"
on public.analytics_events for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "auth_sessions service role only" on public.auth_sessions;
create policy "auth_sessions service role only"
on public.auth_sessions for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "sync_logs service role only" on public.sync_logs;
create policy "sync_logs service role only"
on public.sync_logs for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "rate_limit_buckets service role only" on public.rate_limit_buckets;
create policy "rate_limit_buckets service role only"
on public.rate_limit_buckets for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
