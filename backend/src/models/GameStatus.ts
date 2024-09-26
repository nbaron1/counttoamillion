import { sql } from '../sql';

export class GameStatus {
  async get() {
    const [gameStatus] = await sql`select * from game_status where id = 1`;

    return gameStatus;
  }
}
