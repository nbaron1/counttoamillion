const throwIfMissing = (env: string): string => {
  const value = import.meta.env[env];

  if (!value) {
    throw new Error(`Missing environment variable: ${env}`);
  }

  return value;
};

export const config = {
  backendWebsocketHost: throwIfMissing('PUBLIC_BACKEND_WEBSOCKET_HOST'),
  turnstileSiteKey: throwIfMissing('PUBLIC_CF_TURNSTILE_KEY'),
} as const;
