import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { AnimationScope, motion, useAnimate } from 'framer-motion';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import * as RadioGroup from '@radix-ui/react-radio-group';
import './dialog.css';
import './hide-scrollbar.css';
import { Turnstile } from '@marsidev/react-turnstile';

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
        stroke='#D6D3D1'
        strokeWidth='2'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

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

// function CloseIcon() {
//   return (
//     <svg
//       width='20'
//       height='20'
//       viewBox='0 0 20 20'
//       fill='none'
//       xmlns='http://www.w3.org/2000/svg'
//     >
//       <path
//         fill-rule='evenodd'
//         clip-rule='evenodd'
//         d='M4.41107 4.41009C4.73651 4.08466 5.26414 4.08466 5.58958 4.41009L10.0003 8.82084L14.4111 4.41009C14.7365 4.08466 15.2641 4.08466 15.5896 4.41009C15.915 4.73553 15.915 5.26317 15.5896 5.5886L11.1788 9.99935L15.5896 14.4101C15.915 14.7355 15.915 15.2632 15.5896 15.5886C15.2641 15.914 14.7365 15.914 14.4111 15.5886L10.0003 11.1779L5.58958 15.5886C5.26414 15.914 4.73651 15.914 4.41107 15.5886C4.08563 15.2632 4.08563 14.7355 4.41107 14.4101L8.82182 9.99935L4.41107 5.5886C4.08563 5.26317 4.08563 4.73553 4.41107 4.41009Z'
//         fill='white'
//       />
//     </svg>
//   );
// }

const useAttempts = ({
  filter,
  page,
}: {
  filter: AttemptFilter;
  page: number;
}) => {
  const [data, setData] = useState<
    { id: number; created_at: string; count: number }[] | null
  >(null);
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

type Attempt = { count: number; id: number; created_at: string };

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

  const percentage = Math.floor((attempt.count / 101) * 100);
  console.log();

  return (
    <div className='flex justify-between'>
      <div className='flex flex-col'>
        <p className='text-gray-50 text-lg'>
          {attempt.count} <span className='text-gray-400'>/ 101</span>
        </p>
        <p className='text-gray-400 text-lg'>{timeSince}</p>
      </div>
      <p>{percentage}%</p>
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

  if (data === null && !isLastPage) return null;

  if (data === null) {
    return (
      <div className='mx-auto h-72'>
        <div className='animate-spin w-10 h-10 border-4 border-solid border-gray-400 border-b-transparent rounded-[50%]'></div>
      </div>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      {data.map((attempt) => (
        <PreviousAttempt attempt={attempt} key={attempt.id} />
      ))}

      {isLastPage && hasNextPage && (
        <button
          className='bg-gray-800 py-3 text-gray-50 border border-gray-700 rounded'
          type='button'
          onClick={onLoadMore}
        >
          Load more
        </button>
      )}
    </div>
  );
}

function PreviousAttemptDialogContent({
  type,
  isEnabled,
}: {
  type: AttemptFilter;
  isEnabled: boolean;
}) {
  const [pages, setPages] = useState(1);

  return (
    <>
      <div
        className={`flex flex-col sm:max-h-96 overflow-y-scroll gap-4 ${
          !isEnabled ? 'hidden' : ''
        }`}
      >
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
    </>
  );
}

type AttemptFilter = 'latest' | 'top';

function PreviousAttemptsDialog() {
  const [type, setType] = useState<AttemptFilter>('top');

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
        <Dialog.Content className='DialogContent flex w-[90vw] sm:h-auto sm:w-[450px] flex-col px-5 py-6 max-w-[90vw] h-[95vh] rounded-2xl gap-4 bg-gray-800 border border-gray-700 z-30 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'>
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
              className='bg-gray-800 border border-gray-700 rounded-lg px-2 flex py-[6px]'
            >
              <RadioGroup.Item
                className='text-center flex-1 text-gray-50 data-[state=checked]:bg-gray-700 rounded py-1'
                value='top'
              >
                Closest
              </RadioGroup.Item>
              <RadioGroup.Item
                className='py-1 text-center flex-1 text-gray-50 data-[state=checked]:bg-gray-700 rounded'
                value='latest'
              >
                Latest
              </RadioGroup.Item>
            </RadioGroup.Root>
          </div>
          <PreviousAttemptDialogContent
            type='latest'
            isEnabled={type === 'latest'}
          />
          <PreviousAttemptDialogContent type='top' isEnabled={type === 'top'} />
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

function Message({ author, message }: { message: string; author: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className='flex flex-col'
      onClick={() => setIsExpanded((prev) => !prev)}
    >
      <p
        className={`text-gray-100 break-words ${
          isExpanded ? 'line-clamp-2' : ''
        }`}
      >
        {message}
      </p>
      <p className='text-gray-500'>{author}</p>
    </div>
  );
}

type MessageType = {
  id: number;
  message: string;
  createdAt: string;
  author: string;
};

type MessagesType = MessageType[] | null;

const fetchMessages = async (): Promise<MessagesType> => {
  try {
    const result = await fetch(`${BACKEND_HOST}/v1/messages?limit=50`);

    if (!result.ok) {
      throw new Error('Failed to fetch messages');
    }

    const data = (await result.json()) as { data: MessagesType };

    return data.data;
  } catch {
    const waitOneSecond = new Promise((resolve) => {
      setTimeout(() => {
        resolve([]);
      }, 1000);
    });

    await waitOneSecond;

    return fetchMessages();
  }
};

function Messages({
  messages,
  messagesRef,
}: {
  messages: MessagesType;
  messagesRef: React.RefObject<HTMLDivElement>;
}) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  const hasLoaded = useRef(false);

  // only scroll if the user is at the bottom

  useEffect(() => {
    if (!hasLoaded.current) {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'instant',
      });
      // messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      hasLoaded.current = true;
      return;
    }

    if (!isAtBottom || !messagesRef.current) {
      return;
    }

    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isAtBottom, messages, messagesRef]);

  const handleScroll = useCallback(() => {
    if (!messagesRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesRef.current;

    if (scrollTop + clientHeight >= scrollHeight) {
      setIsAtBottom(true);

      return;
    }

    setIsAtBottom(false);
  }, []);

  useEffect(() => {
    messagesRef.current?.addEventListener('scroll', handleScroll);

    return () => {
      messagesRef.current?.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  if (!messages) {
    return (
      <div className='relative flex-1'>
        <div className='absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2'>
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div
      className='flex flex-col flex-1 gap-1 overflow-y-scroll'
      ref={messagesRef}
    >
      {messages.map((message) => (
        <Message
          author={message.author}
          message={message.message}
          key={message.id}
        />
      ))}
    </div>
  );
}

const MobileDialogContent = forwardRef<
  HTMLDivElement,
  { onSendMessage: SendMessageEvent; messages: MessagesType }
>(function ChatPopoverContent({ onSendMessage, messages }, ref) {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [usernameState, setUsernameState] = useState<
    'loading' | 'exists' | 'doesnt-exist'
  >('loading');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const usernameItem = localStorage.getItem('username');

    if (usernameItem) {
      setUsername(usernameItem);
      setUsernameState('exists');
    } else {
      setUsernameState('doesnt-exist');
    }
  }, []);

  if (usernameState === 'loading') {
    return <p>Loading...</p>;
  }

  const handleSaveUsername = () => {
    if (username.length === 0) {
      return;
    }

    setUsernameState('exists');
    localStorage.setItem('username', username);
  };

  const handleChangeName = () => {
    setUsernameState('doesnt-exist');
    localStorage.removeItem('username');
    setUsername('');
  };

  if (usernameState === 'doesnt-exist') {
    return (
      <Dialog.Content
        ref={ref}
        aria-describedby={undefined}
        className='flex flex-col gap-2 DialogContent h-[95vh] fixed top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 rounded-2xl w-[90vw] bg-gray-800 border border-gray-700 px-6 py-6'
      >
        <div className='flex items-center justify-between'>
          <Dialog.Title className='text-xl'>Chat</Dialog.Title>
          <Dialog.Close>
            <CloseIcon />
          </Dialog.Close>
        </div>
        <div className='absolute top-1/2 -translate-y-3/4 left-6 right-6 flex flex-col gap-5'>
          <p className='text-2xl text-center'>What should we call you?</p>
          <div className='flex flex-col gap-1'>
            <input
              value={username ?? ''}
              onChange={(event) => setUsername(event.target.value)}
              placeholder='Write a username'
              className='w-full py-4 rounded-lg border border-gray-600 bg-gray-800 text-white outline-none pl-4 pr-2 '
            />
            <button
              onClick={handleSaveUsername}
              className='w-full py-3 bg-gray-700 border border-gray-600 rounded-lg'
            >
              Continue
            </button>
          </div>
        </div>
      </Dialog.Content>
    );
  }

  const handleSendMessage = () => {
    const username = localStorage.getItem('username');

    // todo: add sentry error handling
    if (!username) {
      return;
    }

    setMessage('');

    // Scroll after the scrollHeight has been updated to include the new message
    setTimeout(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 250);

    onSendMessage({ author: username, message });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    handleSendMessage();
  };

  return (
    <Dialog.Content
      aria-describedby={undefined}
      ref={ref}
      className='flex flex-col gap-3 DialogContent h-[95vh] fixed top-1/2 -translate-x-1/2 left-1/2 -translate-y-1/2 rounded-2xl w-[90vw] bg-gray-800 border border-gray-700 px-6 py-6'
    >
      <div className='flex flex-col mb-2'>
        <div className='flex items-center justify-between'>
          <Dialog.Title className='text-xl'>Chat</Dialog.Title>
          <Dialog.Close>
            <CloseIcon />
          </Dialog.Close>
        </div>
        <button
          className='text-gray-500 self-start text-center'
          onClick={handleChangeName}
        >
          Change username
        </button>
      </div>
      <Messages messagesRef={messagesRef} messages={messages} />
      <div className='flex flex-col gap-2'>
        <textarea
          value={message}
          onKeyDown={handleKeyDown}
          onChange={(event) => setMessage(event.target.value)}
          placeholder='Write a message'
          rows={1}
          className='w-full py-4 overflow-y-auto rounded-lg h-auto resize-none border border-gray-600 bg-gray-800 text-white outline-none pl-4 pr-2 '
        />
        <div className='flex flex-col gap-1'>
          <button
            onClick={handleSendMessage}
            className='w-full py-3 bg-gray-700 border border-gray-600 rounded-lg'
          >
            Send message
          </button>
        </div>
      </div>
    </Dialog.Content>
  );
});

function MobileChatDialog({
  onSendMessage,
  messages,
}: {
  onSendMessage: SendMessageEvent;
  messages: MessagesType;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger className='flex items-center justify-center bg-gray-800 w-14 h-14 rounded-full border border-gray-700'>
        <ChatIcon />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className='fixed top-0 left-0 right-0 bottom-0 bg-black opacity-50' />
        <MobileDialogContent
          onSendMessage={onSendMessage}
          messages={messages}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}
const DesktopPopoverContent = forwardRef<
  HTMLDivElement,
  { onSendMessage: SendMessageEvent; messages: MessagesType }
>(function DesktopPopoverContent({ onSendMessage, messages }, ref) {
  const [username, setUsername] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [usernameState, setUsernameState] = useState<
    'loading' | 'exists' | 'doesnt-exist'
  >('loading');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const usernameItem = localStorage.getItem('username');

    if (usernameItem) {
      setUsername(usernameItem);
      setUsernameState('exists');
    } else {
      setUsernameState('doesnt-exist');
    }
  }, []);

  if (usernameState === 'loading') {
    return <p>Loading...</p>;
  }

  const handleSaveUsername = () => {
    if (username.length === 0) {
      return;
    }

    setUsernameState('exists');
    localStorage.setItem('username', username);
  };

  const handleChangeName = () => {
    setUsernameState('doesnt-exist');
    localStorage.removeItem('username');
    setUsername('');
  };

  if (usernameState === 'doesnt-exist') {
    return (
      <Popover.Content
        side='top'
        align='end'
        sideOffset={12}
        className='py-6 px-6 w-96 rounded-2xl bg-gray-800 h-[600px] border border-gray-700'
      >
        <div className='flex items-center justify-between'>
          <h3 className='text-xl'>Live chat</h3>
          <Popover.Close>
            <CloseIcon />
          </Popover.Close>
        </div>
        <div className='absolute top-1/2 -translate-y-1/2 left-6 right-6 flex flex-col gap-5'>
          <p className='text-2xl text-center'>What should we call you?</p>
          <div className='flex flex-col gap-1'>
            <input
              value={username ?? ''}
              onChange={(event) => setUsername(event.target.value)}
              placeholder='Write a username'
              className='w-full py-4 rounded-lg border border-gray-600 bg-gray-800 text-white outline-none pl-4 pr-2 '
            />
            <button
              onClick={handleSaveUsername}
              className='w-full py-3 bg-gray-700 border border-gray-600 rounded-lg'
            >
              Continue
            </button>
          </div>
        </div>
      </Popover.Content>
    );
  }

  const handleSendMessage = () => {
    const username = localStorage.getItem('username');

    // todo: add sentry error handling
    if (!username) {
      return;
    }

    setMessage('');

    // Scroll after the scrollHeight has been updated to include the new message
    setTimeout(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 250);

    onSendMessage({ author: username, message });
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    handleSendMessage();
  };

  return (
    <Popover.Content
      ref={ref}
      side='top'
      align='end'
      sideOffset={12}
      className='py-6 flex flex-col gap-3 px-6 w-96 rounded-2xl bg-gray-800 h-[600px] border border-gray-700'
    >
      <div className='flex flex-col mb-2'>
        <div className='flex items-center justify-between'>
          <h3 className='text-xl'>Live chat</h3>
          <Popover.Close>
            <CloseIcon />
          </Popover.Close>
        </div>
        <button
          className='text-gray-500 self-start text-center'
          onClick={handleChangeName}
        >
          Change username
        </button>
      </div>
      <Messages messagesRef={messagesRef} messages={messages} />
      <div className='flex flex-col gap-2'>
        <textarea
          value={message}
          onKeyDown={handleKeyDown}
          onChange={(event) => setMessage(event.target.value)}
          placeholder='Write a message'
          rows={1}
          className='w-full py-4 overflow-y-auto rounded-lg h-auto resize-none border border-gray-600 bg-gray-800 text-white outline-none pl-4 pr-2 '
        />
        <div className='flex flex-col gap-1'>
          <button
            onClick={handleSendMessage}
            className='w-full py-3 bg-gray-700 border border-gray-600 rounded-lg'
          >
            Send message
          </button>
        </div>
      </div>
    </Popover.Content>
  );
});

function DesktopChatPopover({
  onSendMessage,
  messages,
}: {
  onSendMessage: SendMessageEvent;
  messages: MessagesType;
}) {
  return (
    <Popover.Root>
      <Popover.Trigger className='flex items-center justify-center bg-gray-800 w-14 h-14 rounded-full border border-gray-700 fixed right-6 bottom-0 -translate-y-full'>
        <ChatIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <DesktopPopoverContent
          messages={messages}
          onSendMessage={onSendMessage}
        />
      </Popover.Portal>
    </Popover.Root>
  );
}

type VerificationState = {
  verified: boolean;
  submissionsSinceVerification: number;
};

type VerificationAction = 'verify' | 'verification-required' | 'submission';

const verificationReducer = (
  state: VerificationState,
  action: VerificationAction
) => {
  switch (action) {
    case 'verification-required': {
      return { verified: false, submissionsSinceVerification: 0 };

      break;
    }
    case 'verify': {
      return {
        verified: true,
        submissionsSinceVerification: 0,
      };

      break;
    }
    case 'submission': {
      if (state.submissionsSinceVerification + 1 === 10) {
        return { verified: false, submissionsSinceVerification: 0 };
      }

      return {
        verified: state.verified,
        submissionsSinceVerification: state.submissionsSinceVerification + 1,
      };
    }
  }
};

const initialVerificationState: VerificationState = {
  submissionsSinceVerification: 0,
  verified: false,
};

function InputField({ onSubmit }: { onSubmit: (value: number) => void }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [state, dispatch] = useReducer(
    verificationReducer,
    initialVerificationState
  );
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    if (state.submissionsSinceVerification === 0) {
      const timeout = setTimeout(() => {
        dispatch('verification-required');
      }, 120 * 1000);
      timeoutRef.current = timeout;
    }

    if (state.submissionsSinceVerification === 9) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      dispatch('verification-required');
    }

    onSubmit(inputNumberValue);
    setInputValue('');
    inputRef.current?.focus();
    dispatch('submission');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  if (!state.verified) {
    return (
      <div className='flex flex-col self-center gap-2'>
        <p className='text-center text-gray-400'>
          Verify you're a human to continue
        </p>
        <Turnstile
          options={{ size: 'flexible', theme: 'dark' }}
          className='w-full  h-auto max-w-[95vw] sm:!w-96'
          siteKey={import.meta.env.VITE_CF_TURNSTILE_KEY}
          onSuccess={() => {
            setTimeout(() => {
              dispatch('verify');
            }, 2500);
          }}
        />
      </div>
    );
  }

  return (
    <div className='border self-center max-w-[95vw] w-full sm:w-96 min-[500px]:bottom-6 border-gray-600 justify-between bg-gray-800 flex items-center px-4 py-2 rounded-xl'>
      <input
        placeholder='Write the next number'
        autoFocus
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
  onSendMessage,
  messages,
}: {
  failedNumber: null | number;
  highscore: number;
  userCount: number;
  elements: Set<number>;
  onSubmit: (value: number) => void;
  scope: AnimationScope;
  keyValue: number;
  onSendMessage: SendMessageEvent;
  messages: MessagesType;
}) {
  const highestNumber = useMemo(() => Math.max(...elements), [elements]);

  const elementsSorted = Array.from(elements).sort((a, b) => a - b);

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

      <div className='hidden sm:block'>
        <DesktopChatPopover onSendMessage={onSendMessage} messages={messages} />
      </div>
      <a
        target='_blank'
        className='hidden text-gray-500 underline sm:block fixed bottom-5 left-5'
        href='https://nbaron.com/'
      >
        built by nbaron
      </a>
      <div className='fixed sm:right-6 top-5 sm:justify-between left-5 text-lg text-gray-50 flex'>
        <div className='flex flex-col sm:flex-row sm:gap-5'>
          <p>Closest attempt: {highscore}</p>
          <PreviousAttemptsDialog />
        </div>
        <div className='hidden sm:flex items-center gap-3'>
          <div className='bg-[#ACFF58] animate-pulse rounded-full w-3 h-3' />
          <p className='text-gray-50'>
            {userCount}{' '}
            <span className='text-gray-400'>
              {userCount === 1 ? 'user' : 'users'} online
            </span>
          </p>
        </div>
      </div>
      <div className='flex items-center gap-5'>
        {/* TODO: fix centering */}
        <div
          className='fixed top-1/2 sm:-translate-y-1/2 right-1/2 gap-8 text-[64px] flex translate-x-[32px] sm:translate-x-0 -translate-y-full'
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
        <div className='fixed bottom-4 sm:bottom-6 left-5 right-5 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 flex flex-col gap-3'>
          <div className=''></div>
          <div className='flex items-center justify-between'>
            <div className='sm:hidden flex items-center gap-2 self-end'>
              <div className='bg-[#ACFF58] animate-pulse rounded-full w-3 h-3' />
              <p className='text-gray-50'>
                {userCount} {userCount === 1 ? 'user' : 'users'} online
              </p>
            </div>
            <div className='sm:hidden'>
              <MobileChatDialog
                onSendMessage={onSendMessage}
                messages={messages}
              />
            </div>
          </div>
          <InputField onSubmit={onSubmit} />
          <p className='text-gray-500 text-center'>
            This website will shut down forever once we count to{' '}
            <span className='text-gray-50'>101</span> in order
          </p>
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

type SendMessageEvent = (data: { message: string; author: string }) => void;

function App() {
  const websocketRef = useRef<WebSocket | null>(null);
  const [state, dispatch] = useReducer(reducer, initialState);
  const [key, rerender] = useState(Math.random());
  const [scope, animate] = useAnimate();

  const [messages, setMessages] = useState<MessagesType>(null);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (hasLoaded.current) return;

    hasLoaded.current = true;

    try {
      fetchMessages().then((data) => {
        setMessages(data);
      });
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  }, []);

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
          case 'message': {
            console.log('Received message', parsedData);
            setMessages((prev) => {
              console.log(parsedData);
              if (!prev) return [parsedData];
              return [...prev, parsedData];
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

  const handleSendMessage = ({
    message,
    author,
  }: {
    message: string;
    author: string;
  }) => {
    if (!websocketRef.current || !messages) {
      return;
    }

    console.log('Sending message', { message, author });

    const newOptimisticMessage = {
      author,
      message,
      createdAt: new Date().toISOString(),
      id: Math.random(),
    };

    setMessages(() => [...messages, newOptimisticMessage]);

    websocketRef.current.send(
      JSON.stringify({ type: 'message', message, author })
    );
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
      onSendMessage={handleSendMessage}
      keyValue={key}
      onSubmit={handleSubmit}
      scope={scope}
      messages={messages}
    />
  );
}

export default App;
