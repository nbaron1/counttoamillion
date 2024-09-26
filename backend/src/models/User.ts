import { sql } from '../sql';

export class User {
  constructor(public readonly id: string) {}

  async updateEmail(email: string) {
    const [user] =
      await sql`update app_user set email = ${email} where id = ${this.id} returning *`;

    return user;
  }

  async get() {
    const [user] = await sql`select * from app_user where id = ${this.id}`;

    return user;
  }

  async updateUsername(username: string) {
    const [user] =
      await sql`update app_user set username = ${username} where id = ${this.id} returning *`;

    return user;
  }

  async getCurrentAttempt() {
    const [currentAttempt] =
      await sql`select * from app_user join attempt on app_user.current_attempt_id = attempt.id where app_user.id = ${this.id} limit 1`;

    return currentAttempt;
  }

  async getRank() {
    const [userRank] = await sql`
      with ranked_users as (
        select 
          app_user.id, 
          score,
          dense_rank() over (order by score desc) as rank,
          row_number() OVER (order BY score DESC) AS position
        from app_user
        inner join attempt on app_user.current_attempt_id = attempt.id 
      )
      select rank, position
      from ranked_users
      where id = ${this.id}`;

    const data = {
      rank: Number(userRank.rank),
      position: Number(userRank.position),
    };

    return data;
  }
}
