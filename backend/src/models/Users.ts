import { sql } from '../sql';
import { generateRandomUsername } from '../utils/generateARandomUsername';

export class Users {
  async getByEmail(email: string) {
    const [users] = await sql`select * from app_user where email = ${email}`;

    return users;
  }

  async getCount() {
    const [count] = await sql`select count(*) from app_user`;

    return count;
  }

  async getRanked({ page, limit }: { limit: number; page: number }) {
    const offset = (page - 1) * limit;

    const users = await sql`
    with ranked_users as (
      select
        *,
        dense_rank() over (order by score desc) as rank,
        row_number() OVER (order by score desc) as position
      from app_user
      inner join attempt on app_user.current_attempt_id = attempt.id
    )
    select *
    from ranked_users
    order by rank asc
    limit ${limit}
    offset ${offset}`;

    return users;
  }

  async create(email: string | null) {
    const { session, user } = await sql.begin(async (sql) => {
      const username = generateRandomUsername();

      const [user] = await sql`
        INSERT INTO app_user (id, username, email)
        VALUES (gen_random_uuid(), ${username}, ${email}) RETURNING id`;

      const [session] = await sql`
        INSERT INTO session (id, user_id)
        VALUES (gen_random_uuid(), ${user.id}) RETURNING id`;

      const [newAttempt] = await sql`
        INSERT INTO attempt (user_id)
        VALUES (${user.id}) RETURNING id`;

      await sql`
        UPDATE app_user
        SET current_attempt_id = ${newAttempt.id}`;

      return { session, user };
    });

    return { session, user };
  }
}
