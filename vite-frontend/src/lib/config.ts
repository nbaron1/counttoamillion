const throwIfMissing = (env: string): string => {
  const value = import.meta.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  backendWebsocketHost: throwIfMissing('VITE_BACKEND_WEBSOCKET_HOST'),
  supabaseURL: throwIfMissing('VITE_SUPABASE_URL'),
  supabaseAnonKey: throwIfMissing('VITE_SUPABASE_ANON_KEY'),
  turnstileSiteKey: throwIfMissing('VITE_CF_TURNSTILE_KEY'),
  backendApiHost: throwIfMissing('VITE_BACKEND_API_HOST'),
} as const;
