import { useCallback, useEffect, useState } from 'react';
import { authAxios } from './lib/axios';
import { useUser } from './context/User';
import { redirect } from 'react-router-dom';

const PAGE_SIZE = 50;

function SearchIcon() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 18 18'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        fill-rule='evenodd'
        clip-rule='evenodd'
        d='M6 3.5C3.51472 3.5 1.5 5.51472 1.5 8C1.5 10.4853 3.51472 12.5 6 12.5C8.48528 12.5 10.5 10.4853 10.5 8C10.5 5.51472 8.48528 3.5 6 3.5ZM0 8C0 4.68629 2.68629 2 6 2C9.31371 2 12 4.68629 12 8C12 9.38652 11.5297 10.6632 10.7399 11.6792L14.7803 15.7197C15.0732 16.0126 15.0732 16.4874 14.7803 16.7803C14.4874 17.0732 14.0126 17.0732 13.7197 16.7803L9.67927 12.7399C8.66325 13.5297 7.38655 14 6 14C2.68629 14 0 11.3137 0 8Z'
        fill='white'
      />
    </svg>
  );
}

function ReloadIcon() {
  return (
    <svg
      width='18'
      height='18'
      viewBox='0 0 18 18'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        fill-rule='evenodd'
        clip-rule='evenodd'
        d='M9 3C7.34219 3 5.84261 3.67136 4.75589 4.75883C4.1876 5.32751 3.54226 6.09846 3.02309 6.75H6C6.41421 6.75 6.75 7.08579 6.75 7.5C6.75 7.91421 6.41421 8.25 6 8.25H1.5C1.08579 8.25 0.75 7.91421 0.75 7.5V3C0.75 2.58579 1.08579 2.25 1.5 2.25C1.91421 2.25 2.25 2.58579 2.25 3V5.32083C2.70141 4.77186 3.21514 4.17859 3.69486 3.69853C5.05142 2.34105 6.9282 1.5 9 1.5C13.1421 1.5 16.5 4.85786 16.5 9C16.5 13.1421 13.1421 16.5 9 16.5C5.57966 16.5 2.69588 14.2111 1.79323 11.0829C1.67839 10.685 1.90791 10.2692 2.30589 10.1544C2.70386 10.0396 3.11958 10.2691 3.23442 10.6671C3.95678 13.1704 6.2657 15 9 15C12.3137 15 15 12.3137 15 9C15 5.68629 12.3137 3 9 3Z'
        fill='white'
      />
    </svg>
  );
}

function LeaderboardPage({ page }: { page: number }) {
  const [isLoading, setIsLoading] = useState(true);

  const [users, setUsers] = useState<
    {
      created_at: string;
      current_attempt_id: number | null;
      high_score: number;
      id: string;
      username: string;
      score: number;
    }[]
  >([]);

  const getUsersOnPage = useCallback(async (page: number) => {
    try {
      const response = await authAxios.get(`/users?page=${page}`);

      if (!response.data.success) {
        throw new Error('Not successful');
      }

      return response.data.data.users;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      return await getUsersOnPage(page);
    }
  }, []);

  useEffect(() => {
    getUsersOnPage(page).then((data) => {
      console.log({ data });
      setUsers(data);
      setIsLoading(false);
    });
  }, [getUsersOnPage, page]);

  if (isLoading) {
    return <p>Loading...</p>;
  }

  console.log(users);

  return users.map(({ id, score, username }) => (
    <div
      key={id}
      id={`score-${id}`}
      className='flex items-center flex-col text-white justify-between'
    >
      <div className='flex items-center justify-between w-full'>
        <p className='text-lg'>{username}</p>
        <p className='text-lg'>{score}</p>
      </div>
      <button className='rounded-md py-2 px-12 bg-secondary border border-tertiary w-full'>
        Reset score
      </button>
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

  const { user } = useUser();

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
        <button
          onClick={() => {
            console.log('redirect home');
            redirect('/');
          }}
        >
          Home
        </button>
        <div className='flex items-center justify-between'>
          <h2 className='text-2xl text-white'>Leaderboard</h2>
          <button
            aria-label='Reload'
            className='bg-secondary border border-tertiary w-fit rounded-xl p-2'
          >
            <ReloadIcon />
          </button>
        </div>
        <div className='relative'>
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder='Search for a user'
            className='bg-secondary w-full pl-10 outline-0 h-14 placeholder:text-gray-200 border-tertiary border text-white rounded-2xl'
          />
          <div className='absolute top-1/2 -translate-y-1/2 left-4'>
            <SearchIcon />
          </div>
        </div>
        <div className='flex flex-col flex-1 gap-3 overflow-y-scroll'>
          <LeaderboardPage page={page} />
        </div>
        <div className='flex items-center gap-1'>
          <p className='text-white'>Pages num: {numberOfPages}</p>
          <button
            className='rounded-xl w-10 h-10 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(1)}
          >
            1
          </button>
          <button
            className='rounded-xl w-10 h-10 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(2)}
          >
            2
          </button>
          <button
            className='rounded-xl w-10 h-10 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(3)}
          >
            3
          </button>
          <button
            className='rounded-xl w-10 h-10 bg-[#8F35FF] text-white border border-[#B880FF]'
            onClick={() => setPage(4)}
          >
            4
          </button>
          <button
            className='rounded-xl w-10 h-10 bg-[#8F35FF] text-white border border-[#B880FF]'
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
