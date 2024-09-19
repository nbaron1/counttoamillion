import 'dotenv/config';

const throwIfMissing = (env: string) => {
  const value = process.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,
  databaseURL: throwIfMissing('DATABASE_URL'),
  frontendHost: throwIfMissing('FRONTEND_HOST'),
  turnstileSecret: throwIfMissing('CF_TURNSTILE_SECRET'),
  supabaseURL: throwIfMissing('SUPABASE_URL'),
  supabaseSecretKey: throwIfMissing('SUPABASE_SECRET_KEY'),
};
