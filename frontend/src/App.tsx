import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './Home';
import { AuthProvider } from './context/Auth';
import { Leaderboard } from './Leaderboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/leaderboard',
    element: <Leaderboard />,
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
