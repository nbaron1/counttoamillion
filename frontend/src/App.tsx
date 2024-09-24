import { AuthGoogle } from './AuthGoogle';
import { AuthGuest } from './AuthGuest';
import { UserProvider } from './context/User';
import { Home } from './Home';
import { Leaderboard } from './Leaderboard';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

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
    element: <AuthGuest />,
  },
  {
    path: '/auth/google',
    element: <AuthGoogle />,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
