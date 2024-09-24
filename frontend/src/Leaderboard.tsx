import { useCallback, useEffect, useState } from 'react';
import { authAxios } from './lib/axios';
import { useUser } from './context/User';
import { redirect } from 'react-router-dom';

const PAGE_SIZE = 50;

function LeaderboardPage({ page }: { page: number }) {
  const [isLoading, setIsLoading] = useState(true);

  const [scores, setScores] = useState<
    {
      created_at: string;
      current_attempt_id: number | null;
      high_score: number;
      id: string;
      username: string;
    }[]
  >([]);

  const getPage = useCallback(async () => {
    // const { data: scores } = await supabase
    //   .from('app_user')
    //   .select('*')
    //   .order('high_score', { ascending: false })
    //   .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
    // todo: get /users?page=1&limit=50

    if (!scores) return;

    setScores(scores);
    setIsLoading(false);
  }, [scores]);

  useEffect(() => {
    getPage();
  }, [getPage]);

  if (isLoading) {
    // TODO: Skeleton loader
    return <p>Loading...</p>;
  }

  return scores.map(({ id, high_score, username }) => (
    <div
      key={id}
      id={`score-${id}`}
      className='flex items-center text-white justify-between'
    >
      <p>{username}</p>
      <p>{high_score}</p>
    </div>
  ));
}

// map -> pageNumber -> isLoading
// we need to make sure they don't move when loading

export function Leaderboard() {
  const [searchTerm, setSearchTerm] = useState('');

  const [leaderboardState, setLeaderboardState] = useState<
    'global' | 'your-ranking'
  >('global');

  const [page, setPage] = useState(1);
  const [numberOfPages, setNumberOfPages] = useState<null | number>(null);

  const user = useUser();

  const getUsersCount = async (): Promise<number> => {
    const response = await authAxios.get('/users/count');

    if (!response.data.success) {
      throw new Error('Failed to get users count');
    }

    return response.data.data.count;
  };

  const getRank = useCallback(async () => {
    try {
      const response = await authAxios.get('/users/me/rank');

      if (!response.data.success) {
        throw new Error('Failed to get rank');
      }

      const rank = {
        position: response.data.data.position,
        rank: response.data.data.rank,
      };

      return rank;
    } catch {
      const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));

      await oneSecond;
      return await getRank();
    }
  }, []);

  useEffect(() => {
    getUsersCount().then((count) => {
      const pageCount = Math.ceil(count / PAGE_SIZE);
      setNumberOfPages(pageCount);
    });
  }, []);

  useEffect(() => {
    if (leaderboardState !== 'your-ranking') return;

    // todo: find a better solution to scroll
    const element = document.getElementById(`score-${user.id}`);
    if (!element) return;

    element.scrollIntoView({ behavior: 'smooth' });
  }, [user, leaderboardState]);

  const handleSelectYourRanking = async () => {
    if (leaderboardState === 'your-ranking') {
      const element = document.getElementById(`score-${user.id}`);
      if (!element) return;

      element.scrollIntoView({ behavior: 'smooth' });

      return;
    }

    const { position } = await getRank();

    const pageNumber = Math.ceil(position / PAGE_SIZE);

    setPage(pageNumber);
    setLeaderboardState('your-ranking');
  };

  if (!numberOfPages) {
    return <p>Loading...</p>;
  }

  return (
    <>
      <div className='flex flex-col max-h-screen'>
        <button onClick={() => redirect('/home')}>Home</button>
        <input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Search for a user'
        />
        <div className='flex flex-col flex-1 overflow-y-scroll'>
          <LeaderboardPage page={page} />
        </div>
        <div className='flex items-center gap-1'>
          <p className='text-white'>Pages num: {numberOfPages}</p>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(1)}
          >
            1
          </button>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(2)}
          >
            2
          </button>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(3)}
          >
            3
          </button>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(4)}
          >
            4
          </button>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(5)}
          >
            5
          </button>
          <button
            className='rounded-xl w-12 h-12 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(6)}
          >
            6
          </button>
        </div>
        <div>
          <button onClick={() => setLeaderboardState('global')}>Global</button>
          <button onClick={handleSelectYourRanking}>Your ranking</button>
        </div>
      </div>
    </>
  );
}
