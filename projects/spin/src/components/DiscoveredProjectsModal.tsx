import React from 'react';
import { X, ExternalLink, Trash2, Calendar, Sparkles, Download } from 'lucide-react';
import { useDiscoveredProjects } from '../contexts/DiscoveredProjectsContext';

interface DiscoveredProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscoveredProjectsModal: React.FC<DiscoveredProjectsModalProps> = ({ isOpen, onClose }) => {
  const { state, dispatch } = useDiscoveredProjects();

  if (!isOpen) return null;

  const formatDiscoveryDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - timestamp;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const formatUnderdogCategory = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('environment') || desc.includes('green') || desc.includes('climate')) {
      return '🌱 Environmental';
    } else if (desc.includes('education') || desc.includes('learning') || desc.includes('academy')) {
      return '📚 Education';
    } else if (desc.includes('art') || desc.includes('creative') || desc.includes('music')) {
      return '🎨 Creative';
    } else if (desc.includes('health') || desc.includes('medical') || desc.includes('care')) {
      return '💊 Healthcare';
    } else if (desc.includes('development') || desc.includes('tool') || desc.includes('platform')) {
      return '🛠️ Tech/Tools';
    } else if (desc.includes('dao') || desc.includes('governance') || desc.includes('community')) {
      return '🏛️ Governance';
    }
    return '🌐 Web3';
  };

  const downloadMarkdown = () => {
    if (state.projects.length === 0) return;

    const currentDate = new Date().toLocaleDateString();
    let markdown = `# My Discovered Projects\n\n*Downloaded on ${currentDate}*\n\n`;
    markdown += `I've discovered ${state.projects.length} amazing project${state.projects.length !== 1 ? 's' : ''} using the Project Spin wheel! 🎯\n\n`;
    markdown += `---\n\n`;

    // Sort by discovery date (newest first)
    const sortedForDownload = [...state.projects].sort((a, b) => b.discoveredAt - a.discoveredAt);
    
    sortedForDownload.forEach((project, index) => {
      const discoveryDate = new Date(project.discoveredAt).toLocaleDateString();
      const category = formatUnderdogCategory(project.description);
      
      markdown += `## ${index + 1}. ${project.name}\n\n`;
      markdown += `**Category:** ${category}\n\n`;
      markdown += `**Discovered:** ${discoveryDate}\n\n`;
      markdown += `**Description:** ${project.description}\n\n`;
      markdown += `**Project Link:** [Visit Project](${project.link})\n\n`;
      markdown += `---\n\n`;
    });

    markdown += `## About Project Spin\n\n`;
    markdown += `These projects were discovered using Project Spin - a unique way to discover amazing positive impact projects beyond the well-marketed mainstream. Each spin reveals hidden gems making real change in the world!\n\n`;
    markdown += `*Keep spinning to discover more projects at [Project Spin](${window.location.origin})*\n`;

    // Create and download the file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `my-discovered-projects-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sort by most recently discovered
  const sortedProjects = [...state.projects].sort((a, b) => b.discoveredAt - a.discoveredAt);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full px-4 py-6 md:py-12 flex items-center justify-center">
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-2xl shadow-2xl border border-purple-500/30 w-full max-w-lg my-auto">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Discovered Projects</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {sortedProjects.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 text-purple-400 mx-auto mb-4 opacity-50" />
              <p className="text-purple-200 text-lg mb-2">No projects discovered yet!</p>
              <p className="text-purple-300 text-sm">Start spinning to discover amazing projects</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
                {sortedProjects.map(project => (
                  <div
                    key={`${project.id}-${project.discoveredAt}`}
                    className="bg-purple-800/50 p-4 rounded-lg border border-purple-600/20"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-medium text-sm leading-tight mb-1">
                          {project.name}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-purple-500/30 text-purple-200 px-2 py-1 rounded-full">
                            {formatUnderdogCategory(project.description)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-purple-300">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDiscoveryDate(project.discoveredAt)}</span>
                          </div>
                        </div>
                        <p className="text-purple-300 text-xs leading-relaxed mb-3">
                          {project.description.length > 100 
                            ? `${project.description.substring(0, 100)}...` 
                            : project.description}
                        </p>
                      </div>
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_PROJECT', payload: project.id })}
                        className="p-1 hover:bg-red-500/20 rounded-full transition-colors ml-2 flex-shrink-0"
                        title="Remove from discovered list"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <a
                        href={project.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs py-2 px-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-1 font-medium"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit Project
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-purple-600/30 pt-4">
                <div className="flex justify-between items-center text-white mb-4">
                  <span className="text-sm text-purple-300">
                    {sortedProjects.length} project{sortedProjects.length !== 1 ? 's' : ''} discovered
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadMarkdown}
                      className="flex items-center gap-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white text-xs font-medium rounded-lg transition-all hover:scale-105"
                    >
                      <Download className="w-3 h-3" />
                      Download MD
                    </button>
                    <button
                      onClick={() => dispatch({ type: 'CLEAR_ALL' })}
                      className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-purple-400">
                    🎯 Keep spinning to discover more amazing projects!
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}; 