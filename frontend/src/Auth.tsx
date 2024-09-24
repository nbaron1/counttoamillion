import { useEffect } from 'react';
import { authAxios } from './lib/axios';
import { Spinner } from './Home';

export function Auth() {
  const auth = async () => {
    try {
      await authAxios.post('/auth');
    } catch {
      const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));
      await oneSecond;
    }
  };

  useEffect(() => {
    auth();
  }, []);

  return (
    <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
      <Spinner />
    </div>
  );
}
