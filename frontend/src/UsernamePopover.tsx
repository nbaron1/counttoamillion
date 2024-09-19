import * as Popover from '@radix-ui/react-popover';
import { useEffect, useState } from 'react';

export function UsernamePopover({
  username,
  setUsername,
}: {
  username: string;
  setUsername: (value: string) => void;
}) {
  const [currentUsername, setCurrentUsername] = useState(username);

  useEffect(() => {
    setCurrentUsername(username);
  }, [username]);

  return (
    <Popover.Root>
      <Popover.Trigger>{username}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <input
            value={currentUsername}
            placeholder='Enter your username'
            onChange={(event) => setCurrentUsername(event.target.value)}
          />
          <button
            className='rounded-xl'
            onClick={() => setUsername(currentUsername)}
          >
            Save username
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
