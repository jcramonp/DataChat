import { createBrowserRouter } from 'react-router-dom';

import App from './App';
import Landing from './pages/Landing';
import MainPage from './pages/MainPage';
import NotFound from './pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'main', element: <MainPage /> },
    ],
  },
]);
