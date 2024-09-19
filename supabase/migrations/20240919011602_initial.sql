-- Create tables first
create table app_user (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamp not null default now(),
  username text not null
);

create table attempt (
  id bigserial primary key,
  created_at timestamp not null default CURRENT_TIMESTAMP,
  count bigint not null default 1,
  user_id uuid references app_user(id)
);

create table message (
    id bigserial primary key,
    created_at timestamp not null default CURRENT_TIMESTAMP,
    user_id uuid not null references app_user(id),
    message text not null
);

create table game_status (
    id bigserial primary key,
    started_at timestamp not null default '2024-09-21 07:30:00 PST',
    ended_at timestamp
);

-- Alter tables
alter table app_user add column current_attempt_id bigint references attempt(id);

-- Enable RLS and create policies
alter table "app_user" enable row level security;

alter table "message" enable row level security;
create policy "Viewable by everyone" on message for select to authenticated, anon using (true);

alter table "game_status" enable row level security;
create policy "Viewable by everyone" on game_status for select to authenticated, anon using (true);

alter table "attempt" enable row level security;
create policy "Viewable by everyone" on attempt for select to authenticated, anon using (true);

-- Insert initial data
insert into game_status default values;

-- Create trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  new_attempt_id bigint;
begin
  -- create attempt for the new user
  insert into attempt default values returning id into new_attempt_id;

  -- create new user with new attempt
  insert into app_user (id, username, current_attempt_id) values (new.id, 'Anonymous', new_attempt_id);

  -- update the attempt with the user id
  update attempt set user_id = new.id where id = new_attempt_id;

  return new;
end;
$$;

-- Create trigger
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();