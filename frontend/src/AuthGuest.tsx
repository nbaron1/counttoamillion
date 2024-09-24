import { useCallback, useEffect, useRef } from 'react';
import { authAxios } from './lib/axios';
import { Spinner } from './Home';

export function AuthGuest() {
  const isMakingRequest = useRef(false);

  const auth = useCallback(async () => {
    try {
      await authAxios.post('/auth/guest');
    } catch {
      const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));
      await oneSecond;
    }
  }, []);

  useEffect(() => {
    if (isMakingRequest.current) return;
    isMakingRequest.current = true;

    auth();
  }, [auth]);

  return (
    <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
      <Spinner />
    </div>
  );
}
