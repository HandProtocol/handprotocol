import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { Project } from '../data/projects';

// Simple admin credentials (in production, this should be more secure)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'projectspin2024'
};

export interface AdminState {
  isAuthenticated: boolean;
  username: string | null;
}

export interface AdminAction {
  type: 'LOGIN' | 'LOGOUT';
  payload?: {
    username: string;
  };
}

const initialState: AdminState = {
  isAuthenticated: false,
  username: null,
};

const AdminContext = createContext<{
  state: AdminState;
  dispatch: React.Dispatch<AdminAction>;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  updateProject: (project: Project) => Promise<boolean>;
  addProject: (project: Omit<Project, 'id'>) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
} | null>(null);

const adminReducer = (state: AdminState, action: AdminAction): AdminState => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        isAuthenticated: true,
        username: action.payload?.username || null,
      };
    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        username: null,
      };
    default:
      return state;
  }
};

// Load admin state from localStorage
const loadAdminFromStorage = (initialState: AdminState): AdminState => {
  try {
    const adminData = localStorage.getItem('adminAuth');
    if (adminData) {
      const parsed = JSON.parse(adminData);
      // Only restore if session is less than 24 hours old
      const sessionAge = Date.now() - (parsed.timestamp || 0);
      if (sessionAge < 24 * 60 * 60 * 1000) {
        return {
          isAuthenticated: parsed.isAuthenticated || false,
          username: parsed.username || null,
        };
      }
    }
  } catch (error) {
    console.error('Error loading admin state:', error);
  }
  return initialState;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(adminReducer, initialState, loadAdminFromStorage);

  useEffect(() => {
    const adminData = {
      isAuthenticated: state.isAuthenticated,
      username: state.username,
      timestamp: Date.now(),
    };
    localStorage.setItem('adminAuth', JSON.stringify(adminData));
  }, [state]);

  const login = (username: string, password: string): boolean => {
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      dispatch({ type: 'LOGIN', payload: { username } });
      return true;
    }
    return false;
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
    localStorage.removeItem('adminAuth');
  };

  // Project management functions (in a real app, these would call APIs)
  const updateProject = async (project: Project): Promise<boolean> => {
    try {
      // In production, this would make an API call
      // For now, we'll just simulate success
      console.log('Updating project:', project);
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  };

  const addProject = async (project: Omit<Project, 'id'>): Promise<boolean> => {
    try {
      // In production, this would make an API call
      // For now, we'll just simulate success
      console.log('Adding project:', project);
      return true;
    } catch (error) {
      console.error('Error adding project:', error);
      return false;
    }
  };

  const deleteProject = async (projectId: string): Promise<boolean> => {
    try {
      // In production, this would make an API call
      console.log('Deleting project:', projectId);
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  };

  return (
    <AdminContext.Provider value={{ 
      state, 
      dispatch, 
      login, 
      logout, 
      updateProject, 
      addProject, 
      deleteProject 
    }}>
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}; 