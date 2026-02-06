import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ImpactReport,
  IMPACT_CATEGORIES,
  PROOF_TYPES,
  SDG_GOALS,
  ImpactCategory,
  ProofType
} from '../../types/impact'
import {
  ChevronRight,
  Calendar,
  Users,
  Tag,
  Globe,
  Link,
  PlusCircle,
  Trash2,
  Save,
  Send
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export function Report() {
  const { push } = useRouter()
  const [report, setReport] = useState<Partial<ImpactReport>>({
    title: '',
    description: '',
    category: undefined,
    startDate: Date.now(),
    endDate: Date.now(),
    metrics: {},
    contributions: [],
    evidence: [],
    collaborators: [],
    tags: [],
    beneficiaries: [],
    status: 'draft'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Simulated submission
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast.success('Impact report submitted successfully!')
      push('/dashboard')
    } catch (error) {
      toast.error('Failed to submit report')
    }
  }

  const addEvidence = () => {
    setReport((prev) => ({
      ...prev,
      evidence: [
        ...(prev.evidence || []),
        {
          type: 'other' as ProofType,
          url: '',
          description: '',
          timestamp: Date.now()
        }
      ]
    }))
  }

  const removeEvidence = (index: number) => {
    setReport((prev) => ({
      ...prev,
      evidence: prev.evidence?.filter((_, i) => i !== index)
    }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Report Impact</h1>
        <p className="text-gray-600 mt-2">
          Document your contributions and impact on the ecosystem
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                value={report.title}
                onChange={(e) =>
                  setReport({ ...report, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Give your impact report a clear title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={report.description}
                onChange={(e) =>
                  setReport({ ...report, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent h-32"
                placeholder="Describe your impact in detail"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={report.category}
                onChange={(e) =>
                  setReport({
                    ...report,
                    category: e.target.value as ImpactCategory
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {IMPACT_CATEGORIES.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Calendar className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">Timeline</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={
                  new Date(report.startDate || Date.now())
                    .toISOString()
                    .split('T')[0]
                }
                onChange={(e) =>
                  setReport({
                    ...report,
                    startDate: new Date(e.target.value).getTime()
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={
                  new Date(report.endDate || Date.now())
                    .toISOString()
                    .split('T')[0]
                }
                onChange={(e) =>
                  setReport({
                    ...report,
                    endDate: new Date(e.target.value).getTime()
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                required
              />
            </div>
          </div>
        </div>

        {/* Evidence */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Link className="h-5 w-5 no-underline text-purple-600" />
              <h2 className="text-xl font-semibold">Evidence</h2>
            </div>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={addEvidence}
              className="flex items-center space-x-2 text-purple-600"
            >
              <PlusCircle className="h-5 w-5" />
              <span>Add Evidence</span>
            </motion.button>
          </div>

          <div className="space-y-4">
            {report.evidence?.map((evidence, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-4">
                  <select
                    value={evidence.type}
                    onChange={(e) => {
                      const newEvidence = [...(report.evidence || [])]
                      newEvidence[index] = {
                        ...evidence,
                        type: e.target.value as ProofType
                      }
                      setReport({ ...report, evidence: newEvidence })
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  >
                    {PROOF_TYPES.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeEvidence(index)}
                    className="text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <input
                    type="url"
                    value={evidence.url}
                    onChange={(e) => {
                      const newEvidence = [...(report.evidence || [])]
                      newEvidence[index] = {
                        ...evidence,
                        url: e.target.value
                      }
                      setReport({ ...report, evidence: newEvidence })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Evidence URL"
                    required
                  />
                  <textarea
                    value={evidence.description}
                    onChange={(e) => {
                      const newEvidence = [...(report.evidence || [])]
                      newEvidence[index] = {
                        ...evidence,
                        description: e.target.value
                      }
                      setReport({ ...report, evidence: newEvidence })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                    placeholder="Describe this evidence"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Metrics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Impact Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                People Reached
              </label>
              <input
                type="number"
                value={report.metrics?.peopleReached || ''}
                onChange={(e) =>
                  setReport({
                    ...report,
                    metrics: {
                      ...report.metrics,
                      peopleReached: parseInt(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Community Growth (%)
              </label>
              <input
                type="number"
                value={report.metrics?.communityGrowth || ''}
                onChange={(e) =>
                  setReport({
                    ...report,
                    metrics: {
                      ...report.metrics,
                      communityGrowth: parseInt(e.target.value)
                    }
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>
        </div>

        {/* SDG Goals */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Globe className="h-5 w-5 text-purple-600" />
            <h2 className="text-xl font-semibold">UN SDG Goals</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {SDG_GOALS.map((goal) => (
              <label key={goal.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={report.sdgGoals?.includes(goal.id)}
                  onChange={(e) => {
                    const goals = new Set(report.sdgGoals || [])
                    if (e.target.checked) {
                      goals.add(goal.id)
                    } else {
                      goals.delete(goal.id)
                    }
                    setReport({ ...report, sdgGoals: Array.from(goals) })
                  }}
                  className="rounded text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm">{goal.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setReport({ ...report, status: 'draft' })}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>Save Draft</span>
          </motion.button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Send className="h-5 w-5" />
            <span>Submit Report</span>
          </motion.button>
        </div>
      </form>
    </div>
  )
}
