import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { SUPPORTED_TOKENS } from '../../types/tokens'

interface AddUserFormProps {
  onClose: () => void
  onAdd: (userData: {
    name: string
    address: string
    token: string
    amount: string
  }) => void
}

export function AddUserForm({ onClose, onAdd }: AddUserFormProps) {
  const [userData, setUserData] = useState({
    name: '',
    address: '',
    token: SUPPORTED_TOKENS[0].symbol,
    amount: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!userData.address.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Please enter a valid Ethereum address')
      return
    }

    onAdd(userData)
    toast.success('User added successfully!')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <UserPlus className="h-6 w-6 text-purple-600" />
          <h2 className="text-xl font-bold">Add New User</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Name
            </label>
            <input
              type="text"
              value={userData.name}
              onChange={(e) =>
                setUserData({ ...userData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="Enter user name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wallet Address
            </label>
            <input
              type="text"
              value={userData.address}
              onChange={(e) =>
                setUserData({ ...userData, address: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="0x..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Token
            </label>
            <select
              value={userData.token}
              onChange={(e) =>
                setUserData({ ...userData, token: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
            >
              {SUPPORTED_TOKENS.map((token) => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol} - {token.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Initial Allocation Amount
            </label>
            <input
              type="number"
              value={userData.amount}
              onChange={(e) =>
                setUserData({ ...userData, amount: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="Enter amount"
              min="0"
              step="0.000001"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Add User
          </motion.button>
        </form>
      </div>
    </motion.div>
  )
}
