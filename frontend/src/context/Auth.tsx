import React, { useEffect, useState } from 'react';
import { axiosInstance } from '../lib/axios';

const AuthContext = React.createContext<{
  isAuthenticated: boolean;
  setIsAuthenticated: (value: boolean) => void;
}>({ isAuthenticated: false, setIsAuthenticated: () => null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const auth = async () => {
      try {
        console.log('Authenticating...');
        const response = await axiosInstance.post('/v1/auth');

        if (!response.data.success) {
          throw new Error('Failed to authenticate');
        }

        return response;
      } catch (error) {
        console.error('Failed to authenticate', error);
        const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));

        await oneSecond;
      }
    };

    auth().then(() => {
      setIsAuthenticated(true);
    });
  }, []);

  if (!isAuthenticated) {
    return <p className='text-white'>Loading...</p>;
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}
