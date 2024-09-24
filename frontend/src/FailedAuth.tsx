import { useEffect } from 'react';

export function FailedAuth() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }, []);

  return (
    <p className='text-white text-center'>
      Something went wrong. We weren't able to log you on. Redirect to the
      homepage...
    </p>
  );
}
