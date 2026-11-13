-- 향수병 포차 daily sales ranking — run once in the Supabase SQL Editor.
-- Safe to run again: everything is "if not exists" / "or replace".
-- Lives in the same Supabase project as AI 엄마 잔소리, in its own table.
--
-- What gets stored: the nickname people type, the night's total, each dish score,
-- a hashed IP (for spam limits) and the play token's nonce (so one night = one entry).

create table if not exists public.pocha_scores (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 1 and 12),
  total int not null check (total between 0 and 22500), -- 15,000 menu + 7,500 max tips
  dishes jsonb not null,
  ip_hash text not null,
  nonce text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists pocha_scores_time on public.pocha_scores (created_at desc);
create index if not exists pocha_scores_ip_time on public.pocha_scores (ip_hash, created_at desc);

-- RLS on with no policies = the public keys can't read or write anything.
alter table public.pocha_scores enable row level security;
revoke all on public.pocha_scores from anon, authenticated;
grant select, insert, delete on public.pocha_scores to service_role;


-- Save one night and return its rank for today (Toronto day).
create or replace function public.submit_pocha(
  p_ip_hash text,
  p_nonce text,
  p_name text,
  p_total int,
  p_dishes jsonb,
  p_per_ip int default 5,      -- entries per person
  p_window_min int default 10  -- ...per this many minutes
)
returns jsonb
language plpgsql
as $$
declare
  v_recent int;
  v_rank int;
  v_today timestamptz := date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto';
begin
  perform pg_advisory_xact_lock(hashtext(p_ip_hash));

  select count(*) into v_recent
  from public.pocha_scores
  where ip_hash = p_ip_hash
    and created_at > now() - make_interval(mins => p_window_min);
  if v_recent >= p_per_ip then
    return jsonb_build_object('ok', false, 'reason', 'ip');
  end if;

  begin
    insert into public.pocha_scores (name, total, dishes, ip_hash, nonce)
    values (p_name, p_total, p_dishes, p_ip_hash, p_nonce);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'reason', 'used'); -- this night was already submitted
  end;

  select count(*) + 1 into v_rank
  from public.pocha_scores
  where created_at >= v_today and total > p_total;

  if random() < 0.02 then
    delete from public.pocha_scores where created_at < now() - interval '30 days';
  end if;

  return jsonb_build_object('ok', true, 'rank', v_rank);
end;
$$;


-- Today's top N + how many nights were played today
create or replace function public.pocha_top(p_limit int default 10)
returns jsonb
language sql
stable
as $$
  with today as (
    select name, total, created_at
    from public.pocha_scores
    where created_at >= date_trunc('day', now() at time zone 'America/Toronto') at time zone 'America/Toronto'
  )
  select jsonb_build_object(
    'count', (select count(*) from today),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('name', name, 'total', total) order by total desc, created_at asc)
      from (select * from today order by total desc, created_at asc limit p_limit) t
    ), '[]'::jsonb)
  );
$$;


revoke execute on function public.submit_pocha(text, text, text, int, jsonb, int, int) from public, anon, authenticated;
revoke execute on function public.pocha_top(int) from public, anon, authenticated;
grant execute on function public.submit_pocha(text, text, text, int, jsonb, int, int) to service_role;
grant execute on function public.pocha_top(int) to service_role;
