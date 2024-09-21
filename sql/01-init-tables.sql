create table app_user (
  id uuid primary key,
  created_at timestamp not null default now(),
  username text not null,
  highest_count bigint not null default 1
);

create table attempt (
  id bigserial primary key,
  created_at timestamp not null default CURRENT_TIMESTAMP,
  count bigint not null default 1,
  user_id uuid references app_user(id) on delete cascade
);

-- Alter tables
alter table app_user add column current_attempt_id bigint references attempt(id);

create table game_status (
    id bigserial primary key,
    started_at timestamp not null default '2024-09-21 07:30:00 PST',
    ended_at timestamp
);

insert into game_status default values;

-- Update the highest_count column in app_user
CREATE OR REPLACE FUNCTION update_highest_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE app_user
    SET highest_count = GREATEST(COALESCE(highest_count, 0), NEW.count)
    WHERE id = NEW.user_id;

    -- TODO: Check if count is higher than 1,000,000 and if so end the game

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_highest_count_trigger
AFTER INSERT OR UPDATE ON attempt
FOR EACH ROW
EXECUTE FUNCTION update_highest_count();
 