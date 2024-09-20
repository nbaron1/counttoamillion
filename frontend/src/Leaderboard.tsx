import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { AuthProvider } from './context/Auth';

const PAGE_SIZE = 10;

function LeaderboardPage({ page }: { page: number }) {
  const [scores, setScores] = useState<
    {
      created_at: string;
      current_attempt_id: number | null;
      highest_count: number;
      id: string;
      username: string;
    }[]
  >([]);

  console.log('leaderboard page');

  const getPage = useCallback(async () => {
    const { data: scores } = await supabase
      .from('app_user')
      .select('*')
      .order('highest_count')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (!scores) return;

    setScores(scores);
  }, [page]);

  useEffect(() => {
    getPage();
  }, [getPage]);

  return scores.map(({ id, highest_count, username }) => (
    <div key={id} className='flex items-center text-white justify-between'>
      <p>{username}</p>
      <p>{highest_count}</p>
    </div>
  ));
}

export function LeaderboardApp() {
  const [pages, setPages] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // const [usersCount, setUsersCount] = useState<null | number>(null);

  const getUsersCount = async () => {
    const { count } = await supabase
      .from('app_user')
      .select('*', { count: 'exact', head: true });

    console.log({ count });

    // setUsersCount(count);

    // setUsersCount(count);
  };

  useEffect(() => {
    getUsersCount();
  }, []);

  return (
    <AuthProvider>
      <div className='flex flex-col'>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Search for a user'
        />
        <div className='flex flex-col'>
          {Array.from({ length: pages + 1 }).map((_, index) => (
            <LeaderboardPage page={index} key={index} />
          ))}
        </div>
        <button className='bg-gray-600 text-white px-3 py-2 rounded-md'>
          Load more
        </button>
      </div>
    </AuthProvider>
  );
}
