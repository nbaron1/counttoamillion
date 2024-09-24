import React, { createContext, useCallback, useEffect, useState } from 'react';
import { Spinner } from '../Home';
import { authAxios } from '../lib/axios';

type User = {
  id: string;
  crated_at: string;
  username: string;
  high_score: number;
};

const UserContext = createContext<null | User>(null);

export const useUser = () => {
  const user = React.useContext(UserContext);

  if (!user) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return user;
};

const useLocation = () => {
  const [location, setLocation] = useState<null | string>(null);

  useEffect(() => {
    setLocation(window.location.pathname);
  }, []);

  return location;
};

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<null | User>(null);
  const location = useLocation();

  const getUser = useCallback(async () => {
    try {
      const response = await authAxios.get('/users/me');

      if (!response.data.success) {
        throw new Error('Failed to get user');
      }

      return response.data.data.user;
    } catch {
      const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));
      await oneSecond;

      return await getUser();
    }
  }, []);

  useEffect(() => {
    getUser().then((user) => {
      setUser(user);
    });
  }, [getUser, location]);

  if (!user) {
    return (
      <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
        <Spinner />
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
