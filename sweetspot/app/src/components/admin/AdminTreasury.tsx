import React from 'react'
import { AdminWithdraw } from './AdminWithdraw'
import { AdminStats } from './AdminStats'
import { Deposit } from '../pages/Deposit'

export function AdminTreasury() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <AdminStats />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Deposit />
        <AdminWithdraw />
      </div>
    </div>
  )
}
