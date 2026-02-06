'use client'

import React from 'react'

import '@rainbow-me/rainbowkit/styles.css'

import {
  darkTheme,
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider
} from '@rainbow-me/rainbowkit'
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet
} from '@rainbow-me/rainbowkit/wallets'

import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, optimism, arbitrum, base, zora } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { APP_NAME } from '../../utils/config'
import { useTheme } from './TailwindThemeProvider'

const config = getDefaultConfig({
  appName: APP_NAME,
  projectId: process.env.NEXT_PUBLIC_RAINBOW_KIT_PROJECT_ID!,
  chains: [mainnet, polygon, optimism, arbitrum, base, zora],
  wallets: [
    {
      groupName: 'Installed',
      wallets: [injectedWallet]
    },
    {
      groupName: 'Popular',
      wallets: [
        metaMaskWallet,
        walletConnectWallet,
        zerionWallet,
        coinbaseWallet,
        trustWallet
      ]
    }
  ],
  ssr: true // If your dApp uses server side rendering (SSR)
})

const queryClient = new QueryClient()

const RainbowKitWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme()
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          showRecentTransactions
          appInfo={{
            appName: APP_NAME
          }}
          modalSize="compact"
          theme={theme === 'dark' ? darkTheme() : lightTheme()}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default RainbowKitWrapper
