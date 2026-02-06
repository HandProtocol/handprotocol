'use client'

import React from 'react'
import { Deposit } from '../../src/components/pages/Deposit'

const page = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Deposit />
      </div>
    </div>
  )
}

export default page
