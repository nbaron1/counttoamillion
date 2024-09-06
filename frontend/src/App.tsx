import { useEffect, useRef, useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  const websocketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const websocketHost = import.meta.env.VITE_BACKEND_HOST;

    if (!websocketHost) {
      throw new Error('VITE_BACKEND_HOST not found');
    }

    console.log('Websocket host', { websocketHost });

    const socket = new WebSocket(`ws://${websocketHost}/websocket`);

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

        if ('count' in parsedData) {
          setCount(parsedData.count);
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

    websocket.send(JSON.stringify({ count: newCount }));
  };

  return (
    <div className='text-3xl'>
      <p>Current count: {count}</p>
      <div className='flex items-center gap-5'>
        <input
          type='number'
          value={newCount}
          onChange={(event) => setNewCount(Number(event.target.value))}
        />
        <button type='button' onClick={handleSubmit}>
          Submit
        </button>
      </div>
      countinorder.com
    </div>
  );
}

export default App;
