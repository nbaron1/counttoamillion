create table message (
	id bigserial primary key,
	created_at timestamp not null default CURRENT_TIMESTAMP,
	user_id text not null references "user"(id),
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
	count bigint not null,
	user_id text not null references "user"(id)
);

insert into game_status default values;

create table "user" (
 	/* Use a UUID so people can't guess the id if someone steals our JWT secret */
	id text primary key,
	created_at timestamp not null default now(),
	count bigint not null default 0
);

-- create table websocket_connection_token (
-- 	/* Use a UUID so people can't guess the id if someone steals our JWT secret */
-- 	id text primary key,
-- 	created_at timestamp not null default now(),
-- 	user_id text not null references "user"(id) 
-- );