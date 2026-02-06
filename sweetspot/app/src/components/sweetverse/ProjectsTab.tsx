import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { Project } from '../../types/project'
import { ALL_PROJECTS } from '../../utils/data/projects'

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md overflow-hidden"
    >
      <div className="h-48 overflow-hidden">
        <img
          src={project.image}
          alt={project.name}
          className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">{project.name}</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {/* Handle both legacy 'category' property and new 'categories' array */}

              {project.categories.map((category, index) => (
                <span
                  key={index}
                  className="inline-block px-3 py-1 text-sm font-medium text-purple-600 bg-purple-100 rounded-full"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-2 text-gray-400 hover:text-purple-600"
          >
            <ExternalLink className="h-5 w-5" />
          </motion.button>
        </div>

        <p className="text-gray-600 mb-4">{project.description}</p>
      </div>
    </motion.div>
  )
}

export function ProjectsTab() {
  // Check if ALL_PROJECTS is array and not empty
  if (!Array.isArray(ALL_PROJECTS) || ALL_PROJECTS.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">No projects available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALL_PROJECTS.map((project: Project) => (
          <ProjectCard
            key={project.id || Math.random().toString()}
            project={project}
          />
        ))}
      </div>
    </div>
  )
}
