import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Home } from './Home';
import { AuthProvider } from './context/Auth';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/leaderboard',
    element: <p>Leaderboard</p>,
  },
]);

export function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
