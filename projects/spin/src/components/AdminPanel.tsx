import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter, 
  LogOut, 
  ExternalLink, 
  BarChart3,
  Users,
  Globe
} from 'lucide-react';
import { projects, Project } from '../data/projects';
import { wheelCategories } from '../data/categories';
import { useAdmin } from '../contexts/AdminContext';
import { ProjectEditor } from './ProjectEditor';

export const AdminPanel: React.FC = () => {
  const { state, logout, deleteProject } = useAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Filter and search projects
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'ALL' || project.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const totalProjects = projects.length;
    const categoryCounts = wheelCategories.reduce((acc, category) => {
      acc[category.name] = projects.filter(p => p.category === category.name).length;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total: totalProjects,
      byCategory: categoryCounts,
      avgDescriptionLength: Math.round(
        projects.reduce((sum, p) => sum + p.description.length, 0) / totalProjects
      )
    };
  }, []);

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsAddingNew(false);
    setIsEditorOpen(true);
  };

  const handleAddNew = () => {
    setSelectedProject(null);
    setIsAddingNew(true);
    setIsEditorOpen(true);
  };

  const handleSaveProject = (project: Project) => {
    // In a real app, this would update the projects array through an API
    console.log('Project saved:', project);
    setIsEditorOpen(false);
    setSelectedProject(null);
    setIsAddingNew(false);
  };

  const handleDeleteProject = async (projectId: string) => {
    if (deleteConfirm === projectId) {
      const success = await deleteProject(projectId);
      if (success) {
        console.log('Project deleted:', projectId);
        setDeleteConfirm(null);
      }
    } else {
      setDeleteConfirm(projectId);
      // Auto-cancel confirmation after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const category = wheelCategories.find(c => c.name === categoryName);
    return category?.color || '#8b5cf6';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900">
      {/* Header */}
      <div className="bg-purple-900/50 border-b border-purple-500/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Project Admin Panel</h1>
              <p className="text-purple-200">Welcome back, {state.username}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-purple-800/50 to-purple-700/50 p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-purple-200">Total Projects</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-800/50 to-purple-700/50 p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.avgDescriptionLength}</p>
                <p className="text-purple-200">Avg Description Length</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-800/50 to-purple-700/50 p-6 rounded-xl border border-purple-500/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-pink-500/20 rounded-lg">
                <Users className="w-6 h-6 text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{wheelCategories.length}</p>
                <p className="text-purple-200">Categories</p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-purple-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-3 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
            >
              <option value="ALL">All Categories</option>
              {wheelCategories.map(category => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg hover:scale-105 hover:shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Project
          </button>
        </div>

        {/* Projects Table */}
        <div className="bg-purple-800/30 rounded-xl border border-purple-500/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-900/50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">Project Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">Description</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-purple-200">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-600/20">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="hover:bg-purple-700/20 transition-colors">
                    <td className="px-6 py-4 text-sm text-purple-300 font-mono">
                      #{project.id}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">{project.name}</p>
                        <a
                          href={project.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Project
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(project.category) + '66' }}
                      >
                        {project.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <p className="text-sm text-purple-200 truncate">
                        {project.description}
                      </p>
                      <p className="text-xs text-purple-400 mt-1">
                        {project.description.length} characters
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 rounded-lg transition-all"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className={`p-2 rounded-lg transition-all ${
                            deleteConfirm === project.id
                              ? 'bg-red-500 text-white'
                              : 'bg-red-500/20 hover:bg-red-500/30 text-red-200'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {deleteConfirm === project.id && (
                        <p className="text-xs text-red-300 mt-1">Click again to confirm</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-purple-300">No projects found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-4 text-center">
          <p className="text-purple-300">
            Showing {filteredProjects.length} of {projects.length} projects
          </p>
        </div>
      </div>

      {/* Project Editor Modal */}
      <ProjectEditor
        project={isAddingNew ? null : selectedProject}
        isOpen={isEditorOpen}
        onClose={() => {
          setIsEditorOpen(false);
          setSelectedProject(null);
          setIsAddingNew(false);
        }}
        onSave={handleSaveProject}
      />
    </div>
  );
}; 