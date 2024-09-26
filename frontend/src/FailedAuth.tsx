import { useEffect } from 'react';

export function FailedAuth() {
  useEffect(() => {
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
  }, []);

  return (
    <p className='text-white text-center mt-12 text-xl leading-[2]'>
      Something went wrong. We were unable to log you in.
      <br />
      Redirecting you to the homepage...
    </p>
  );
}
