import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { INIT_PROJECTS } from '../../../utils/config'
import useIsMobile from '../../../utils/hooks/useIsMobile'
import clsx from 'clsx'

const FeaturedProjects = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: false,
    margin: '0px 100px -50px 0px'
  })
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0 }
  }

  const [hoveredProjectId, setHoveredProjectId] = useState<number | null>(null)

  const [imageIndices, setImageIndices] = useState<{ [key: number]: number }>(
    INIT_PROJECTS.reduce(
      (acc, project) => {
        acc[project.id] = 0
        return acc
      },
      {} as { [key: number]: number }
    )
  )

  const isMobile = useIsMobile()

  useEffect(() => {
    const interval = setInterval(() => {
      setImageIndices((prevIndices) => {
        const newIndices = { ...prevIndices }
        INIT_PROJECTS.forEach((project) => {
          if (isMobile || hoveredProjectId === project.id) {
            newIndices[project.id] =
              (newIndices[project.id] + 1) % project.images.length
          }
        })
        return newIndices
      })
    }, 1500) // Change image every 3 seconds
    return () => clearInterval(interval)
  }, [hoveredProjectId, isMobile])

  const handleSwipe = (direction: 'left' | 'right', projectId: number) => {
    const project = INIT_PROJECTS.find((p) => p.id === projectId)
    if (!project) return
    setImageIndices((prevIndices) => {
      const newIndices = { ...prevIndices }
      if (direction === 'left') {
        newIndices[projectId] =
          (newIndices[projectId] + 1) % project.images.length
      } else if (direction === 'right') {
        newIndices[projectId] =
          (newIndices[projectId] - 1 + project.images.length) %
          project.images.length
      }
      return newIndices
    })
  }
  const variants = {
    enter: {
      opacity: 0,
      transition: {
        delay: 2
      },
      y: 50
    },
    center: {
      opacity: 1,
      y: 0
    },
    exit: {
      opacity: 0.8
    }
  }
  return (
    <div ref={ref} className="w-full box-border p-4 sm:p-14 start-center-col">
      <div className="text-4xl sm:text-3xl font-bold text-p-text mb-2">
        Featured Projects
      </div>
      <div className="text-s-text text-base sm:text-lg mb-4 sm:mb-8">
        Empowering Changemakers Worldwide
      </div>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full start-col"
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
      >
        {INIT_PROJECTS.map((project) => (
          <motion.a
            key={project.id}
            className={clsx(
              'bg-s-bg text-p-text no-underline rounded-lg sm:rounded-2xl overflow-hidden cursor-pointer',
              hoveredProjectId === project.id || isMobile
                ? ' shadow-md'
                : 'shadow-sm'
            )}
            whileTap={isMobile ? { scale: 1 } : { scale: 0.95 }}
            whileHover={{ scale: 1.015 }}
            variants={itemVariants}
            onMouseEnter={() => setHoveredProjectId(project.id)}
            onMouseLeave={() => setHoveredProjectId(null)}
            href={project.link}
            target="_blank"
          >
            {project.images && (
              <motion.div
                className="relative w-full h-96 overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                onPanEnd={(e, { offset, velocity }) => {
                  if (offset.x > 200 || velocity.x > 2) {
                    handleSwipe('right', project.id)
                  } else if (offset.x < -200 || velocity.x < -2) {
                    handleSwipe('left', project.id)
                  }
                }}
              >
                <AnimatePresence>
                  <motion.img
                    key={imageIndices[project.id]}
                    src={project.images[imageIndices[project.id]]}
                    className="absolute inset-0 w-full h-full object-cover rounded-t-lg"
                    custom={1}
                    variants={variants}
                    initial="enter"
                    exit="exit"
                    animate={'center'}
                    transition={{
                      x: { type: 'spring', stiffness: 300, damping: 30 },
                      duration: 1
                    }}
                  />
                </AnimatePresence>
              </motion.div>
            )}
            <div className="mt-4 px-4 text-xl sm:text-2xl font-semibold">
              {project.name}
            </div>

            <motion.div
              initial={{
                opacity: 0,
                x: -20
              }}
              animate={
                hoveredProjectId === project.id || isMobile
                  ? {
                      opacity: 1,
                      x: 0
                    }
                  : {
                      opacity: 0,
                      x: -15
                    }
              }
              className="px-4 text-s-text font-semibold text-sm sm:text-base"
            >
              {project.by && `by ${project.by}`}
            </motion.div>
            <div className="p-4 italic text-sm sm:text-base text-s-text">
              {project.shortDescription}
            </div>
          </motion.a>
        ))}
      </motion.div>
    </div>
  )
}

export default FeaturedProjects
