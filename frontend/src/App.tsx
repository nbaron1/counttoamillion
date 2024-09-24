import { GoogleAuth } from './GoogleAuth';
import { GuestAuth } from './GuestAuth';
import { UserProvider } from './context/User';
import { Home } from './Home';
import { Leaderboard } from './Leaderboard';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GoogleAuthCallback } from './GoogleAuthCallback';
import { FailedAuth } from './FailedAuth';
import { Logout } from './Logout';

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
    path: '/leaderboard',
    element: (
      <UserProvider>
        <Leaderboard />
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
  return <RouterProvider router={router} />;
}
