import postgres from 'postgres';
import { config } from './config';

export const sql = postgres(config.databaseURL);
