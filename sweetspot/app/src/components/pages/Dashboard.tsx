import React, { useState } from 'react'
import { RoundInfo } from '../dashboard/RoundInfo'
import { TokenBalance } from '../dashboard/TokenBalance'
// import { EmailNotifications } from '../dashboard/EmailNotifications'
// import { ImpactScoop } from '../dashboard/ImpactScoop'
import { ApplicationModal } from '../dashboard/ApplicationModal'
import { motion } from 'framer-motion'
import { Candy } from 'lucide-react'
// import toast from 'react-hot-toast'
// import { MOCK_DASHBOARD_DATA } from '../../types/dashboard'
import { useRouter } from 'next/navigation'
import ModalWrapper from '../common/ModalWrapper'
import { Deposit } from './Deposit'

export function Dashboard() {
  const [showApplication, setShowApplication] = useState(false)
  const { push } = useRouter()
  const [open, setOpen] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6 h-fit min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setOpen(true)}
          className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg"
        >
          <Candy className="h-5 w-5" />
          <span>Contribute</span>
        </motion.button>
      </div>

      <ModalWrapper
        onClose={() => setOpen(false)}
        onOpen={() => setOpen(true)}
        open={open}
        title="Contribute"
        Icon={<Candy className="h-5 w-5" />}
        classname="w-[600px]"
      >
        <Deposit onClose={() => setOpen(false)} />
      </ModalWrapper>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RoundInfo />
        <TokenBalance />
      </div>

      {/* todo history for this round here */}

      {/* <ImpactScoop />

      <EmailNotifications /> */}

      {/* <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Want to join Sweet Spot?</h2>
          <p className="text-gray-600 mb-6">
            Apply to become a member and participate in the governance of Sweet
            Spot
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowApplication(true)}
            className="inline-flex items-center space-x-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Candy className="h-5 w-5" />
            <span>Apply for Sweet Spot</span>
          </motion.button>
        </div>
      </div> */}

      <ApplicationModal
        isOpen={showApplication}
        onClose={() => setShowApplication(false)}
      />
    </div>
  )
}
