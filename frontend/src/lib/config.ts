const throwIfMissing = (env: string): string => {
  const value = import.meta.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  backendHost: throwIfMissing('VITE_BACKEND_HOST'),
  backendWebsocketHost: throwIfMissing('VITE_BACKEND_WEBSOCKET_HOST'),
  supabaseURL: throwIfMissing('VITE_SUPABASE_URL'),
  supabaseAnonKey: throwIfMissing('VITE_SUPABASE_ANON_KEY'),
} as const;
