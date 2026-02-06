import React from 'react'
import { Address } from 'viem'
import { formatAddress } from '../../utils/formatters'
import useEns from '../../hooks/useEns'

interface EnsNameProps extends React.HTMLAttributes<HTMLDivElement> {
  address: Address
}

const EnsName: React.FC<EnsNameProps> = ({ address, ...props }) => {
  const { ensName } = useEns({
    address
  })
  return <div {...props}>{ensName ? ensName : formatAddress(address)}</div>
}

export default EnsName
