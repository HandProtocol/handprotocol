import './globals.css'
import type { Metadata } from 'next'
import Wrappers from '../components/wrappers/Wrappers'

declare global {
  interface Navigator {
    standalone?: boolean
  }
}

export const metadata: Metadata = {
  manifest: '/manifest.json', // we are accessing our manifest file here
  title: 'Hand Protocol',
  description: 'Supporting Public Goods Projects'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://www.googletagmanager.com/gtag/js?id=G-QDSF4BLDMF"
        ></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());

      gtag('config', 'G-QDSF4BLDMF');
    `
          }}
        />
      </head>
      <body>
        <Wrappers>{children}</Wrappers>
      </body>
    </html>
  )
}
