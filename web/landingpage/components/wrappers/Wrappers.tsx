'use client'
import React from 'react'
import RainbowKitWrapper from './RainbowKitWrapper'
import UILayout from './UILayout'
import ThemeProvider from './TailwindThemeProvider'
import { Toaster } from 'react-hot-toast'

const Wrappers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <RainbowKitWrapper>
        <Toaster position={'top-center'} />
        <UILayout>{children}</UILayout>
      </RainbowKitWrapper>
    </ThemeProvider>
  )
}

export default Wrappers
