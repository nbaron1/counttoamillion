import * as Dialog from '@radix-ui/react-dialog';
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

const WEBSOCKET_HOST = import.meta.env.VITE_BACKEND_WEBSOCKET_HOST;

if (!WEBSOCKET_HOST) {
  throw new Error('VITE_BACKEND_WEBSOCKET_HOST not found');
}

export function Spinner() {
  return (
    <div className='animate-spin w-11 h-11 border-4 border-solid border-white border-b-transparent rounded-[50%]'></div>
  );
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
    return <p className='text-white'>Rank loading</p>;
  }

  return <p className='text-white'>Rank: {rank}</p>;
}

function ChatIcon() {
  return (
    <svg
      width='24'
      height='24'
      viewBox='0 0 24 24'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
    >
      <path
        d='M6.09436 11.2288C6.03221 10.8282 5.99996 10.4179 5.99996 10C5.99996 5.58172 9.60525 2 14.0526 2C18.4999 2 22.1052 5.58172 22.1052 10C22.1052 10.9981 21.9213 11.9535 21.5852 12.8345C21.5154 13.0175 21.4804 13.109 21.4646 13.1804C21.4489 13.2512 21.4428 13.301 21.4411 13.3735C21.4394 13.4466 21.4493 13.5272 21.4692 13.6883L21.8717 16.9585C21.9153 17.3125 21.9371 17.4895 21.8782 17.6182C21.8266 17.731 21.735 17.8205 21.6211 17.8695C21.4911 17.9254 21.3146 17.8995 20.9617 17.8478L17.7765 17.3809C17.6101 17.3565 17.527 17.3443 17.4512 17.3448C17.3763 17.3452 17.3245 17.3507 17.2511 17.3661C17.177 17.3817 17.0823 17.4172 16.893 17.4881C16.0097 17.819 15.0524 18 14.0526 18C13.6344 18 13.2237 17.9683 12.8227 17.9073M7.63158 22C10.5965 22 13 19.5376 13 16.5C13 13.4624 10.5965 11 7.63158 11C4.66668 11 2.26316 13.4624 2.26316 16.5C2.26316 17.1106 2.36028 17.6979 2.53955 18.2467C2.61533 18.4787 2.65322 18.5947 2.66566 18.6739C2.67864 18.7567 2.68091 18.8031 2.67608 18.8867C2.67145 18.9668 2.65141 19.0573 2.61134 19.2383L2 22L4.9948 21.591C5.15827 21.5687 5.24 21.5575 5.31137 21.558C5.38652 21.5585 5.42641 21.5626 5.50011 21.5773C5.5701 21.5912 5.67416 21.6279 5.88227 21.7014C6.43059 21.8949 7.01911 22 7.63158 22Z'
        stroke='#FAFAF9'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

const ChatDialogContent = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <Dialog.Content
      ref={ref}
      className='bg-secondary rounded-2xl fixed top-4 left-4 right-4 bottom-4 z-10'
    >
      dadada
    </Dialog.Content>
  );
});

function MobileChat() {
  // const [message, setMessage] = useState('');
  // const [messages, setMessages] = useState<
  //   | {
  //       created_at: string;
  //       id: number;
  //       message: string;
  //       user_id: string;
  //       username: string;
  //     }[]
  //   | null
  // >(null);
  // const user = useUser();

  // const { isLoading, sendMessage } = useWebsocket(
  //   `${config.backendWebsocketHost}/chat`,
  //   'chat'
  // );

  // const handleSendMessage = () => {
  //   if (messages === null) return;

  //   // the user shouldn't know if their message was sent or not
  //   // todo: get the username persisted (create useUser hook)
  //   const optimisticMessage = {
  //     message,
  //     user_id: user.id,
  //     username: user.username,
  //     created_at: new Date().toISOString(),
  //     id: Math.random() * 1000,
  //   };

  //   setMessages([...messages, optimisticMessage]);

  //   sendMessage(message);
  // };

  // const getMessage = useCallback(async () => {
  //   try {
  //     const response = await axios.get('/messages');

  //     if (!response.data.success) {
  //       throw new Error('Failed to get messages');
  //     }

  //     return response.data.data;
  //   } catch {
  //     const oneSecond = new Promise((resolve) => setTimeout(resolve, 1000));

  //     await oneSecond;

  //     return await getMessage();
  //   }
  // }, []);

  // useEffect(() => {
  //   // todo: enable
  //   // getMessage().then((data) => {
  //   //   const formattedData = data.map((message) => ({
  //   //     ...message,
  //   //     username: (message.app_user as { username: string }).username,
  //   //   }));
  //   //   setMessages(formattedData);
  //   // });
  // }, [getMessage]);

  // const subscribe = useSubscribe();

  // useEffect(() => {
  //   const unsubscribe = subscribe('chat', (data) => {
  //     if (messages === null) return;

  //     const message = JSON.parse(data);
  //     setMessages([...messages, message]);
  //   });

  //   return unsubscribe;
  // }, [messages, subscribe]);

  // console.log(isLoading, messages);

  // if (isLoading || !messages) {
  //   return null;
  // }

  return (
    <Dialog.Root>
      <Dialog.Portal>
        <ChatDialogContent />
      </Dialog.Portal>
      <Dialog.Trigger
        id='chat'
        className='rounded-full self-end w-14 h-14 flex border border-tertiary items-center justify-center bg-secondary'
      >
        <ChatIcon />
      </Dialog.Trigger>
    </Dialog.Root>
  );

  // return (
  //   <div className='flex flex-col'>
  //     <p>Chat</p>
  //     {messages.map(({ message, username, id }) => (
  //       <div key={id}>
  //         <p className='text-white'>{message}</p>
  //         <p className='text-white'>{username}</p>
  //       </div>
  //     ))}
  //     <div className='flex flex-col gap-2'>
  //       <input
  //         type='text'
  //         value={message}
  //         onChange={(event) => setMessage(event.target.value)}
  //         className='w-72 text-black'
  //       />
  //       <button
  //         className='py-3 px-3 bg-white text-black w-20 rounded-md'
  //         onClick={handleSendMessage}
  //       >
  //         Send
  //       </button>
  //     </div>
  //   </div>
  // );
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
  console.log({ user });
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

  console.log({ user });

  if (number === null) return;

  return (
    <>
      {/* <Rank />
      <button className='text-white' onClick={() => redirect('/leaderboard')}>
        Leaderboard
      </button>
      <Chat /> */}
      <div className='top-20 right-4 fixed flex flex-col gap-4'>
        {isVerificationRequired && (
          <Turnstile
            siteKey={config.turnstileSiteKey}
            onSuccess={handleSuccess}
          />
        )}
      </div>
      <div className='h-screen flex flex-col justify-between px-5 py-4'>
        <div className='flex flex-col gap-3'>
          <div className='flex justify-between items-center'>
            <a className='text-white' href='/content'>
              My content
            </a>
            {user.email ? (
              <button className='text-white' type='button'>
                Logout
              </button>
            ) : (
              <a className='underline text-white' href='/auth/google'>
                Save your progress
              </a>
            )}
          </div>
          <div className='flex justify-between'>
            <div className='flex flex-col text-white'>
              <p className='font-bold'>Leaderboard</p>
              <p>Anonymous Turkey</p>
            </div>
            <div className='flex flex-col text-right text-white'>
              <p className='font-bold'>123</p>
              <p>Rank #23</p>
            </div>
          </div>
        </div>
        <h2 className='text-white text-8xl text-center'>{number}</h2>
        <div className='flex flex-col gap-3'>
          <MobileChat />
          <div className='relative'>
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
        </div>
      </div>
    </>
  );
}

export { Home };
