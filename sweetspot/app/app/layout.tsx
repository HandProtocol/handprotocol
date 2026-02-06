import './globals.css'
import type { Metadata } from 'next'
import Wrappers from '../src/components/wrappers/Wrappers'

declare global {
  interface Navigator {
    standalone?: boolean
  }
}

export const metadata: Metadata = {
  manifest: '/manifest.json', // we are accessing our manifest file here
  title: 'SweetSpot',
  description: 'Earn and use tokens to support impactful projects'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Wrappers>{children}</Wrappers>
      </body>
    </html>
  )
}
