drop table if exists attempt;

create table attempt (
  id serial primary key,
  created_at timestamp not null default current_timestamp,
  max_count int not null
);