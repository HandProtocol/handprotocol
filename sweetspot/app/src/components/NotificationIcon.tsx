import React, { useState, useRef } from 'react'
import { Bell } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { DUMMY_NOTIFICATIONS } from '../types/notifications'
import { useClickOutside } from '../hooks/useClickOutside'
import Link from 'next/link'

export function NotificationIcon() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const unreadCount = DUMMY_NOTIFICATIONS.filter((n) => !n.read).length

  useClickOutside(dropdownRef, () => {
    if (isOpen) setIsOpen(false)
  })

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 text-gray-600 hover:text-purple-600 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3, bounce: 0.2 }}
            className="absolute right-0 mt-4 w-80 backdrop-blur-sm bg-white/90 rounded-xl shadow-2xl z-50 border border-gray-100/50 overflow-hidden"
            style={{
              boxShadow:
                '0 4px 24px -4px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              transformOrigin: 'top right'
            }}
          >
            <div className="p-4 backdrop-blur-sm bg-white/50 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                <Link
                  href="/notifications"
                  className="text-sm no-underline text-purple-600 hover:text-purple-700 font-medium"
                  onClick={() => setIsOpen(false)}
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="max-h-[calc(100vh-12rem)] overflow-y-auto">
              {DUMMY_NOTIFICATIONS.slice(0, 5).map((notification, index) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 border-b border-gray-100/50 hover:bg-purple-50/50 transition-colors ${
                    !notification.read ? 'bg-purple-50/50' : ''
                  }`}
                >
                  <h4 className="font-medium text-sm text-gray-900">
                    {notification.title}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </motion.div>
              ))}
            </div>
            {DUMMY_NOTIFICATIONS.length === 0 && (
              <div className="p-4 text-center text-gray-500">
                No notifications
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
