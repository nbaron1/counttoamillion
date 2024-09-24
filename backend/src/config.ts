import 'dotenv/config';

const throwIfMissing = (env: string): string => {
  const value = process.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 5000,
  turnstileSecret: throwIfMissing('CF_TURNSTILE_SECRET'),
  databaseURL: throwIfMissing('DATABASE_URL'),
  redisURL: throwIfMissing('REDIS_URL'),
  maxRequestsSinceVerification: Number(
    throwIfMissing('MAX_REQUESTS_SINCE_VERIFICATION')
  ),
  googleRedirectURI: throwIfMissing('GOOGLE_REDIRECT_URI'),
  googleClientId: throwIfMissing('GOOGLE_CLIENT_ID'),
  googleClientSecret: throwIfMissing('GOOGLE_CLIENT_SECRET'),
} as const;
