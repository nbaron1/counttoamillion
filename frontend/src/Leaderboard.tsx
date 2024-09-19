import { useCallback, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const PAGE_SIZE = 10;

function LeaderboardPage({ page }: { page: number }) {
  const [scores, setScores] = useState([]);

  const getPage = useCallback(() => {
    const scores = supabase
      .from('app_user')
      .select('*')
      .order('highest_count')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  }, [page]);

  useEffect(() => {
    getPage();
  }, [getPage]);

  return <p>Leadeboard</p>;
}

export function Leaderboard() {
  const [pages, setPages] = useState(0);
  const [maxCount, setMaxCount] = useState(0);

  const [usersCount, setUsersCount] = useState();

  const getUsersCount = async () => {
    const { data } = await supabase
      .from('app_user')
      .select('*', { count: 'exact', head: true });

    console.log({ data });

    // setUsersCount(count);
  };

  useEffect(() => {
    getUsersCount();
  }, []);

  return (
    <div>
      <input placeholder='Search for a user' />
      {Array.from({ length: pages }).map((_, index) => (
        <LeaderboardPage page={index} key={index} />
      ))}
    </div>
  );
}
