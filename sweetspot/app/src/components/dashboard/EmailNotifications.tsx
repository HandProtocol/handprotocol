import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bell, Mail, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface NotificationPreferences {
  accountUpdates: boolean
  securityAlerts: boolean
  newsletters: boolean
  roundUpdates: boolean
  claimReminders: boolean
  projectUpdates: boolean
}

export function EmailNotifications() {
  const [email, setEmail] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    accountUpdates: true,
    securityAlerts: true,
    newsletters: false,
    roundUpdates: true,
    claimReminders: true,
    projectUpdates: false
  })
  const [isEditing, setIsEditing] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Simulated API call
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIsVerified(true)
      toast.success('Verification email sent! Please check your inbox.')
    } catch (error) {
      toast.error('Failed to update email settings.')
    }
  }

  const handlePreferenceChange = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
    toast.success('Preference updated successfully!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Email Notifications</h2>
          <p className="text-gray-600 mt-1">
            Manage your email preferences and notification settings
          </p>
        </div>
        <Bell className="h-6 w-6 text-purple-600" />
      </div>

      {!isEditing ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium">{email || 'No email set'}</p>
                <p className="text-sm text-gray-500">
                  {isVerified ? 'Verified' : 'Not verified'}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              {email ? 'Change' : 'Add Email'}
            </motion.button>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">
              Active Notifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(preferences).map(([key, value]) => (
                <div
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    value ? 'bg-purple-50' : 'bg-gray-50'
                  }`}
                >
                  <span className="text-sm font-medium">
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, (str) => str.toUpperCase())}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={() =>
                        handlePreferenceChange(
                          key as keyof NotificationPreferences
                        )
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                placeholder="Enter your email"
                required
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <AlertCircle className="h-4 w-4" />
            <span>You will need to verify your email after saving changes</span>
          </div>

          <div className="flex space-x-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Save Changes
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </motion.button>
          </div>
        </form>
      )}

      {isVerified && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-green-50 rounded-lg flex items-center space-x-3"
        >
          <Check className="h-5 w-5 text-green-500" />
          <span className="text-green-700">Email verified successfully!</span>
        </motion.div>
      )}
    </motion.div>
  )
}
