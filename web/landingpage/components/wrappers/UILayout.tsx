import clsx from 'clsx'
import React, { useEffect } from 'react'
import { Inter } from 'next/font/google'
import TopHeader from '@/components/pages/all/TopHeader'
import '@fontsource/roboto/300.css'
import '@fontsource/roboto/400.css'
import '@fontsource/roboto/500.css'
import '@fontsource/roboto/700.css'
import useIsMobile from '../../utils/hooks/useIsMobile'
import { usePathname, useRouter } from 'next/navigation'

interface Props {
  // Define any props that the component will accept
  children: React.ReactNode
}

const inter = Inter({ subsets: ['latin'] })

const UILayout: React.FC<Props> = (props) => {
  // Define the component's logic and rendering here
  const [isLoading, setIsLoading] = React.useState(true)
  const isMobile = useIsMobile()
  const path = usePathname()

  useEffect(() => {
    setIsLoading(false)
  }, [isMobile])

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }
  return (
    <div className={clsx(inter.className, 'relative z-10 text-p-text bg-p-bg')}>
      <div
        id="MasterParentPage"
        className="flex h-full w-full pt-14 sm:pt-20 overflow-y-auto overflow-x-hidden"
      >
        {props.children}
      </div>
      {path !== '/iframe' && (
        <div className="w-full fixed z-20 left-0 right-0 top-0">
          <TopHeader />
        </div>
      )}
    </div>
  )
}

export default UILayout
