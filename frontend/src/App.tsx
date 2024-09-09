import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AnimationScope, motion, useAnimate } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as RadioGroup from '@radix-ui/react-radio-group';
import './dialog.css';
import './hide-scrollbar.css';

function NumberElement({
  number,
  isHighestNumber,
}: {
  number: number;
  isHighestNumber: boolean;
}) {
  const className = isHighestNumber
    ? 'text-gray-50 min-w-16 text-center number-element'
    : 'text-gray-500 min-w-16 text-center number-element';

  return (
    <motion.p
      initial={{ opacity: 0, y: -35 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      {number}
    </motion.p>
  );
}

function FailedNumberElement({ number }: { number: number }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -35, color: '#fafaf9' }}
      animate={{ opacity: 1, y: 0, color: '#FF4141' }}
      className='min-w-16 text-center number-element'
    >
      {number}
    </motion.p>
  );
}

const WEBSOCKET_HOST = import.meta.env.VITE_BACKEND_WEBSOCKET_HOST;

if (!WEBSOCKET_HOST) {
  throw new Error('VITE_BACKEND_HOST not found');
}

const BACKEND_HOST = import.meta.env.VITE_BACKEND_HOST;

if (!BACKEND_HOST) {
  throw new Error('VITE_BACKEND_HOST not found');
}

const useAttempts = ({
  filter,
  page,
}: {
  filter: AttemptFilter;
  page: number;
}) => {
  const [data, setData] = useState<
    { id: number; created_at: string; max_count: number }[]
  >([]);
  const [hasNextPage, setHasNextPage] = useState(false);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const response = await fetch(
          `${BACKEND_HOST}/v1/attempts?filter=${filter}&page=${page}`
        );
        const { data, hasNextPage } = await response.json();

        console.log({ hasNextPage });

        setData(data);
        setHasNextPage(hasNextPage);
      } catch (error) {
        // todo: auto retry after 1 second
        console.error('Error fetching attempts', error);
      }
    };

    fetchAttempts();
  }, [filter, page]);

  return { data, hasNextPage };
};

type Attempt = { max_count: number; id: number; created_at: string };

function getTimeSince(utcTimestamp: string): string {
  // Parse the UTC timestamp
  const pastDate = new Date(utcTimestamp);
  const now = new Date();
  const nowInUTC = new Date(now.getTime() + now.getTimezoneOffset() * 60000);

  // Calculate the difference in milliseconds
  const diffMs = nowInUTC.getTime() - pastDate.getTime();

  // Convert milliseconds to different units
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Return a human-readable string
  if (diffDays > 0) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  } else {
    return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
  }
}

function PreviousAttempt({ attempt }: { attempt: Attempt }) {
  const timeSince = getTimeSince(attempt.created_at);

  return (
    <div className='flex flex-col'>
      <p className='text-gray-50 text-lg sm:text-xl'>{attempt.max_count}</p>
      <p className='text-gray-400 text-lg'>{timeSince}</p>
    </div>
  );
}

function PreviousAttemptDialogPage({
  filter,
  page,
  isLastPage,
  onLoadMore,
}: {
  filter: AttemptFilter;
  page: number;
  isLastPage: boolean;
  onLoadMore: () => void;
}) {
  const { data, hasNextPage } = useAttempts({ page, filter });

  return (
    <div className='flex flex-col gap-4'>
      {data.map((attempt) => (
        <PreviousAttempt attempt={attempt} key={attempt.id} />
      ))}

      {isLastPage && hasNextPage && (
        <button
          className='bg-gray-800 py-2 text-gray-50 border border-gray-700 rounded'
          type='button'
          onClick={onLoadMore}
        >
          Load more
        </button>
      )}
    </div>
  );
}

function PreviousAttemptDialogContent({ type }: { type: AttemptFilter }) {
  const [pages, setPages] = useState(1);

  return (
    <>
      <div className='flex flex-col max-h-72 overflow-y-scroll gap-4'>
        {Array.from({ length: pages }).map((_, i) => (
          <PreviousAttemptDialogPage
            key={i}
            filter={type}
            page={i + 1}
            onLoadMore={() => setPages(pages + 1)}
            isLastPage={i + 1 === pages}
          />
        ))}
      </div>
      <div id='load-more'></div>
    </>
  );
}

type AttemptFilter = 'latest' | 'top';

function PreviousAttemptsDialog() {
  const [type, setType] = useState<AttemptFilter>('latest');

  const handleValueChange = (value: string) => {
    if (value !== 'latest' && value !== 'top') {
      return;
    }

    setType(value);
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger className='text-lg text-gray-400'>
        Previous attempts
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed top-0 left-0 right-0 bottom-0 bg-black opacity-50' />
        <Dialog.Content className='DialogContent flex gap-8 sm:w-[450px] flex-col px-5 py-6 max-w-[90vw] rounded-2xl w-80 bg-gray-900 border border-gray-800 z-30 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
          <div className='flex flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <Dialog.Title className='text-gray-50 text-2xl'>
                Attempts
              </Dialog.Title>
              <Dialog.Close>
                <CloseIcon />
              </Dialog.Close>
            </div>
            <RadioGroup.Root
              value={type}
              onValueChange={handleValueChange}
              className='bg-gray-900 border border-gray-800 rounded-lg px-2 flex py-[6px]'
            >
              <RadioGroup.Item
                className='py-1 text-center flex-1 text-gray-50 data-[state=checked]:bg-gray-800 rounded'
                value='latest'
              >
                Latest
              </RadioGroup.Item>
              <RadioGroup.Item
                className='text-center flex-1 text-gray-50 data-[state=checked]:bg-gray-800 rounded py-1'
                value='top'
              >
                Highest
              </RadioGroup.Item>
            </RadioGroup.Root>
          </div>
          <div style={{ display: type === 'latest' ? 'block' : 'none' }}>
            <PreviousAttemptDialogContent type='latest' />
          </div>
          <div style={{ display: type === 'top' ? 'block' : 'none' }}>
            <PreviousAttemptDialogContent type='top' />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CloseIcon() {
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
        d='M5.29289 5.29289C5.68342 4.90237 6.31658 4.90237 6.70711 5.29289L12 10.5858L17.2929 5.29289C17.6834 4.90237 18.3166 4.90237 18.7071 5.29289C19.0976 5.68342 19.0976 6.31658 18.7071 6.70711L13.4142 12L18.7071 17.2929C19.0976 17.6834 19.0976 18.3166 18.7071 18.7071C18.3166 19.0976 17.6834 19.0976 17.2929 18.7071L12 13.4142L6.70711 18.7071C6.31658 19.0976 5.68342 19.0976 5.29289 18.7071C4.90237 18.3166 4.90237 17.6834 5.29289 17.2929L10.5858 12L5.29289 6.70711C4.90237 6.31658 4.90237 5.68342 5.29289 5.29289Z'
        fill='#A8A29E'
      />
    </svg>
  );
}

function Game({
  failedNumber,
  highscore,
  userCount,
  elements,
  onSubmit,
  scope,
  keyValue,
}: {
  failedNumber: null | number;
  highscore: number;
  userCount: number;
  elements: Set<number>;
  onSubmit: (value: number) => void;
  scope: AnimationScope;
  keyValue: number;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const highestNumber = useMemo(() => Math.max(...elements), [elements]);
  const [inputValue, setInputValue] = useState('');

  const elementsSorted = Array.from(elements).sort((a, b) => a - b);

  const handleSubmit = () => {
    const inputNumberValue = Number.parseInt(inputValue, 10);

    // TODO: Error handling
    if (Number.isNaN(inputNumberValue)) {
      console.error('Input is not a number', { input: inputValue });
      return;
    }

    const isAnInteger = Number.isInteger(inputNumberValue);

    // TODO: Error handling
    if (!isAnInteger) {
      console.error('Input is not an integer', { input: inputValue });
      return;
    }

    onSubmit(inputNumberValue);
    setInputValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div ref={scope}>
      <a
        href='https://buymeacoffee.com/noahbaron'
        className='text-gray-500 underline fixed top-5 right-5 sm:bottom-5 sm:top-auto'
        target='_blank'
        rel='noreferrer'
      >
        buy me a coffee
      </a>
      <a
        target='_blank'
        className='hidden text-gray-500 underline sm:block fixed bottom-5 left-5'
        href='https://nbaron.com/'
      >
        built by nbaron
      </a>
      <div className='fixed sm:right-6 top-5 sm:justify-between left-5 text-lg text-gray-50 flex'>
        <div className='flex flex-col sm:flex-row sm:gap-5 lg:gap-7'>
          <p>High score: {highscore}</p>
          <PreviousAttemptsDialog />
        </div>
        <div className='hidden sm:flex items-center gap-3'>
          <div className='bg-[#ACFF58] animate-pulse rounded-full w-3 h-3' />
          <p className='text-gray-50'>
            {userCount} <span className='text-gray-400'>users online</span>
          </p>
        </div>
      </div>
      <div className='flex items-center gap-5'>
        {/* <Turnstile
          id='turnstile-1'
          options={{ size: 'normal', theme: 'light' }}
          ref={refTurnstile}
          className='rounded-md'
          siteKey='0x4AAAAAAALvq89KRwrAjqSU'
          onSuccess={() => console.log('success')}
        /> */}

        {/* TODO: fix centering */}
        <div
          className='fixed top-1/2 -translate-y-1/2 right-1/2 gap-8 text-[64px] flex'
          key={keyValue}
        >
          {[...elementsSorted].map((number) => (
            <NumberElement
              key={number}
              number={number}
              isHighestNumber={highestNumber === number}
            />
          ))}
          {typeof failedNumber === 'number' && (
            <FailedNumberElement number={failedNumber} />
          )}
        </div>
        <div className='fixed bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-3'>
          <div className='sm:hidden flex items-center gap-2'>
            <div className='bg-[#ACFF58] animate-pulse rounded-full w-3 h-3' />
            <p className='text-gray-50'>100 users online</p>
          </div>
          <div className='border max-w-[95vw] min-[425px]:w-80 min-[500px]:bottom-6 border-gray-600 justify-between bg-gray-800 flex items-center px-4 py-2 rounded-xl'>
            <input
              placeholder='Write the next number'
              autoFocus
              ref={inputRef}
              value={inputValue}
              onKeyDown={handleKeyDown}
              className='flex-1 pl-2 text-white bg-transparent outline-none text-lg min-w-0'
              onChange={(event) => setInputValue(event.target.value)}
            />
            <button
              type='button'
              className='bg-gray-700 border border-gray-600 rounded w-11 h-11 flex items-center justify-center'
              onClick={handleSubmit}
            >
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
                  fill='#FAFAF9'
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

type State = {
  isLoading: boolean;
  userCount: number;
  highscore: number;
  elements: Set<number>;
  failedNumber: number | null;
};

type Action =
  | {
      type: 'initial';
      highScore: number;
      userCount: number;
      value: number;
    }
  | { type: 'update-user-count'; value: number }
  | { type: 'update-count'; value: number }
  | { type: 'start-failed-number-animation'; value: number }
  | { type: 'complete-failed-number-animation'; value: number | null }
  | { type: 'disconnect' };

const initialState: State = {
  elements: new Set([]),
  failedNumber: null,
  isLoading: true,
  highscore: 0,
  userCount: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'initial': {
      const previousElements = Array.from({ length: 10 }).map(
        (_, i) => action.value - i
      );

      const previousElementsGreaterThanZero = previousElements.filter(
        (value) => value > 0
      );

      const elementsSet = new Set([...previousElementsGreaterThanZero]);

      return {
        ...state,
        isLoading: false,
        highscore: action.highScore,
        userCount: action.userCount,
        elements: elementsSet,
      };
    }
    case 'update-count': {
      const highestNumber = Math.max(...state.elements);

      let elements = state.elements;

      if (action.value > highestNumber) {
        const difference = action.value - highestNumber;

        const additionalElements: number[] = [];

        Array.from({
          length: difference,
        }).map((_, i) => {
          additionalElements.push(highestNumber + i + 1);
        });

        elements = new Set([...elements, ...additionalElements]);
      }

      if (state.highscore < action.value) {
        return {
          ...state,
          elements,
          highscore: action.value,
        };
      }

      return {
        ...state,
        elements,
      };
    }
    case 'update-user-count': {
      console.log('Updating user count', action.value);

      return {
        ...state,
        userCount: action.value,
      };
    }
    case 'start-failed-number-animation': {
      return {
        ...state,
        failedNumber: action.value,
      };
    }
    case 'complete-failed-number-animation': {
      return {
        ...state,
        failedNumber: action.value,
        elements: new Set([1]),
      };
    }
    case 'disconnect': {
      return {
        ...state,
        isLoading: true,
      };
    }
  }
}

function Spinner() {
  return (
    <div className='animate-spin w-11 h-11 border-4 border-solid border-white border-b-transparent rounded-[50%]'></div>
  );
}

function App() {
  const websocketRef = useRef<WebSocket | null>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [key, rerender] = useState(Math.random());
  const [scope, animate] = useAnimate();

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const parsedData = JSON.parse(event.data as string);

        console.log(parsedData.type);

        switch (parsedData.type) {
          case 'initial': {
            dispatch({
              type: 'initial',
              highScore: parsedData.highScore,
              userCount: parsedData.userCount,
              value: parsedData.value,
            });

            break;
          }
          case 'count-updated': {
            if (state.isLoading) {
              return;
            }

            dispatch({
              type: 'update-count',
              value: parsedData.value,
            });

            break;
          }
          case 'failed': {
            dispatch({
              type: 'start-failed-number-animation',
              value: parsedData.value,
            });

            setTimeout(() => {
              animate(
                '.number-element',
                { opacity: 0, y: 500 },
                {
                  ease: 'backInOut',
                  duration: 0.75,
                  onComplete: () => {
                    dispatch({
                      type: 'complete-failed-number-animation',
                      value: null,
                    });

                    // TODO: Find a better way to rerender
                    rerender(Math.random());
                  },
                }
              );
            }, 300);

            console.log('Failed to update count');
            break;
          }
          case 'user-count': {
            dispatch({
              value: parsedData.value,
              type: 'update-user-count',
            });

            break;
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [animate, state.isLoading]
  );

  const handleError = useCallback((event: Event) => {
    console.log('Websocket error', event);
    dispatch({ type: 'disconnect' });
  }, []);

  const handleClose = useCallback(() => {
    dispatch({ type: 'disconnect' });
    websocketRef.current = null;

    // Attempt to reconnect after 1.5 seconds
    setTimeout(() => {
      connectWebSocket();
    }, 1500);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpen = useCallback((event: Event) => {
    if (!websocketRef.current) return;

    console.log('Connected to server', event);
    console.log('Sending initial message...');

    websocketRef.current.send(JSON.stringify({ type: 'initial' }));
  }, []);

  const connectWebSocket = useCallback(() => {
    console.log('Connecting to websocket...');
    if (!websocketRef.current) {
      websocketRef.current = new WebSocket(`${WEBSOCKET_HOST}/v1/websocket`);
    }

    websocketRef.current?.addEventListener('open', handleOpen);
    websocketRef.current?.addEventListener('message', handleMessage);
    websocketRef.current?.addEventListener('close', handleClose);
    websocketRef.current?.addEventListener('error', handleError);
  }, [handleClose, handleError, handleMessage, handleOpen]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      if (websocketRef.current) {
        websocketRef.current.removeEventListener('open', handleOpen);
        websocketRef.current.removeEventListener('message', handleMessage);
        websocketRef.current.removeEventListener('close', handleClose);
        websocketRef.current.removeEventListener('error', handleError);
      }
    };
  }, [connectWebSocket, handleClose, handleError, handleMessage, handleOpen]);

  const handleSubmit = async (value: number) => {
    if (!websocketRef.current) {
      return;
    }

    websocketRef.current.send(JSON.stringify({ type: 'update-count', value }));
  };

  if (state.isLoading) {
    return (
      <div className='fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
        <Spinner />
      </div>
    );
  }

  return (
    <Game
      elements={state.elements}
      failedNumber={state.failedNumber}
      highscore={state.highscore}
      userCount={state.userCount}
      keyValue={key}
      onSubmit={handleSubmit}
      scope={scope}
    />
  );
}

export default App;
