import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Candy, ArrowRight } from 'lucide-react'
import { TopContributors } from '../leaderboard/TopContributors'
import { LoadingTransition } from '../LoadingTransition'
import { ElectricEffect } from '../effects/ElectricEffect'
import { FeaturedProjects } from '../home/FeaturedProjects'
import { useRouter } from 'next/navigation'
import { RoundsOverview } from '../admin/RoundsOverview'

function HeroSection({ onGetStarted }: { onGetStarted: () => void }) {
  return (
    <motion.div
      key="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="relative flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] bg-s-bg"
    >
      <ElectricEffect />

      <div className="text-center px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.5,
            type: 'spring',
            stiffness: 200
          }}
          className="relative mb-8"
        >
          <div className="absolute -inset-4 bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full opacity-75 blur-lg animate-pulse" />
          <Candy className="relative h-16 w-16 sm:h-24 sm:w-24 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-8"
        >
          <h1 className="text-4xl sm:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600">
            Welcome to Sweet Spot
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            A decentralized app that lets you earn and use tokens to support
            impactful projects. Stake, donate, and grow your impact as you
            complete quests and help others. Start making a difference today!
          </p>

          <div className="flex items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={onGetStarted}
              className="relative group px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-lg sm:text-xl font-medium overflow-hidden border-none"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-600 opacity-75 blur-lg group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center space-x-2 text-white">
                <span>Get Started</span>
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"
      />
    </motion.div>
  )
}

export function Home() {
  const [isLoading, setIsLoading] = useState(false)
  const { push } = useRouter()

  const handleGetStarted = () => {
    // setIsLoading(true);
    // setTimeout(() => {
    //   navigate('/onboarding');
    // }, 3000);
    setIsLoading(true)
    setTimeout(() => {
      push('/onboarding')
    }, 1000)
  }

  return (
    <div className="flex flex-col">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <LoadingTransition key="loading" />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HeroSection onGetStarted={handleGetStarted} />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16 mb-10">
              <div>
                <h2 className="text-2xl font-bold mb-8">Featured Projects</h2>
                <FeaturedProjects />
              </div>

              <div>
                <RoundsOverview />
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-8">Top Contributors</h2>
                <TopContributors />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
