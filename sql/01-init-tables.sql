drop table if exists attempt;

create table attempt (
  id  integer primary key autoincrement,
  created_at timestamp not null default current_timestamp,
  max_count integer not null
);