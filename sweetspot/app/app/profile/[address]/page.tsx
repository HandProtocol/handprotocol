import React from 'react'
import { UserProfile } from '../../../src/components/pages/UserProfile'
import { Address } from 'viem'

const page = async ({ params }: { params: Promise<{ address: Address }> }) => {
  const address = (await params).address
  return <UserProfile address={address} />
}

export default page
