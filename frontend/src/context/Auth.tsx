import React, { useEffect, useState } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Spinner } from '../Home';
import { generateRandomUsername } from '../utils/generateRandomUsername';

const UserContext = React.createContext<User | null>(null);

export const useUser = () => {
  const user = React.useContext(UserContext);

  if (!user) {
    throw new Error('useUser must be used within a UserProvider');
  }

  return user;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check active sessions and sets the user
    const setSessionUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    setSessionUser();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleAnonymousAuth = async () => {
      const username = generateRandomUsername();

      const response = await supabase.auth.signInAnonymously({
        options: {
          data: {
            username,
          },
        },
      });
      console.log({ response });
    };

    if (user) return;

    handleAnonymousAuth();
  }, [user]);

  if (!user) {
    return (
      <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
        <Spinner />
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
