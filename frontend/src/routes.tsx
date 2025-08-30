import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import Landing from "./pages/Landing.tsx";
import MainPage from "./pages/MainPage.tsx";
import NotFound from "./pages/NotFound.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Landing /> },
      { path: "main", element: <MainPage /> },
    ],
  },
]);
