import { AuthProvider } from './context/Auth';
import { Home } from './Home';

export function AppHome() {
  return (
    <AuthProvider>
      <Home />
    </AuthProvider>
  );
}
