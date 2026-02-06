import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle, CheckCircle, Star, ExternalLink } from 'lucide-react';
import { Project } from '../data/projects';
import { wheelCategories } from '../data/categories';
import { useAdmin } from '../contexts/AdminContext';

interface ProjectEditorProps {
  project?: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (project: Project) => void;
}

interface QualityCheck {
  id: string;
  label: string;
  description: string;
  check: (project: Partial<Project>) => boolean;
  weight: number; // 1-5, higher is more important
}

const qualityChecks: QualityCheck[] = [
  {
    id: 'name_length',
    label: 'Appropriate Name Length',
    description: 'Name should be between 3-80 characters',
    check: (project) => project.name ? project.name.length >= 3 && project.name.length <= 80 : false,
    weight: 4
  },
  {
    id: 'description_length',
    label: 'Good Description Length',
    description: 'Description should be between 20-200 characters',
    check: (project) => project.description ? project.description.length >= 20 && project.description.length <= 200 : false,
    weight: 5
  },
  {
    id: 'valid_url',
    label: 'Valid Project URL',
    description: 'Link should be a valid URL',
    check: (project) => {
      if (!project.link) return false;
      try {
        new URL(project.link);
        return true;
      } catch {
        return false;
      }
    },
    weight: 5
  },
  {
    id: 'giveth_url',
    label: 'Giveth Platform URL',
    description: 'Link should be from giveth.io for consistency',
    check: (project) => project.link ? project.link.includes('giveth.io') : false,
    weight: 3
  },
  {
    id: 'category_selected',
    label: 'Category Selected',
    description: 'A valid category should be selected',
    check: (project) => project.category ? project.category !== '' : false,
    weight: 4
  },
  {
    id: 'description_actionable',
    label: 'Actionable Description',
    description: 'Description should explain what the project does',
    check: (project) => {
      if (!project.description) return false;
      const actionWords = ['supporting', 'providing', 'developing', 'creating', 'building', 'promoting', 'enabling', 'facilitating'];
      return actionWords.some(word => project.description!.toLowerCase().includes(word));
    },
    weight: 3
  },
  {
    id: 'no_special_chars',
    label: 'Clean Name Format',
    description: 'Name should not have excessive special characters',
    check: (project) => {
      if (!project.name) return false;
      const specialCharCount = (project.name.match(/[^a-zA-Z0-9\s\-\&\.]/g) || []).length;
      return specialCharCount <= 3;
    },
    weight: 2
  }
];

export const ProjectEditor: React.FC<ProjectEditorProps> = ({ project, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Project>>({
    id: '',
    name: '',
    description: '',
    category: 'ALL',
    link: ''
  });
  const [qualityScore, setQualityScore] = useState(0);
  const [qualityResults, setQualityResults] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { updateProject, addProject } = useAdmin();

  const isEditing = !!project;

  useEffect(() => {
    if (project) {
      setFormData(project);
    } else {
      setFormData({
        id: '',
        name: '',
        description: '',
        category: 'ALL',
        link: ''
      });
    }
  }, [project]);

  useEffect(() => {
    // Calculate quality score whenever form data changes
    const results: Record<string, boolean> = {};
    let totalWeight = 0;
    let passedWeight = 0;

    qualityChecks.forEach(check => {
      const passed = check.check(formData);
      results[check.id] = passed;
      totalWeight += check.weight;
      if (passed) passedWeight += check.weight;
    });

    setQualityResults(results);
    setQualityScore(totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Project name is required';
    }
    if (!formData.description?.trim()) {
      newErrors.description = 'Project description is required';
    }
    if (!formData.link?.trim()) {
      newErrors.link = 'Project link is required';
    }
    if (!formData.category) {
      newErrors.category = 'Category selection is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      const projectData: Project = {
        id: formData.id || Date.now().toString(),
        name: formData.name!.trim(),
        description: formData.description!.trim(),
        category: formData.category!,
        link: formData.link!.trim()
      };

      let success = false;
      if (isEditing) {
        success = await updateProject(projectData);
      } else {
        success = await addProject(projectData);
      }

      if (success) {
        onSave(projectData);
        onClose();
      } else {
        setErrors({ submit: 'Failed to save project. Please try again.' });
      }
    } catch (error) {
      setErrors({ submit: 'An unexpected error occurred.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityBadge = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 80) return { label: 'Good', color: 'bg-blue-500' };
    if (score >= 60) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Needs Work', color: 'bg-red-500' };
  };

  if (!isOpen) return null;

  const qualityBadge = getQualityBadge(qualityScore);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full px-4 py-6 flex items-center justify-center">
        <div className="bg-gradient-to-br from-purple-900 to-purple-800 p-6 rounded-2xl shadow-2xl border border-purple-500/30 w-full max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">
              {isEditing ? 'Edit Project' : 'Add New Project'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all resize-none"
                    placeholder="Describe what this project does and its impact"
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.description && (
                      <p className="text-sm text-red-400">{errors.description}</p>
                    )}
                    <p className="text-xs text-purple-300 ml-auto">
                      {formData.description?.length || 0}/200 characters
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Category *
                  </label>
                  <select
                    value={formData.category || 'ALL'}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                  >
                    <option value="ALL">ALL (Default)</option>
                    {wheelCategories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-400">{errors.category}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Project Link *
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={formData.link || ''}
                      onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                      className="w-full px-4 py-3 pr-12 bg-purple-800/50 border border-purple-600/30 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
                      placeholder="https://giveth.io/project/..."
                    />
                    {formData.link && (
                      <a
                        href={formData.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-200 transition-colors"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                  {errors.link && (
                    <p className="mt-1 text-sm text-red-400">{errors.link}</p>
                  )}
                </div>

                {errors.submit && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-200 text-sm">
                    {errors.submit}
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-lg hover:scale-105 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    {isLoading ? 'Saving...' : (isEditing ? 'Update Project' : 'Add Project')}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-purple-600/40 hover:bg-purple-600/60 text-white rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>

            {/* Quality Panel */}
            <div className="bg-purple-800/30 rounded-xl p-6 border border-purple-600/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Quality Score</h3>
                <div className="flex items-center gap-2">
                  <span className={`text-2xl font-bold ${getQualityColor(qualityScore)}`}>
                    {qualityScore}%
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${qualityBadge.color}`}>
                    {qualityBadge.label}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {qualityChecks.map(check => (
                  <div key={check.id} className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {qualityResults[check.id] ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${qualityResults[check.id] ? 'text-green-300' : 'text-red-300'}`}>
                          {check.label}
                        </p>
                        <div className="flex">
                          {[...Array(check.weight)].map((_, i) => (
                            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-purple-300 mt-1">
                        {check.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-purple-600/30">
                <p className="text-xs text-purple-300">
                  Higher star ratings indicate more important quality checks. 
                  Aim for 80%+ for best results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 