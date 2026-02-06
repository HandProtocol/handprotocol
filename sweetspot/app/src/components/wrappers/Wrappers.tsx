'use client'
import React from 'react'
import RainbowKitWrapper from './RainbowKitWrapper'
import UILayout from './UILayout'
import MuiThemeWrapper from './MuiThemeWrapper'
import ThemeProvider from './TailwindThemeProvider'
import { Toaster } from 'react-hot-toast'
import { NavigationProvider } from '../../contexts/NavigationContext'
import ApolloWrapper from './ApolloWrapper'

const Wrappers = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <MuiThemeWrapper>
        <ApolloWrapper>
          <NavigationProvider>
            <RainbowKitWrapper>
              <Toaster position={'top-center'} />
              <UILayout>{children}</UILayout>
            </RainbowKitWrapper>
          </NavigationProvider>
        </ApolloWrapper>
      </MuiThemeWrapper>
    </ThemeProvider>
  )
}

export default Wrappers
