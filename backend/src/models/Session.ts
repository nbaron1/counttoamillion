import { sql } from '../sql';

export class Session {
  constructor(public readonly id: string) {}

  async get({ includeUser }: { includeUser: boolean }) {
    const query = includeUser
      ? sql`
            SELECT *
            FROM session
            INNER JOIN app_user ON session.user_id = app_user.id
            WHERE session.id = ${this.id}
          `
      : sql`
            SELECT *
            FROM session
            WHERE id = ${this.id}
          `;

    const [session] = await query;

    if (!session) {
      return null;
    }

    const isExpired = new Date(session.expires_at).getTime() < Date.now();

    if (isExpired) {
      await this.delete();
      return null;
    }

    return session;
  }

  async delete() {
    await sql`delete from session where id = ${this.id}`;
  }

  async extend() {
    const [session] =
      await sql`update session set expires_at = now() + interval '7 days' where id = ${this.id} returning *`;

    return session;
  }
}
