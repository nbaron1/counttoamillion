import { useEffect, useMemo, useRef, useState } from 'react';

function NumberElement({
  number,
  isHighestNumber,
}: {
  number: number;
  isHighestNumber: boolean;
}) {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      return;
    }

    console.log(`Animating ${number}`);
    hasAnimated.current = true;
  }, [number]);

  const className = isHighestNumber
    ? 'text-gray-50  w-16'
    : 'text-gray-500 w-16';

  return (
    <p className={className} key={number}>
      {number}
    </p>
  );
}

function App() {
  const [count, setCount] = useState(0);
  const [inputValue, setInputValue] = useState('');

  const websocketRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [elements, setElements] = useState<Set<number>>(new Set([]));

  useEffect(() => {
    const websocketHost = import.meta.env.VITE_BACKEND_HOST;

    if (!websocketHost) {
      throw new Error('VITE_BACKEND_HOST not found');
    }

    const host = `${websocketHost}/websocket`;
    const socket = new WebSocket(host);

    // Connection opened
    socket.addEventListener('open', (event) => {
      console.log('Connected to server', event);

      socket.send(JSON.stringify({ type: 'initial' }));
    });

    socket.addEventListener('error', (error) => {
      console.log('Error connecting to server', error);
    });

    socket.addEventListener('close', (event) => {
      // TODO: handle reconnection
      console.log('Connection closed', event);
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      console.log('Message from server ', event.data);
      try {
        const parsedData = JSON.parse(event.data as string);

        switch (parsedData.type) {
          case 'count-updated': {
            if (elements.size === 0) {
              const previousElements = Array.from(
                { length: 10 },
                (_, i) => count - i
              );

              const previousElementsGreaterOrEqualToZero =
                previousElements.filter((value) => value >= 0);

              setElements(new Set([...previousElementsGreaterOrEqualToZero]));

              return;
            }

            const highestNumber = Math.max(...elements);

            if (parsedData.count > highestNumber) {
              const difference = parsedData.count - highestNumber;

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

            setCount(parsedData.count);

            break;
          }
          case 'failed': {
            // TODO: update UI to show error
            setElements(new Set([0]));

            // todo: aniamte failure

            console.log('Failed to update count');
          }
        }
      } catch (error) {
        console.error(error);
      }
    });

    websocketRef.current = socket;
  }, [count, elements]);

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
      JSON.stringify({ type: 'update-count', count: inputNumberValue })
    );

    setInputValue('');
    inputRef.current?.focus();
  };

  const highestNumber = useMemo(() => Math.max(...elements), [elements]);

  const elementsSorted = Array.from(elements).sort((a, b) => a - b);

  return (
    <div>
      {/* <p>Current count: {count}</p> */}
      <div className='fixed top-6 left-6 text-lg text-gray-50 flex gap-8 items-center'>
        <p>High score: 99</p>
        <p className='underline text-lg'>Replay</p>
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
        <div className='fixed top-1/2 -translate-y-1/2 -translate-x-1/2 right-1/2 gap-8 text-[64px] flex'>
          {[...elementsSorted].map((number) => (
            <NumberElement
              key={number}
              number={number}
              isHighestNumber={highestNumber === number}
            />
          ))}
        </div>
        <div className='fixed border border-gray-600 justify-between bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 flex items-center px-6 py-3 rounded-xl'>
          <input
            placeholder='Write a number'
            autoFocus
            ref={inputRef}
            value={inputValue}
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
