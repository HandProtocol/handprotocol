'use client'
import React from 'react'

import { Navigation } from '../Navigation'

interface Props {
  // Define any props that the component will accept
  children: React.ReactNode
}

const UILayout: React.FC<Props> = (props) => {
  return (
    <div className="h-full text-black bg-white">
      <Navigation />
      <div className="pt-16">{props.children}</div>
    </div>
  )
}

export default UILayout
