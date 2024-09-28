import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { GoogleAuth } from './GoogleAuth';
import { GuestAuth } from './GuestAuth';
import { UserProvider } from './context/User';
import { Home } from './Home';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { GoogleAuthCallback } from './GoogleAuthCallback';
import { FailedAuth } from './FailedAuth';
import { Logout } from './Logout';
import { useEffect } from 'react';
import { updateColors } from './utils/updateColors';
import { Toaster } from 'react-hot-toast';
import { GameOver } from './GameOver';
import DisableDevtool from 'disable-devtool';
import Fireworks from '@fireworks-js/react';

// const router = createBrowserRouter([
//   {
//     path: '/',
//     element: (
//       <UserProvider>
//         <Home />
//       </UserProvider>
//     ),
//   },
//   {
//     path: '/auth/guest',
//     element: <GuestAuth />,
//   },
//   {
//     path: '/auth/google/callback',
//     element: <GoogleAuthCallback />,
//   },
//   {
//     path: '/auth/google',
//     element: <GoogleAuth />,
//   },
//   {
//     path: '/auth/failed',
//     element: <FailedAuth />,
//   },
//   {
//     path: '/logout',
//     element: <Logout />,
//   },
//   {
//     path: '/game-over',
//     element: <GameOver />,
//   },
// ]);

// This is the original App function that was used to render the website while the game was still active
// export function App() {
//   useEffect(() => {
//     updateColors();
//   }, []);

//   useEffect(() => {
//     DisableDevtool();
//   }, []);

//   return (
//     <>
//       <RouterProvider router={router} />
//       <Toaster />
//     </>
//   );
// }

// Now that the game is over we can just display the winner's username and the time it took
export function App() {
  useEffect(() => {
    updateColors();
  }, []);

  return (
    <>
      <Fireworks
        className='fixed top-0 left-0 bottom-0 right-0'
        options={{ mouse: { click: true } }}
      />
      <p className='fixed text-3xl text-white left-5 right-5 sm:text-center sm:left-12 sm:right-12 md:left-1/2 md:right-auto md:-translate-x-1/2 -translate-y-3/4 md:max-w-[750px] top-1/2'>
        This website was been beaten by x.com/x_ssc in
        <br />0 days, 6 hours, 25 minutes, and 1 second
      </p>
      <a
        className='text-white underline fixed bottom-4 left-4'
        href='https://buymeacoffee.com/noahbaron'
        target='_blank'
        rel='noreferrer'
      >
        buy me a coffee
      </a>
      <a
        className='text-white underline fixed bottom-4 right-4'
        href='https://nbaron.com/'
        target='_blank'
        rel='noreferrer'
      >
        built by nbaron
      </a>
    </>
  );
}
