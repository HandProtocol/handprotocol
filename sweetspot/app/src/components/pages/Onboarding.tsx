import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Candy,
  ChefHat,
  Factory,
  Gift,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Steps } from '../../types/steps'

const steps: Steps = [
  {
    id: 'welcome',
    title: 'Welcome to the Sweet Factory!',
    description: 'Get ready to join our decentralized sweet production line.',
    icon: Factory
  },
  {
    id: 'purpose',
    title: 'What brings you to our factory?',
    description:
      'Let us know how you would like to participate in sweet production.',
    icon: ChefHat,
    options: [
      {
        id: 'baker',
        title: 'Master Baker',
        description: 'I want to contribute ingredients (deposit tokens)',
        icon: Candy
      },
      {
        id: 'collector',
        title: 'Sweet Collector',
        description: 'I am here to collect my fresh sweets (claim tokens)',
        icon: Gift
      }
    ]
  },
  {
    id: 'experience',
    title: 'Sweet Making Experience',
    description: 'Tell us about your experience with decentralized protocols.',
    icon: Candy,
    options: [
      {
        id: 'newbie',
        title: 'Fresh Baker',
        description: 'This is my first time in a crypto kitchen'
      },
      {
        id: 'intermediate',
        title: 'Seasoned Chef',
        description: 'I have used other DeFi protocols before'
      },
      {
        id: 'expert',
        title: 'Master Pastry Chef',
        description: 'I am an experienced DeFi user'
      }
    ]
  }
]

const containerVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
}

const candyVariants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'linear'
    }
  }
}

export function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(0)
  const [selections, setSelections] = useState<Record<string, string>>({})
  const { push } = useRouter()

  const step = steps[currentStep]

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      // Redirect based on user selections
      const path =
        selections.purpose === 'baker'
          ? '/dashboard'
          : '/dashboard?action=claim'
      push(path)
      return
    }
    setDirection(1)
    setCurrentStep((prev) => prev + 1)
  }

  const handleBack = () => {
    if (currentStep === 0) return
    setDirection(-1)
    setCurrentStep((prev) => prev - 1)
  }

  const handleSelect = (optionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [step.id]: optionId
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step.id}
            custom={direction}
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            className="bg-white rounded-2xl shadow-xl p-8 relative overflow-hidden"
          >
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20" />
            <motion.div
              className="absolute top-4 right-4 text-purple-600"
              variants={candyVariants}
              initial="initial"
              animate="animate"
            >
              <Candy className="h-8 w-8" />
            </motion.div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center space-x-4 mb-8">
                <div className="p-3 bg-purple-100 rounded-lg">
                  {step.icon && (
                    <step.icon className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {step.title}
                  </h2>
                  <p className="text-gray-600 mt-1">{step.description}</p>
                </div>
              </div>

              {/* Options */}
              {step.options && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {step.options.map((option) => (
                    <motion.button
                      key={option.id}
                      whileHover={{ scale: 1.02, y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSelect(option.id)}
                      className={`p-6 rounded-xl text-left transition-all ${
                        selections[step.id] === option.id
                          ? 'bg-purple-100 border-2 border-purple-500'
                          : 'bg-gray-50 hover:bg-purple-50 border-2 border-transparent'
                      }`}
                    >
                      {option.icon && (
                        <div className="mb-4">
                          <option.icon className="h-8 w-8 text-purple-600" />
                        </div>
                      )}
                      <h3 className="text-lg font-semibold mb-2">
                        {option.title}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        {option.description}
                      </p>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleBack}
                  className={`flex items-center space-x-2 text-gray-600 ${
                    currentStep === 0 ? 'invisible' : ''
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back</span>
                </motion.button>

                <div className="flex space-x-2">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`h-2 w-2 rounded-full transition-colors ${
                        index === currentStep ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  disabled={step.options && !selections[step.id]}
                  className="flex items-center space-x-2 text-white bg-purple-600 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>
                    {currentStep === steps.length - 1 ? 'Start Baking' : 'Next'}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
