import { GoogleAuth } from './GoogleAuth';
import { GuestAuth } from './GuestAuth';
import { UserProvider } from './context/User';
import { Home } from './Home';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GoogleAuthCallback } from './GoogleAuthCallback';
import { FailedAuth } from './FailedAuth';
import { Logout } from './Logout';
import { useEffect } from 'react';
import { updateColors } from './utils/updateColors';
import { Toaster } from 'react-hot-toast';

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <UserProvider>
        <Home />
      </UserProvider>
    ),
  },
  {
    path: '/auth/guest',
    element: <GuestAuth />,
  },
  {
    path: '/auth/google/callback',
    element: <GoogleAuthCallback />,
  },
  {
    path: '/auth/google',
    element: <GoogleAuth />,
  },
  {
    path: '/auth/failed',
    element: <FailedAuth />,
  },
  {
    path: '/logout',
    element: <Logout />,
  },
]);

export function App() {
  useEffect(() => {
    updateColors();
  }, []);

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
