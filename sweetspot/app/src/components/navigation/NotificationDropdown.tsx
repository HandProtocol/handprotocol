import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface NotificationDropdownProps {
  isOpen: boolean
  onClose: () => void
}

export function NotificationDropdown({
  isOpen,
  onClose
}: NotificationDropdownProps) {
  const notifications = [
    {
      id: 1,
      title: 'New Round Started',
      message: 'Distribution round #12 has begun',
      time: '5 min ago'
    },
    {
      id: 2,
      title: 'Tokens Claimed',
      message: 'Successfully claimed 500 COOKIE',
      time: '1 hour ago'
    },
    {
      id: 3,
      title: 'Achievement Unlocked',
      message: 'Earned "Early Adopter" badge',
      time: '2 hours ago'
    }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-gray-900">Notifications</h3>
              </div>
              <Link
                href="/notifications"
                onClick={onClose}
                className="text-sm no-underline text-purple-600 hover:text-purple-700 font-medium flex items-center"
              >
                View All
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
          </div>

          <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
            {notifications.map((notification) => (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 hover:bg-purple-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
              >
                <h4 className="font-medium text-gray-900">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  {notification.time}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
