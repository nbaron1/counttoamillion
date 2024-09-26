create table app_user (
  id uuid primary key,
  created_at timestamp not null default now(),
  username text not null,
  email text unique
);

create table attempt (
  id serial primary key,
  created_at timestamp with time zone not null default CURRENT_TIMESTAMP,
  score int not null default 1,
  user_id uuid references app_user(id) on delete cascade
);

alter table app_user add column current_attempt_id int references attempt(id) on delete set null;

create table game_status (
    id serial primary key,
    ended_at timestamp with time zone,
    started_at timestamp with time zone,
    winner_id uuid references app_user(id) on delete set null
);

insert into game_status default values; 

create table session (
	id uuid primary key,
	created_at timestamp with time zone not null default now(),
	expires_at timestamp with time zone not null default now() + interval '7 days',
	user_id uuid references app_user(id) on delete cascade
);
