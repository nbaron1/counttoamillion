import { useCallback, useEffect } from 'react';
import { Spinner } from './Home';
import { authAxios } from './lib/axios';

export function GoogleAuthCallback() {
  const authGoogle = useCallback(async (code: string) => {
    try {
      await authAxios.post('/auth/google', { code });
    } catch {
      // todo: add sentry logging
      window.location.href = '/auth/failed';
    }
  }, []);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');

    if (!code) {
      window.location.href = '/auth/failed';
      return;
    }

    authGoogle(code);
  }, [authGoogle]);

  return (
    <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
      <Spinner />
    </div>
  );
}