const throwIfMissing = (env: string): string => {
  const value = import.meta.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  backendWebsocketHost: throwIfMissing('VITE_BACKEND_WEBSOCKET_HOST'),
  turnstileSiteKey: throwIfMissing('VITE_CF_TURNSTILE_KEY'),
  backendApiHost: throwIfMissing('VITE_BACKEND_API_HOST'),
  googleClientId: throwIfMissing('VITE_GOOGLE_CLIENT_ID'),
} as const;
