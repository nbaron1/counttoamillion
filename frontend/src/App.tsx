import { useEffect, useState } from 'react';

function App() {
  const [count, setCount] = useState(0);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8787/websocket');

    // Connection opened
    socket.addEventListener('open', (event) => {
      console.log('Connected to server', event);
      socket.send('Hello Server!');
    });

    // Listen for messages
    socket.addEventListener('message', (event) => {
      console.log('Message from server ', event.data);
    });
  }, []);

  const handleSubmit = async () => {
    console.log('handleSubmit', newCount);
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
