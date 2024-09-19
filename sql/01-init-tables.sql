create table message (
	id bigserial primary key,
	created_at timestamp not null default CURRENT_TIMESTAMP,
	user_id text not null references app_user(id),
	message text not null
);

create table game_status (
	id bigserial primary key,
	started_at timestamp not null default '2024-09-21 07:30:00 PST',
	ended_at timestamp
);

create table attempt (
	id bigserial primary key,
	created_at timestamp not null default CURRENT_TIMESTAMP,
	count bigint not null default 0,
	user_id text not null references app_user(id)
);

insert into game_status default values;


create table app_user (
  id text primary key,
  created_at timestamp not null default now(),
  username text not null
);

create table attempt (
  id bigserial primary key,
  created_at timestamp not null default CURRENT_TIMESTAMP,
  count bigint not null default 0,
  user_id text not null references app_user(id)
);

alter table app_user
add column current_attempt_id bigint not null references attempt(id);