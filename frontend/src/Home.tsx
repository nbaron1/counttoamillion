import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import './dialog.css';
import './hide-scrollbar.css';
import { Turnstile } from '@marsidev/react-turnstile';
import { config } from './lib/config';
import { authAxios } from './lib/axios';
import axios from 'axios';
import { useUser } from './context/User';
import { updateColors } from './utils/updateColors';
import * as Popover from '@radix-ui/react-popover';
import * as Dialog from '@radix-ui/react-dialog';
import { twMerge } from 'tailwind-merge';
import toast from 'react-hot-toast';

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

  const { user } = useUser();

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
        if (event.code === 1008) {
          window.location.href = '/auth/guest';
        }

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

const useVerifyGameIsOngoing = () => {
  const [gameStatusData, setGameStatusData] = useState<GameStatusData | null>(
    null
  );

  const [isGameOngoing, setIsGameOngoing] = useState<null | boolean>(null);

  const updatedGameStatus = (gameStatusData: GameStatusData) => {
    const startedAtTime = new Date(gameStatusData.started_at).getTime();
    const now = new Date().getTime();

    if (now < startedAtTime) {
      return;
    }

    if (gameStatusData.ended_at !== null) {
      const endedAtTime = new Date(gameStatusData.ended_at).getTime();

      if (now > endedAtTime) {
        setIsGameOngoing(false);
        window.location.pathname = '/game-over';
        return;
      }
    }

    setIsGameOngoing(true);
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

  return isGameOngoing;
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

function DesktopUsername() {
  const { user, revalidate } = useUser();

  const [isOpen, setIsOpen] = useState(false);
  const [currentUsername, setCurrentUsername] = useState(user.username);

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setCurrentUsername(user.username);
    }

    setIsOpen(open);
  };

  const handleSaveUsername = async () => {
    try {
      toast.loading('Saving username...', { id: 'save-username' });

      await authAxios.put('/users/me/username', {
        username: currentUsername,
      });

      toast.success('Username saved', { id: 'save-username' });

      setIsOpen(false);
      revalidate();
    } catch {
      toast.error('Failed to update username', { id: 'save-username' });
    }
  };

  useEffect(() => {
    setCurrentUsername(user.username);
  }, [user]);

  return (
    <Popover.Root onOpenChange={handleOpenChange} open={isOpen}>
      <Popover.Trigger>{user.username}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side='bottom'
          align='start'
          sideOffset={4}
          className='fade-in-contents max-w-[90vw] border border-tertiary w-[320px] rounded-2xl gap-1 bg-secondary flex flex-col text-whites p-3'
        >
          <input
            value={currentUsername}
            onChange={(event) => setCurrentUsername(event.target.value)}
            placeholder="What's the username"
            className='py-2 px-4 outline-none bg-transparent rounded-xl border border-tertiary text-white'
          />
          <button
            onClick={handleSaveUsername}
            className='bg-primary text-white max-w-80 h-[44px] rounded-xl border-secondary '
          >
            Save username
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function CloseIcon() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 20 20'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        fillRule='evenodd'
        clipRule='evenodd'
        d='M4.41009 4.41009C4.73553 4.08466 5.26317 4.08466 5.5886 4.41009L9.99935 8.82084L14.4101 4.41009C14.7355 4.08466 15.2632 4.08466 15.5886 4.41009C15.914 4.73553 15.914 5.26317 15.5886 5.5886L11.1779 9.99935L15.5886 14.4101C15.914 14.7355 15.914 15.2632 15.5886 15.5886C15.2632 15.914 14.7355 15.914 14.4101 15.5886L9.99935 11.1779L5.5886 15.5886C5.26317 15.914 4.73553 15.914 4.41009 15.5886C4.08466 15.2632 4.08466 14.7355 4.41009 14.4101L8.82084 9.99935L4.41009 5.5886C4.08466 5.26317 4.08466 4.73553 4.41009 4.41009Z'
        fill='white'
      />
    </svg>
  );
}

const USERS_PER_PAGE = 25;

type User = {
  created_at: string;
  current_attempt_id: number;
  email: string | null;
  high_score: number;
  id: string;
  position: string;
  rank: string;
  score: number;
  username: string;
  user_id: string;
};

const LeadboardDialogContent = forwardRef<
  HTMLDivElement,
  { users: User[] | null; numberOfPages: number | null; page: number | null }
>(({ numberOfPages, page, users }, ref) => {
  const { user } = useUser();

  if (!users || !numberOfPages || !page) return <Spinner />;

  return (
    <div className='flex flex-col gap-2 overflow-y-scroll' ref={ref}>
      {users.map(({ score, rank, username, user_id }) => {
        return (
          <div
            id={`user-${user_id}`}
            key={user_id}
            className='flex justify-between items-center'
          >
            <p>
              {rank}.{' '}
              <span className={user.id === user_id ? 'underline' : ''}>
                {username}
              </span>
            </p>
            <p>{score}</p>
          </div>
        );
      })}
    </div>
  );
});

function Leaderboard() {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const [numberOfPages, setNumberOfPages] = useState<null | number>(null);
  const [users, setUsers] = useState<null | User[]>(null);
  const [page, setPage] = useState<number | null>(null);

  const [isSkippingToYourRanking, setIsSkippingToYourRanking] = useState(false);

  const getUserCount = useCallback(async () => {
    try {
      const response = await authAxios.get('/users/count');
      const count = response.data.data.count;
      console.log({ count });

      return count;
    } catch (error) {
      console.error(error);
      return await getUserCount();
    }
  }, []);

  const getUserRank = useCallback(async () => {
    try {
      const response = await authAxios.get('/users/me/rank');
      return response.data.data.rank;
    } catch (error) {
      console.error(error);

      return await getUserRank();
    }
  }, []);

  const getUserPosition = useCallback(async () => {
    try {
      const response = await authAxios.get('/users/me/rank');
      return response.data.data.position;
    } catch (error) {
      console.error(error);

      return await getUserRank();
    }
  }, [getUserRank]);

  const getUsers = useCallback(async (page: number) => {
    try {
      const response = await authAxios.get(
        `/users?page=${page}&limit=${USERS_PER_PAGE}`
      );

      return response.data.data.users;
    } catch {
      return await getUsers(page);
    }
  }, []);

  useEffect(() => {
    if (!page) return;

    getUsers(page).then((data) => {
      setUsers(data);
    });
  }, [getUsers, page]);

  useEffect(() => {
    try {
      if (!isOpen) return;

      getUserCount().then((count) => {
        const pages = Math.ceil(count / USERS_PER_PAGE);
        setNumberOfPages(pages);
      });

      getUserRank().then((rank) => {
        const page = Math.ceil(rank / USERS_PER_PAGE);
        setPage(page);

        getUsers(page).then((data) => {
          setUsers(data);
        });
      });
    } catch (error) {
      console.log(error);
    }
  }, [isOpen, getUserCount, getUserRank, getUsers]);

  useEffect(() => {
    if (!isSkippingToYourRanking) return;

    // todo: find a better way to scroll to the user instead of using setTimeout
    setTimeout(() => {
      const userElement = document.getElementById(`user-${user.id}`);
      if (!userElement) return;

      userElement.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [isSkippingToYourRanking, user.id]);

  const handleGoToYourRanking = async () => {
    const position = await getUserPosition();

    const page = Math.ceil(position / USERS_PER_PAGE);
    setPage(page);
    setIsSkippingToYourRanking(true);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Trigger className='text-left '>Leaderboard</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Content className='shadow-sm md:w-[500px] flex flex-col border gap-4 justify-between md:max-w-[800px] px-6 py-6 md:left-1/2 h-[75vh] md:-translate-x-1/2 md:right-auto fade-in-content top-1/2 left-3 right-3 -translate-y-1/2 fixed z-10 bg-secondary rounded-xl text-white border-tertiary'>
          <div className='flex flex-col gap-4 min-h-0'>
            <div className='flex justify-between items-center'>
              <div>
                <Dialog.Title className='text-lg'>Leaderboard</Dialog.Title>
                <button className='underline' onClick={handleGoToYourRanking}>
                  Skip to your ranking
                </button>
              </div>
              <Dialog.Close>
                <CloseIcon />
              </Dialog.Close>
            </div>
            <LeadboardDialogContent
              numberOfPages={numberOfPages}
              page={page}
              users={users}
            />
          </div>
          {numberOfPages && (
            <div className='flex items-center px-4 justify-center '>
              {Array.from({ length: numberOfPages }).map((_, index) => {
                return (
                  <button
                    onClick={() => setPage(index + 1)}
                    className={twMerge([
                      'w-6 h-6 bg-secondary flex items-center justify-center',
                      index + 1 === page && 'underline',
                    ])}
                    key={index}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Home() {
  const { sendMessage } = useWebsocket(
    `${config.backendWebsocketHost}/score`,
    'score'
  );

  const isGameOngoing = useVerifyGameIsOngoing();
  const [currentNumberInput, setCurrentNumberInput] = useState<string>('');
  const [number, setNumber] = useState<number | null>(0);
  const [isVerificationRequired, setIsVerificationRequired] = useState(true);
  const subscribe = useSubscribe();
  const { user } = useUser();

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

  if (!isGameOngoing) {
    return (
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Spinner />
      </div>
    );
  }

  const handleSubmit = () => {
    // todo: handle non-numeric input with a toast error
    const numberValue = Number(currentNumberInput);

    sendMessage(
      JSON.stringify({
        type: 'update-count',
        value: numberValue,
      })
    );

    setCurrentNumberInput('');
    updateColors();
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
      <div className='h-screen flex flex-col overflow-x-clip justify-between px-5 py-4'>
        <div className='flex flex-col gap-2'>
          <div className='flex justify-between'>
            <div className='flex flex-col gap-[2px] text-white'>
              <Leaderboard />
              <div className=''>
                <DesktopUsername />
              </div>
            </div>
            <div className='flex flex-col gap-[2px] text-right text-white'>
              {user.email ? (
                <a href='/logout'>Logout</a>
              ) : (
                <a href='/auth/google'>Save progress</a>
              )}
              <Rank />
            </div>
          </div>
        </div>
        <div className='flex flex-col'>
          <div className='fixed top-1/2 -translate-y-3/4 right-3 left-3 text-white text-center'>
            <h2 className='text-[64px]'>{number.toLocaleString()}</h2>
            <p className='fade-in left-2 text-gray-white text-center'>
              The first person to count to a million in a row will beat this
              website
            </p>
          </div>
        </div>

        <div className='fixed bottom-3 left-3 right-3 md:left-1/2 md:bottom-6 md:-translate-x-1/2 md:w-[350px] md:right-auto'>
          {isVerificationRequired ? (
            <Turnstile
              siteKey={config.turnstileSiteKey}
              onSuccess={handleSuccess}
              options={{ size: 'flexible' }}
            />
          ) : (
            <div className='relative'>
              <input
                type='text'
                placeholder='Write next number'
                value={currentNumberInput}
                onChange={(event) => setCurrentNumberInput(event.target.value)}
                className='fade-in placeholder:text-gray-200 rounded-2xl h-[60px] outline-none bg-secondary px-5 w-full border text-white border-tertiary'
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
