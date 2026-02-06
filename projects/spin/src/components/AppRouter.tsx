import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAdmin } from '../contexts/AdminContext';
import App from '../App';
import { AdminAuth } from './AdminAuth';
import { AdminPanel } from './AdminPanel';

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAdmin();
  
  if (!state.isAuthenticated) {
    return <AdminAuth />;
  }
  
  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Main app route */}
        <Route path="/" element={<App />} />
        
        {/* Admin routes */}
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          } 
        />
        
        {/* Redirect any unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}; 