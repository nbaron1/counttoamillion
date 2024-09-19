import { createClient } from '@supabase/supabase-js';
import { config } from './config';
import { Database } from './database.types';

export const supabase = createClient<Database>(
  config.supabaseURL,
  config.supabaseSecretKey
);
