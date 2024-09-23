import { AuthProvider } from './context/Auth';
import { PageProvider, usePage } from './context/Page';
import { Home } from './Home';
import { Leaderboard } from './Leaderboard';

function Router() {
  const { page } = usePage();

  switch (page) {
    case 'home': {
      return <Home />;
    }
    case 'leaderboard': {
      return <Leaderboard />;
    }
  }
}

export function App() {
  return (
    <PageProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </PageProvider>
  );
}
