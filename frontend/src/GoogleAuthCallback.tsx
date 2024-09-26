import { useCallback, useEffect, useRef } from 'react';
import { Spinner } from './Home';
import { authAxios } from './lib/axios';

export function GoogleAuthCallback() {
  const isMakingRequest = useRef(false);

  const authGoogle = useCallback(async (code: string) => {
    try {
      await authAxios.post('/auth/google', { code });
    } catch {
      window.location.href = '/auth/failed';
    }
  }, []);

  useEffect(() => {
    if (isMakingRequest.current) return;
    isMakingRequest.current = true;

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
