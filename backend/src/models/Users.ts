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
    SELECT 
        a.*,
        au.*,
        au.id AS id,
        RANK() OVER (ORDER BY a.score DESC) AS rank,
        ROW_NUMBER() OVER (order by score desc) as position
    FROM 
        app_user au
    JOIN 
        attempt a ON au.current_attempt_id = a.id
    ORDER BY 
        a.score DESC, au.username
    LIMIT ${limit}
    OFFSET ${offset}`;

    const mappedUsers = users.map((user: any) => {
      return {
        ...user,
        rank: Number(user.rank),
        position: Number(user.position),
      };
    });

    return mappedUsers;
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
        SET current_attempt_id = ${newAttempt.id}
        WHERE id = ${user.id}`;

      return { session, user };
    });

    return { session, user };
  }
}
