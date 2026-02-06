'use client'

import React from 'react'

import '@rainbow-me/rainbowkit/styles.css'

import {
  darkTheme,
  getDefaultConfig,
  lightTheme,
  RainbowKitProvider
} from '@rainbow-me/rainbowkit'
import { WagmiProvider, http } from 'wagmi'
import { celoAlfajores, celo } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { APP_NAME, CHAIN_NETWORK } from '../../utils/config'
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  trustWallet,
  walletConnectWallet,
  zerionWallet
} from '@rainbow-me/rainbowkit/wallets'
import { useTheme } from './TailwindThemeProvider'

const defaultChains = CHAIN_NETWORK === 'celo' ? [celo] : [celoAlfajores]

const defaultTransports =
  CHAIN_NETWORK === 'celo'
    ? {
        [celo.id]: http()
      }
    : {
        [celoAlfajores.id]: http()
      }

const config = getDefaultConfig({
  appName: APP_NAME,
  projectId: String(process.env.NEXT_PUBLIC_RAINBOW_KIT_PROJECT_ID),
  // @ts-ignore
  chains: defaultChains,
  // @ts-ignore
  transports: defaultTransports,
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
  ssr: true
})

const queryClient = new QueryClient()

const RainbowKitWrapper = ({ children }: { children: React.ReactNode }) => {
  const { theme } = useTheme()
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          appInfo={{
            appName: APP_NAME
          }}
          modalSize="compact"
          // theme={theme === 'dark' ? darkTheme() : lightTheme()}
          theme={lightTheme()}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}

export default RainbowKitWrapper
