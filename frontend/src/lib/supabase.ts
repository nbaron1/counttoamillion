import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { Database } from '../database.types';

const supabase = createClient<Database>(
  config.supabaseURL,
  config.supabaseAnonKey
);

export { supabase };
