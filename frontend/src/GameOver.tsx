import { useEffect, useState } from 'react';
import { authAxios } from './lib/axios';
import { Spinner } from './Home';

const getGameStatus = async () => {
  try {
    const response = await authAxios.get('/game-status');

    if (!response.data.success) {
      throw new Error('Failed to get game status');
    }

    return response.data.data.gameStatus;
  } catch {
    const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));
    await oneSecond;

    return await getGameStatus();
  }
};

const getUser = async (id: string) => {
  try {
    const response = await authAxios.get(`/users/${id}`);

    if (!response.data.success) {
      throw new Error('Failed to get user data');
    }

    return response.data.data.user;
  } catch (error) {
    console.error(error);

    const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));
    await oneSecond;

    return await getUser(id);
  }
};

function getTimeTakenString(diffMs: number): string {
  // Parse the UTC timestamp

  // Convert milliseconds to different units
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  const valueSeconds = diffSeconds % 60;
  const valueMinutes = diffMinutes % 60;
  const valueHours = diffHours % 24;
  const valueDays = diffDays;

  return `${valueDays} day${valueDays === 1 ? '' : 's'}, ${valueHours} hour${
    valueHours === 1 ? '' : 's'
  }, ${valueMinutes} minute${
    valueMinutes === 1 ? '' : 's'
  }, and ${valueSeconds} second${valueSeconds === 1 ? '' : 's'}`;
}

const getTimeTakenInMilliseconds = (started_at: string, ended_at: string) => {
  const pastDate = new Date(started_at);
  const endedData = new Date(ended_at);

  // Calculate the difference in milliseconds
  const diffMs = endedData.getTime() - pastDate.getTime();

  return diffMs;
};

type User = {
  id: string;
  email: null;
  high_score: number;
  username: string;
  created_at: string;
  current_attempt_id: number;
};

type GameStatus = {
  ended_at: string;
  id: number;
  started_at: string | null;
  winner_id: string | null;
};

export function GameOver() {
  const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
  const [winner, setWinner] = useState<User | null>(null);

  useEffect(() => {
    getGameStatus().then((status) => {
      if (!status.winner_id) {
        window.location.href = '/';
        return;
      }

      getUser(status.winner_id).then((user) => {
        setWinner(user);
      });

      setGameStatus(status);
    });
  }, []);

  if (!winner || !gameStatus) {
    return (
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Spinner />
      </div>
    );
  }

  if (!gameStatus.started_at || !gameStatus.ended_at) {
    window.location.href = '/';
    return;
  }

  const diffInMs = getTimeTakenInMilliseconds(
    gameStatus.started_at,
    gameStatus.ended_at
  );

  const timeTakenString = getTimeTakenString(diffInMs);

  return (
    <p className='fixed text-3xl text-white left-5 right-5 sm:text-center sm:left-12 sm:right-12 md:left-1/2 md:right-auto md:-translate-x-1/2 -translate-y-3/4 md:max-w-[750px] top-1/2'>
      This website was been beaten by {winner.username} in
      <br />
      {timeTakenString}
    </p>
  );
}
