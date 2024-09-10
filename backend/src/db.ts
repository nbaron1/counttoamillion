import { Client } from 'pg';
import { config } from './config';

const db = new Client({
  connectionString: config.databaseURL,
});

db.connect().then(() => {
  console.log('DB connected');
});

export { db };
