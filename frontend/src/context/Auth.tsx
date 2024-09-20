import React, { useEffect, useState } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Spinner } from '../Home';

const UserContext = React.createContext<User | null>(null);

export const useUser = () => React.useContext(UserContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // const [user, setUser] = useState<User | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    const setSessionUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };
    setSessionUser();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log('is here!');

    const handleAnonymousAuth = async () => {
      const response = await supabase.auth.signInAnonymously();
      console.log({ response });
    };

    if (isLoading || user) return;

    handleAnonymousAuth();
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
        <Spinner />
      </div>
    );
  }

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}

//   const [isAuthenticated, setIsAuthenticated] = useState(false);

//   useEffect(() => {
//     const auth = async () => {};

//     auth().then(() => {
//       setIsAuthenticated(true);
//     });
//   }, []);

//   if (!isAuthenticated) {
//     return (
//       <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
//         <Spinner />
//       </div>
//     );
//   }

//   return (
//     <AuthContext.Provider value={{ isAuthenticated, setIsAuthenticated }}>
//       {children}
//     </AuthContext.Provider>
//   );
