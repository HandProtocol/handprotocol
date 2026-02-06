import React, { createContext, useContext, useReducer, useEffect } from 'react';

interface DiscoveredProject {
  id: string;
  name: string;
  description: string;
  link: string;
  discoveredAt: number; // timestamp
  category?: string;
}

interface DiscoveredState {
  projects: DiscoveredProject[];
}

type DiscoveredAction =
  | { type: 'ADD_PROJECT'; payload: DiscoveredProject }
  | { type: 'REMOVE_PROJECT'; payload: string }
  | { type: 'CLEAR_ALL' };

const DiscoveredProjectsContext = createContext<{
  state: DiscoveredState;
  dispatch: React.Dispatch<DiscoveredAction>;
} | null>(null);

const discoveredReducer = (state: DiscoveredState, action: DiscoveredAction): DiscoveredState => {
  switch (action.type) {
    case 'ADD_PROJECT': {
      const existingProject = state.projects.find(project => project.id === action.payload.id);
      if (existingProject) {
        // Update the discoveredAt timestamp if already exists
        return {
          ...state,
          projects: state.projects.map(project =>
            project.id === action.payload.id
              ? { ...project, discoveredAt: action.payload.discoveredAt }
              : project
          ),
        };
      }
      return {
        ...state,
        projects: [...state.projects, action.payload],
      };
    }
    case 'REMOVE_PROJECT': {
      return {
        ...state,
        projects: state.projects.filter(project => project.id !== action.payload),
      };
    }
    case 'CLEAR_ALL':
      return {
        projects: [],
      };
    default:
      return state;
  }
};

const loadDiscoveredFromStorage = (): DiscoveredState => {
  try {
    const savedProjects = localStorage.getItem('discoveredProjects');
    if (!savedProjects) return { projects: [] };
    
    const parsed = JSON.parse(savedProjects);
    
    // Validate and clean up discovered projects
    const validProjects = parsed.projects?.filter((project: any) => 
      project && 
      typeof project.id === 'string' && 
      typeof project.name === 'string' && 
      typeof project.description === 'string' &&
      typeof project.link === 'string' &&
      typeof project.discoveredAt === 'number'
    ) || [];
    
    return { projects: validProjects };
  } catch {
    // Clear invalid data
    localStorage.removeItem('discoveredProjects');
    return { projects: [] };
  }
};

export const DiscoveredProjectsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(discoveredReducer, { projects: [] }, loadDiscoveredFromStorage);

  useEffect(() => {
    localStorage.setItem('discoveredProjects', JSON.stringify(state));
  }, [state]);

  return (
    <DiscoveredProjectsContext.Provider value={{ state, dispatch }}>
      {children}
    </DiscoveredProjectsContext.Provider>
  );
};

export const useDiscoveredProjects = () => {
  const context = useContext(DiscoveredProjectsContext);
  if (!context) {
    throw new Error('useDiscoveredProjects must be used within a DiscoveredProjectsProvider');
  }
  return context;
}; 