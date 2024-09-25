create table app_user (
  id uuid primary key,
  created_at timestamp not null default now(),
  username text not null,
  high_score int not null default 1,
  email text unique
);

CREATE INDEX idx_app_user_id_high_score ON app_user(id, high_score);

create table attempt (
  id serial primary key,
  created_at timestamp not null default CURRENT_TIMESTAMP,
  score int not null default 1,
  user_id uuid references app_user(id) on delete cascade
);

alter table app_user add column current_attempt_id int references attempt(id) on delete set null;

create table game_status (
    id serial primary key,
    ended_at timestamp,
    winner_id uuid references app_user(id) on delete set null
);

insert into game_status default values; 

create table session (
	id uuid primary key,
	created_at timestamp not null default now(),
	expires_at timestamp not null default now() + interval '7 days',
	user_id uuid references app_user(id) on delete cascade
);
