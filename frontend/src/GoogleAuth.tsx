import { useCallback, useEffect, useRef } from 'react';
import { Spinner } from './Home';
import { config } from './lib/config';

export function GoogleAuth() {
  const isMakingRequest = useRef(false);

  const initiateGoogleLogin = useCallback(() => {
    const clientId = config.googleClientId;
    const redirectUri = config.googleRedirectURI;
    const scope = 'email profile';

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    window.location.href = googleAuthUrl;
  }, []);

  useEffect(() => {
    if (isMakingRequest.current) return;
    isMakingRequest.current = true;

    initiateGoogleLogin();
  }, [initiateGoogleLogin]);

  return (
    <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
      <Spinner />
    </div>
  );
}
