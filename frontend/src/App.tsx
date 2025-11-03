import { Outlet } from 'react-router-dom';
import NavBar from './components/NavBar';
import { ToastProvider } from "./ui/Toast";

import './App.css';

export default function App() {
  return (
      <ToastProvider>
          <div className="app-shell">
              <NavBar/>
              <Outlet/>
          </div>
      </ToastProvider>
  );
}
