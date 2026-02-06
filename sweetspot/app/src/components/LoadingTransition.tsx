import React from 'react'
import { motion } from 'framer-motion'
import { Candy } from 'lucide-react'

const letterVariants = {
  initial: { y: 0 },
  animate: (i: number) => ({
    y: [-20, 0],
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      repeat: Infinity,
      repeatType: 'reverse',
      ease: 'easeInOut'
    }
  })
}

const containerVariants = {
  exit: {
    opacity: 0,
    transition: {
      duration: 0.5
    }
  }
}

export function LoadingTransition() {
  const text = 'Sweet Spot'

  return (
    <motion.div
      className="fixed inset-0 bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center z-50"
      variants={containerVariants}
      initial={{ opacity: 1 }}
      exit="exit"
    >
      <div className="flex flex-col items-center space-y-8">
        <div className="flex items-center space-x-4">
          <div className="flex">
            {text.split('').map((letter, i) => (
              <motion.span
                key={i}
                custom={i}
                // @ts-ignore
                variants={letterVariants}
                initial="initial"
                animate="animate"
                className="text-6xl font-bold text-white inline-block"
              >
                {letter}
              </motion.span>
            ))}
          </div>
          <motion.div
            animate={{
              rotate: 360,
              scale: [1, 1.2, 1]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'linear'
            }}
          >
            <Candy className="h-16 w-16 text-white" />
          </motion.div>
        </div>
        <motion.div
          animate={{
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'linear'
          }}
          className="text-white text-xl"
        >
          Loading...
        </motion.div>
      </div>
    </motion.div>
  )
}
