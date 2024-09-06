import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useAnimate } from 'framer-motion';

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

function App() {
  const [inputValue, setInputValue] = useState('');

  const websocketRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [elements, setElements] = useState<Set<number>>(new Set([]));

  // TODO: remove this
  const [key, rerender] = useState(Math.random());

  const [scope, animate] = useAnimate();
  const [failedNumber, setFailedNumber] = useState<null | number>(null);
  const [highscore, setHighscore] = useState<null | number>(null);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      console.log('Message from server ', event.data);
      try {
        const parsedData = JSON.parse(event.data as string);

        switch (parsedData.type) {
          case 'initial': {
            const previousElements = Array.from({ length: 10 }).map(
              (_, i) => parsedData.value - i
            );

            const previousElementsGreaterThanZero = previousElements.filter(
              (value) => value > 0
            );

            setElements(new Set([...previousElementsGreaterThanZero]));

            setHighscore(parsedData.highScore);

            console.log('is here!!');

            break;
          }
          case 'count-updated': {
            if (elements.size === 0) {
              console.log(elements.size);
              return;
            }

            const highestNumber = Math.max(...elements);

            if (parsedData.value > highestNumber) {
              const difference = parsedData.value - highestNumber;

              const additionalElements: number[] = [];

              Array.from({
                length: difference,
              }).map((_, i) => {
                additionalElements.push(highestNumber + i + 1);
              });

              setElements(
                (prevElements) =>
                  new Set([...prevElements, ...additionalElements])
              );
            }

            if (highscore && parsedData.value > highscore) {
              setHighscore(parsedData.value);
            }

            break;
          }
          case 'failed': {
            setFailedNumber(parsedData.value);

            setTimeout(() => {
              animate(
                '.number-element',
                { opacity: 0, y: 500 },
                {
                  ease: 'backInOut',
                  duration: 0.75,
                  onComplete: () => {
                    setFailedNumber(null);
                    setElements(new Set([1]));
                    // TODO: Find a better way to rerender
                    rerender(Math.random());
                  },
                }
              );
            }, 300);

            console.log('Failed to update count');
          }
        }
      } catch (error) {
        console.error(error);
      }
    },
    [animate, elements, highscore]
  );

  const handleError = useCallback((error: Event) => {
    console.log('Error connecting to server', error);
  }, []);

  const handleClose = useCallback((event: CloseEvent) => {
    // TODO: handle reconnection
    console.log('Connection closed', event);
  }, []);

  const handleOpen = useCallback((event: Event) => {
    if (!websocketRef.current) return;

    console.log('Connected to server', event);
    console.log('Sending initial message...');

    websocketRef.current.send(JSON.stringify({ type: 'initial' }));
  }, []);

  useEffect(() => {
    const websocketHost = import.meta.env.VITE_BACKEND_HOST;

    if (!websocketHost) {
      throw new Error('VITE_BACKEND_HOST not found');
    }

    if (!websocketRef.current) {
      const host = `${websocketHost}/v1/websocket`;
      websocketRef.current = new WebSocket(host);
    }

    const websocket = websocketRef.current;

    websocket.addEventListener('open', handleOpen);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('message', handleMessage);
    websocket.addEventListener('error', handleError);

    return () => {
      websocket.removeEventListener('open', handleOpen);
      websocket.removeEventListener('message', handleMessage);
      websocket.removeEventListener('error', handleError);
      websocket.removeEventListener('close', handleClose);
    };
  }, [elements, handleClose, handleError, handleMessage, handleOpen]);

  const handleSubmit = async () => {
    const websocket = websocketRef.current;

    if (!websocket) {
      return;
    }

    const inputNumberValue = Number.parseInt(inputValue, 10);
    console.log({ inputNumberValue });

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

    websocket.send(
      JSON.stringify({ type: 'update-count', value: inputNumberValue })
    );

    setInputValue('');
    inputRef.current?.focus();
  };

  console.log({ elements });
  const highestNumber = useMemo(() => Math.max(...elements), [elements]);

  const elementsSorted = Array.from(elements).sort((a, b) => a - b);

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  };

  console.log({ elementsSorted });

  return (
    <div ref={scope}>
      {/* <p>Current count: {count}</p> */}
      <div className='fixed top-6 left-6 text-lg text-gray-50 flex gap-8 items-center'>
        <p>High score: {highscore}</p>
        <p className='underline text-lg'>Previous attempts</p>
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

        <div
          className='fixed top-1/2 -translate-y-1/2 right-1/2 gap-8 text-[64px] flex'
          key={key}
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
        <div className='fixed border border-gray-600 justify-between bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 flex items-center px-6 py-3 rounded-xl'>
          <input
            placeholder='Write a number'
            autoFocus
            ref={inputRef}
            value={inputValue}
            onKeyDown={handleKeyDown}
            className='w-60 text-white bg-transparent outline-none text-xl'
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
  );
}

export default App;
