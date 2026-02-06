import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { DiscoveredProjectsProvider } from './contexts/DiscoveredProjectsContext';
import { AdminProvider } from './contexts/AdminContext';
import { AppRouter } from './components/AppRouter';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminProvider>
      <DiscoveredProjectsProvider>
        <AppRouter />
      </DiscoveredProjectsProvider>
    </AdminProvider>
  </StrictMode>
);