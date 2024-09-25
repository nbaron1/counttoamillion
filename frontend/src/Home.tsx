import React, { useCallback, useEffect, useRef, useState } from 'react';
import './dialog.css';
import './hide-scrollbar.css';
import { Turnstile } from '@marsidev/react-turnstile';
import { config } from './lib/config';
import { authAxios } from './lib/axios';
import axios from 'axios';
import { useUser } from './context/User';

const WEBSOCKET_HOST = import.meta.env.VITE_BACKEND_WEBSOCKET_HOST;

if (!WEBSOCKET_HOST) {
  throw new Error('VITE_BACKEND_WEBSOCKET_HOST not found');
}

export function Spinner() {
  return <span className='loader' />;
}

type GameStatusData = {
  id: number;
  started_at: string;
  ended_at: string | null;
};

const createEventEmitter = () => {
  const listeners = new Map();

  const on = (event: string, callback: (data: unknown) => void) => {
    if (!listeners.has(event)) {
      listeners.set(event, new Set());
    }
    listeners.get(event).add(callback);
    return () => off(event, callback);
  };

  const off = (event: string, callback: (data: unknown) => void) => {
    if (listeners.has(event)) {
      listeners.get(event).delete(callback);
    }
  };

  const emit = (event: string, data: unknown) => {
    if (listeners.has(event)) {
      listeners
        .get(event)
        .forEach((callback: (data: unknown) => void) => callback(data));
    }
  };

  return { on, off, emit };
};

const eventEmitter = createEventEmitter();

const useSubscribe = () => {
  return (topic: string, cb: (data: any) => void) => {
    eventEmitter.on(topic, cb);

    return () => {
      eventEmitter.off(topic, cb);
    };
  };
};

const useWebsocket = (connectionURL: string, topic: string) => {
  const websocketRef = useRef<WebSocket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const user = useUser();

  const handleOpen = useCallback(() => {
    setIsLoading(false);

    retryTimeoutsRef.current.forEach((timeout) => {
      clearTimeout(timeout);
    });
  }, []);

  const sendMessage = (data: string) => {
    websocketRef.current?.send(data);
  };

  useEffect(() => {
    const connectWebSocket = async () => {
      if (!user) return; // Only connect if user is authenticated

      const websocket = new WebSocket(connectionURL);

      websocket.addEventListener('open', handleOpen);
      websocket.addEventListener('close', (event) => {
        console.log('close!', event);

        // if because of unauthorized redirect to /auth

        if (websocketRef.current) {
          websocketRef.current.removeEventListener('open', handleOpen);
        }

        websocketRef.current = null;

        // clear previous timeouts
        retryTimeoutsRef.current.forEach((timeout) => {
          clearTimeout(timeout);
        });

        retryTimeoutsRef.current = [];

        const newTimeout = setTimeout(async () => {
          connectWebSocket();
        }, 1500);

        retryTimeoutsRef.current.push(newTimeout);
      });
      websocket.addEventListener('message', (event) => {
        eventEmitter.emit(topic, event.data);
      });

      websocketRef.current = websocket;
    };

    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.removeEventListener('open', handleOpen);
        websocketRef.current.close();
      }
    };
  }, [connectionURL, handleOpen, topic, user]);

  return { isLoading, sendMessage };
};

const useGameStatus = () => {
  const [gameStatusData, setGameStatusData] = useState<GameStatusData | null>(
    null
  );

  const [gameStatus, setGameStatus] = useState<
    null | 'waiting' | 'ongoing' | 'final'
  >(null);

  const updatedGameStatus = (gameStatusData: GameStatusData) => {
    const startedAtTime = new Date(gameStatusData.started_at).getTime();
    const now = new Date().getTime();

    if (now < startedAtTime) {
      setGameStatus('waiting');
      return;
    }

    if (gameStatusData.ended_at !== null) {
      const endedAtTime = new Date(gameStatusData.ended_at).getTime();

      if (now > endedAtTime) {
        setGameStatus('final');
        return;
      }
    }

    setGameStatus('ongoing');
  };

  useEffect(() => {
    if (gameStatusData === null) return;

    const interval = setInterval(() => {
      updatedGameStatus(gameStatusData);
    }, 500);

    return () => {
      clearInterval(interval);
    };
  }, [gameStatusData]);

  const getGameStatus = useCallback(async () => {
    try {
      const response = await axios.get('/game-status');

      // const { data } = await supabase.from('game_status').select('*');

      // todo: sentry error handling
      if (!response) return;

      setGameStatusData(response.data);
    } catch (error) {
      console.log(error);
      // const oneSecond = new Promise<void>((resolve) => {
      //   setTimeout(() => {
      //     resolve();
      //   }, 1000);
      // });
      // await oneSecond;
      // return fetchGameStatusData();
    }
  }, []);

  useEffect(() => {
    getGameStatus();
  }, [getGameStatus]);

  return gameStatus;
};

function Rank() {
  const [rank, setRank] = useState<number | null>(null);

  const updateRank = useCallback(async () => {
    try {
      const response = await authAxios.get(
        `${config.backendApiHost}/users/me/rank`
      );
      if (!response.data.success) {
        throw new Error('Failed to get rank');
      }

      setRank(response.data.data.rank);
    } catch {
      // we will call this again in 15 seconds so if it fails we don't need to do anything
    }
  }, []);

  useEffect(() => {
    updateRank();

    const interval = setInterval(() => {
      updateRank();
    }, 15 * 1000);

    return clearInterval(interval);
  }, [updateRank]);

  if (rank === null) {
    return <p className='text-white'>Rank:</p>;
  }

  return <p className='text-white'>Rank: {rank}</p>;
}

function ChevronUp() {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M11.2929 8.29289C11.6834 7.90237 12.3166 7.90237 12.7071 8.29289L18.7071 14.2929C19.0976 14.6834 19.0976 15.3166 18.7071 15.7071C18.3166 16.0976 17.6834 16.0976 17.2929 15.7071L12 10.4142L6.70711 15.7071C6.31658 16.0976 5.68342 16.0976 5.29289 15.7071C4.90237 15.3166 4.90237 14.6834 5.29289 14.2929L11.2929 8.29289Z'
        className='fill-gray-50'
      />
    </svg>
  );
}

function Home() {
  const { sendMessage } = useWebsocket(
    `${config.backendWebsocketHost}/score`,
    'score'
  );
  const gameStatus = useGameStatus();
  const [currentNumberInput, setCurrentNumberInput] = useState<string>('');
  const [number, setNumber] = useState<number | null>(0);
  const [isVerificationRequired, setIsVerificationRequired] = useState(true);
  const subscribe = useSubscribe();
  const user = useUser();

  useEffect(() => {
    const unsubscribe = subscribe('score', (data) => {
      const parsedData = JSON.parse(data);

      switch (parsedData.type) {
        case 'update-count': {
          setNumber(parsedData.value);
          break;
        }
        case 'verification-required': {
          setIsVerificationRequired(true);
          break;
        }
        case 'verified': {
          setIsVerificationRequired(false);
          break;
        }
      }
    });

    return unsubscribe;
  }, [subscribe, setIsVerificationRequired]);

  if (!gameStatus) {
    return (
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Spinner />
      </div>
    );
  }

  const handleSubmit = () => {
    // todo: handle non-numeric input with a toast error
    const numberValue = Number(currentNumberInput);
    console.log('submit', numberValue);

    sendMessage(
      JSON.stringify({
        type: 'update-count',
        value: numberValue,
      })
    );

    setCurrentNumberInput('');
  };

  const handleSuccess = (token: string) => {
    sendMessage(JSON.stringify({ type: 'verify', token }));
  };

  const handleKeyDown: React.HTMLAttributes<HTMLInputElement>['onKeyDown'] = (
    event
  ) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  if (number === null) return;

  return (
    <>
      <div className='top-20 right-4 fixed flex flex-col gap-4'></div>
      <div className='h-screen flex flex-col justify-between px-5 py-4'>
        <div className='flex flex-col gap-2'>
          <div className='flex justify-between'>
            <div className='flex flex-col text-white'>
              <a href='/leaderboard' className='font-bold'>
                Leaderboard
              </a>
              <p>Anonymous Turkey</p>
            </div>
            <div className='flex flex-col text-right text-white'>
              <p className='font-bold'>123</p>
              <Rank />
            </div>
          </div>
          <div className='flex justify-between items-center'>
            <p>
              {user.email ? (
                <a className='text-white' href='/logout'>
                  Logout
                </a>
              ) : (
                <a className='text-white' href='/auth/google'>
                  Save your progress
                </a>
              )}
            </p>
            <p className='text-white'>Buy me a coffee</p>
          </div>
        </div>

        <h2 className='fixed top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 text-white text-[64px] text-center'>
          {number.toLocaleString()}
        </h2>
        <div className='flex flex-col gap-3'>
          {isVerificationRequired ? (
            <Turnstile
              siteKey={config.turnstileSiteKey}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className='relative max-w-screen-md self-stretch'>
              <input
                type='text'
                placeholder='Write next number'
                value={currentNumberInput}
                onChange={(event) => setCurrentNumberInput(event.target.value)}
                className='placeholder:text-gray-200 rounded-2xl h-[60px] outline-none bg-secondary px-5 w-full border text-white border-tertiary'
                onKeyDown={handleKeyDown}
              />
              <button
                className='text-white bg-primary flex items-center justify-center bottom-3 top-3 absolute right-3 w-9 h-9 rounded-lg'
                onClick={handleSubmit}
                aria-label='Submit'
              >
                <ChevronUp />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { Home };
