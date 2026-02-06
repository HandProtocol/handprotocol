import React from 'react'
import { motion } from 'framer-motion'
import { Bell, Check, AlertCircle, Info, CheckCircle } from 'lucide-react'
import { DUMMY_NOTIFICATIONS } from '../../types/notifications'

export function Notifications() {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <Bell className="h-8 w-8 text-purple-600" />
        <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
      </div>

      <div className="space-y-4">
        {DUMMY_NOTIFICATIONS.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-lg shadow-md p-4 ${
              !notification.read ? 'border-l-4 border-purple-600' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                {getIcon(notification.type)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{notification.title}</h3>
                  {notification.read && (
                    <Check className="h-4 w-4 text-gray-400" />
                  )}
                </div>
                <p className="text-gray-600 mt-1">{notification.message}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {new Date(notification.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
