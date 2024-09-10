import { Client } from 'pg';
import { config } from './config';

const db = new Client({
  connectionString: config.databaseURL,
  ...(process.env.APP_ENV === 'production' && {
    ssl: {
      rejectUnauthorized: false,
      // ca: process.env.CA_CERT
    },
  }),
});

db.connect().then(() => {
  console.log('DB connected');
});

export { db };
