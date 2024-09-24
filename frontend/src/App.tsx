import { Auth } from './Auth';
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
    path: '/auth',
    element: <Auth />,
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
