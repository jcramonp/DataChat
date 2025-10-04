import { createBrowserRouter } from 'react-router-dom';

import App from './App';
import Landing from './pages/Landing';
import MainPage from './pages/MainPage';
import NotFound from './pages/NotFound';
import Login from './pages/Login';          // <- AÑADIR

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Landing /> },
      { path: 'login', element: <Login /> }, // <- AÑADIR
      { path: 'main', element: <MainPage /> },
    ],
  },
]);
