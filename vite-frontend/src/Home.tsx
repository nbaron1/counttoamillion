import { useCallback, useEffect, useRef, useState } from 'react';
import './dialog.css';
import './hide-scrollbar.css';
import { Turnstile } from '@marsidev/react-turnstile';
import { supabase } from './lib/supabase';
import { config } from './lib/config';
import { useUser } from './context/Auth';
import { usePage } from './context/Page';
import { useAxios } from './lib/axios';

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

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        return;
      }

      if (!data.session) return;
      if (websocketRef.current) return;

      const accessToken = data.session.access_token;
      const url = `${connectionURL}?token=${accessToken}`;

      const websocket = new WebSocket(url);

      websocket.addEventListener('open', handleOpen);
      websocket.addEventListener('close', (event) => {
        console.log(event);
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
  }, [connectionURL, handleOpen, user]);

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
      const { data } = await supabase.from('game_status').select('*');

      // todo: sentry error handling
      if (!data) return;

      setGameStatusData(data[0]);
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
  const axios = useAxios();

  const updateRank = useCallback(async () => {
    try {
      const response = await axios.get(
        `${config.backendApiHost}/users/me/rank`
      );

      setRank(response.data.rank);
    } catch (error) {}
  }, [axios]);

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

function Chat() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<
    | {
        created_at: string;
        id: number;
        message: string;
        user_id: string;
        username: string;
      }[]
    | null
  >(null);

  const { isLoading, sendMessage } = useWebsocket(
    `${config.backendWebsocketHost}/chat`,
    'chat'
  );

  const user = useUser();

  const handleSendMessage = () => {
    if (messages === null) return;

    // the user shouldn't know if their message was sent or not
    // todo: get the username persisted (create useUser hook)
    const optimisticMessage = {
      message,
      user_id: user.id,
      username: user.user_metadata.username,
      created_at: new Date().toISOString(),
      id: Math.random() * 1000,
    };

    setMessages([...messages, optimisticMessage]);

    sendMessage(message);
  };

  const getMessage = useCallback(async () => {
    const { data } = await supabase
      .from('message')
      .select('*, app_user(username)')
      .order('created_at', { ascending: true })
      .limit(10);

    if (data === null) {
      return null;
    }

    const formattedData = data.map((message) => ({
      ...message,
      username: (message.app_user as { username: string }).username,
    }));

    setMessages(formattedData);
  }, []);

  useEffect(() => {
    getMessage();
  }, []);

  const subscribe = useSubscribe();

  useEffect(() => {
    const unsubscribe = subscribe('chat', (data) => {
      if (messages === null) return;

      const message = JSON.parse(data);
      setMessages([...messages, message]);
    });

    return unsubscribe;
  }, [messages]);

  if (isLoading || !messages) {
    return <p>Loading...</p>;
  }

  return (
    <div className='flex flex-col'>
      <p>Chat</p>
      {messages.map(({ message, username, id }) => (
        <div key={id}>
          <p className='text-white'>{message}</p>
          <p className='text-white'>{username}</p>
        </div>
      ))}
      <div className='flex flex-col gap-2'>
        <input
          type='text'
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className='w-72 text-black'
        />
        <button
          className='py-3 px-3 bg-white text-black w-20 rounded-md'
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function Home() {
  const { sendMessage } = useWebsocket(
    `${config.backendWebsocketHost}/score`,
    'score'
  );
  const { setPage } = usePage();
  const gameStatus = useGameStatus();
  const [nextNumber, setNextNumber] = useState<number>(0);
  const [number, setNumber] = useState<number | null>(0);
  const [email, setEmail] = useState('');
  const [isVerificationRequired, setIsVerificationRequired] = useState(true);
  const subscribe = useSubscribe();

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
    sendMessage(JSON.stringify({ type: 'update-count', value: nextNumber }));
  };

  const handleSuccess = (token: string) => {
    sendMessage(JSON.stringify({ type: 'verify', token }));
  };

  const handleLoginWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLoginWithEmail = async () => {
    await supabase.auth.signInWithOtp({ email });
  };

  if (number === null) return;

  return (
    <>
      <Rank />
      <button className='text-white' onClick={() => setPage('leaderboard')}>
        Leaderboard
      </button>
      <Chat />
      <div className='top-4 right-4 fixed flex flex-col gap-4'>
        {isVerificationRequired && (
          <Turnstile
            // todo: handle
            // onError={() => setStatus('error')}
            // onExpire={() => setStatus('expired')}
            siteKey={config.turnstileSiteKey}
            onSuccess={handleSuccess}
          />
        )}
        <button onClick={handleLoginWithGoogle} className='text-white'>
          sign in google
        </button>
        <div className='flex flex-col gap-2'>
          <input
            name='email'
            type='email'
            className='text-black'
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button className='text-white' onClick={handleLoginWithEmail}>
            send magic link
          </button>
        </div>
      </div>
      <div className='text-black flex flex-col fixed left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2'>
        <p className='text-white'>{number}</p>
        <input
          type='number'
          placeholder='Write next number'
          value={String(nextNumber)}
          onChange={(event) => {
            setNextNumber(Number(event.target.value));
          }}
        />
        <button className='text-white' onClick={handleSubmit}>
          Submit
        </button>
      </div>
    </>
  );
}

export { Home };
