import { createContext, useContext, useState } from 'react';

type Page = 'home' | 'leaderboard' | 'content';

const PageContext = createContext<{
  setPage: (value: Page) => void;
  page: Page;
}>({
  page: 'home',
  setPage: () => null,
});

export const usePage = () => useContext(PageContext);

export const PageProvider = ({ children }: { children: React.ReactNode }) => {
  const [page, setPage] = useState<Page>('home');

  return (
    <PageContext.Provider value={{ page, setPage }}>
      {children}
    </PageContext.Provider>
  );
};
