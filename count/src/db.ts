import postgres from 'postgres';
import { config } from './config';

const db = postgres(config.databaseURL);

export { db };
