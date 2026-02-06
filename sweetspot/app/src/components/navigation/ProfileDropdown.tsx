import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { User, Settings, LogOut, Heart, Star } from 'lucide-react'
import Link from 'next/link'
import { formatAddress } from '../../utils/formatters'
import { Address } from 'viem'
import { UserAvatar } from '../UserAvatar'
import { useDisconnect } from 'wagmi'

interface ProfileDropdownProps {
  isOpen: boolean
  onClose: () => void
  address: Address
}

export function ProfileDropdown({
  isOpen,
  onClose,
  address
}: ProfileDropdownProps) {
  const { disconnect } = useDisconnect()
  const menuItems = [
    { icon: User, label: 'Profile', path: `/profile/${address}` }
    // { icon: Settings, label: 'Settings', path: '/settings' },
    // { icon: Heart, label: 'Favorites', path: '/favorites' },
    // { icon: Star, label: 'Achievements', path: '/achievements' }
  ]

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-full">
                <UserAvatar address={address} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {formatAddress(address)}
                </h3>
                {/* <p className="text-sm text-gray-600">Cookie Holder</p> */}
              </div>
            </div>
          </div>

          <div className="py-2">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                onClick={onClose}
                className="flex no-underline items-center space-x-3 px-4 py-3 hover:bg-purple-50 transition-colors"
              >
                <item.icon className="h-5 w-5 text-gray-500" />
                <span className="text-gray-700">{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => {
                disconnect()
                onClose()
              }}
              className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-red-50 transition-colors text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
