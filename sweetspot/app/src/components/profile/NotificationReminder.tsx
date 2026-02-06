import React from 'react'
import { motion } from 'framer-motion'
import { Bell, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface NotificationReminderProps {
  hasEmail: boolean
  isVerified: boolean
  activeNotifications: string[]
}

export function NotificationReminder({
  hasEmail,
  isVerified,
  activeNotifications
}: NotificationReminderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Bell className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Notification Settings</h2>
        </div>
        <Link
          href="/notifications"
          className="text-purple-600 no-underline hover:text-purple-700 flex items-center space-x-2"
        >
          <span>Manage Settings</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-gray-700">Email Status</span>
          <span
            className={`px-2 py-1 rounded-full text-sm ${
              !hasEmail
                ? 'bg-red-100 text-red-800'
                : isVerified
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {!hasEmail
              ? 'Not Set'
              : isVerified
                ? 'Verified'
                : 'Pending Verification'}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Active Notifications
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeNotifications.map((notification) => (
              <span
                key={notification}
                className="px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded-full"
              >
                {notification}
              </span>
            ))}
          </div>
        </div>

        {(!hasEmail || !isVerified) && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <p className="text-yellow-800 text-sm">
              {!hasEmail
                ? 'Add your email to receive important notifications'
                : 'Please verify your email to enable notifications'}
            </p>
            <Link
              href="/notifications"
              className="text-purple-600 no-underline hover:text-purple-700 text-sm font-medium inline-flex items-center space-x-1 mt-2"
            >
              <span>Set up notifications</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </motion.div>
  )
}
