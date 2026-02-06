import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Candy, ChevronRight, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface ApplicationModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ApplicationModal({ isOpen, onClose }: ApplicationModalProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    experience: '',
    reason: '',
    contribution: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Simulated submission
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Application submitted successfully!')
      onClose()
    } catch (error) {
      toast.error('Failed to submit application')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-3 mb-8">
              <Candy className="h-8 w-8 text-purple-600" />
              <h2 className="text-2xl font-bold">Sweet Spot Application</h2>
            </div>

            <div className="mb-8">
              <div className="flex items-center justify-between relative">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      s <= step ? 'bg-purple-600 text-white' : 'bg-gray-200'
                    }`}
                  >
                    {s}
                  </div>
                ))}
                <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10">
                  <div
                    className="h-full bg-purple-600 transition-all duration-300"
                    style={{ width: `${((step - 1) / 2) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Experience</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tell us about your DeFi experience
                      </label>
                      <textarea
                        value={formData.experience}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            experience: e.target.value
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent h-32"
                        placeholder="Share your experience with DeFi protocols..."
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Motivation</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Why do you want to join Sweet Spot?
                      </label>
                      <textarea
                        value={formData.reason}
                        onChange={(e) =>
                          setFormData({ ...formData, reason: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent h-32"
                        placeholder="Explain your motivation..."
                        required
                      />
                    </div>
                  </motion.div>
                )}

                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4"
                  >
                    <h3 className="text-lg font-semibold">Contribution</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        How will you contribute to Sweet Spot?
                      </label>
                      <textarea
                        value={formData.contribution}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            contribution: e.target.value
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent h-32"
                        placeholder="Describe your potential contributions..."
                        required
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-between pt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className={`flex items-center space-x-2 text-purple-600 ${
                    step === 1 ? 'invisible' : ''
                  }`}
                >
                  <ChevronRight className="h-5 w-5 rotate-180" />
                  <span>Previous</span>
                </motion.button>

                {step < 3 ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-5 w-5" />
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg"
                  >
                    <span>Submit Application</span>
                    <ChevronRight className="h-5 w-5" />
                  </motion.button>
                )}
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
