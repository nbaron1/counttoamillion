import { useEffect, useRef, useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [inputCount, setInputCount] = useState(0);

  const websocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const websocketHost = import.meta.env.VITE_BACKEND_HOST;

    if (!websocketHost) {
      throw new Error('VITE_BACKEND_HOST not found');
    }

    console.log('Websocket host', { websocketHost });
    const host = `${websocketHost}/websocket`;
    console.log({ host });
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
            setCount(parsedData.count);

            break;
          }
          case 'failed': {
            // TODO: update UI to show error
            console.log('Failed to update count');
          }
        }
      } catch (error) {
        console.error(error);
      }
    });

    websocketRef.current = socket;
  }, []);

  const handleSubmit = async () => {
    const websocket = websocketRef.current;

    if (!websocket) {
      return;
    }

    websocket.send(JSON.stringify({ type: 'update-count', count: inputCount }));
  };

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
        <div className='fixed top-1/2 -translate-y-1/2 left-0 gap-5 text-[64px] flex'>
          <p className='text-gray-500'>{count - 8}</p>
          <p className='text-gray-500'>{count - 7}</p>
          <p className='text-gray-500'>{count - 6}</p>
          <p className='text-gray-500'>{count - 5}</p>
          <p className='text-gray-500'>{count - 4}</p>
          <p className='text-gray-500'>{count - 3}</p>
          <p className='text-gray-500'>{count - 2}</p>
          <p className='text-gray-500'>{count - 1}</p>
          <p className='text-white'>{count}</p>
        </div>
        <div className='fixed border border-gray-600 justify-between bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 flex items-center px-6 py-3 rounded-xl'>
          <input
            placeholder='Write a number'
            className='w-60 text-white bg-transparent outline-none text-xl no-spinner'
            type='number'
            onChange={(event) => setInputCount(Number(event.target.value))}
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
