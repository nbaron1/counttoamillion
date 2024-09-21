import React, { useEffect, useState } from 'react';
import { type User } from '@supabase/supabase-js';
import { Spinner } from '../Home';

const UserContext = React.createContext<User | null>(null);

export const useUser = () => React.useContext(UserContext);

// todo: websocket token provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  const auth = async () => {
    const response = await fetch('/api/auth', { method: 'POST' });

    if (!response.ok) {
      return;
    }

    setIsLoading(false);
  };

  useEffect(() => {
    auth();
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className='text-white fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
        <Spinner />
      </div>
    );
  }

  return <UserContext.Provider value={null}>{children}</UserContext.Provider>;
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
