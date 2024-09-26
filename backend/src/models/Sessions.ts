import { sql } from '../sql';

export class Sessions {
  async create(userId: string) {
    const [session] =
      await sql`insert into session (id, user_id) values (gen_random_uuid(), ${userId}) returning *`;

    return session;
  }
}
