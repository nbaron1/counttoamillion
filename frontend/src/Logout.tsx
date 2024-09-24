import { useCallback, useEffect } from 'react';
import { authAxios } from './lib/axios';

export function Logout() {
  const logout = useCallback(async () => {
    try {
      await authAxios.post('/auth/logout');
    } catch {
      setTimeout(() => {
        logout();
      }, 1000);
    }
  }, []);

  useEffect(() => {
    logout();
  }, [logout]);

  return null;
}
