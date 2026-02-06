import React from 'react'
import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'
import { FEATURED_PROJECTS } from '../../utils/data/projects'

export function FeaturedProjects() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {FEATURED_PROJECTS.map((project, index) => (
        <a
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          key={project.id}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.2 }}
            whileHover={{ scale: 1.02, rotateX: 5, rotateY: 5 }}
            className="group cursor-pointer relative bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden transform perspective-1000"
          >
            <div className="absolute inset-0 border-2 border-transparent bg-gradient-to-r bg-s-bg mask-border animate-pulse-border rounded-lg" />

            <div className="h-48 sm:h-56 overflow-hidden">
              <img
                src={project.image}
                alt={project.name}
                className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="p-4 sm:p-6 relative">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold mb-2">
                    {project.name}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.categories.map((category, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 15 }}
                  whileTap={{ scale: 0.9 }}
                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <ExternalLink className="h-5 w-5" />
                </motion.div>
              </div>

              <p className="text-gray-600 mb-4 mt-3 text-sm sm:text-base">
                {project.description}
              </p>
            </div>
          </motion.div>
        </a>
      ))}
    </div>
  )
}
