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
    WITH ranked_users AS (
        SELECT 
            au.id,
            a.score,
            DENSE_RANK() OVER (ORDER BY a.score DESC, au.created_at ASC) AS rank,
            ROW_NUMBER() OVER (ORDER BY a.score DESC, au.created_at ASC) as position
        FROM 
            app_user au
        JOIN 
            attempt a ON au.current_attempt_id = a.id
    )
    SELECT 
      ru.*
    FROM 
        ranked_users ru
    WHERE 
        ru.id = ${this.id}`;

    const data = {
      rank: Number(userRank.rank),
      position: Number(userRank.position),
    };

    return data;
  }
}
