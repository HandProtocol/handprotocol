import React from 'react';
import { Sparkles } from 'lucide-react';
import { useDiscoveredProjects } from '../contexts/DiscoveredProjectsContext';

interface DiscoveredProjectsIconProps {
  onClick: () => void;
}

export const DiscoveredProjectsIcon: React.FC<DiscoveredProjectsIconProps> = ({ onClick }) => {
  const { state } = useDiscoveredProjects();
  const projectCount = state.projects.length;

  return (
    <button
      onClick={onClick}
      className="relative p-3 bg-purple-800/50 hover:bg-purple-800/70 rounded-full transition-all shadow-lg border border-purple-500/30 group"
      title="View discovered projects"
    >
      <Sparkles className="w-6 h-6 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
      {projectCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-purple-900 shadow-lg">
          {projectCount > 99 ? '99+' : projectCount}
        </span>
      )}
      {projectCount === 0 && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500/50 rounded-full border border-purple-400/50" />
      )}
    </button>
  );
}; 