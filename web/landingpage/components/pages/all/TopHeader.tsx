'use client'
import React, { useEffect, useState } from 'react'
import { ConnectButton, useConnectModal } from '@rainbow-me/rainbowkit'
import {
  APP_NAME,
  BLOOMERSTV_LINK,
  DEVOUCH_LINK,
  DIGITAL_STREET_MUSIC_LINK,
  DISCORD_INVITE_LINK,
  DOCUMENTARY_HUMAN_RIGHTS_LINK,
  GITHUB_LINK,
  GIVETH_LINK,
  INIT_PROJECTS,
  LENS_LINK,
  MIRROR_LINK,
  VIDA_VERDE_LINK,
  X_LINK
} from '@/utils/config'
import Link from 'next/link'
import { motion } from 'framer-motion'
import useIsMobile from '../../../utils/hooks/useIsMobile'
import MenuItem, { MenuItemProps } from './MenuItem'
import { useTheme } from '../../wrappers/TailwindThemeProvider'
import { Sun, Moon, Menu, Wallet } from 'lucide-react'
import Drawer from '@mui/joy/Drawer'
import { useAccount } from 'wagmi'

export const menuItems: MenuItemProps[] = [
  {
    name: 'Raise',
    link: '/raise',
    target: '_self'
  },
  {
    name: 'Team',
    link: '/',
    target: '_self'
  },
  {
    name: 'Impact',
    link: '/',
    target: '_self'
  },
  {
    name: 'Docs',
    link: '/',
    target: '_self'
  },
  {
    name: 'Community',
    subItems: [
      {
        name: 'Lens',
        link: LENS_LINK,
        target: '_blank'
      },
      {
        name: 'Discord',
        link: DISCORD_INVITE_LINK,
        target: '_blank'
      },
      {
        name: 'Github',
        link: GITHUB_LINK,
        target: '_blank'
      },
      {
        name: 'X',
        link: X_LINK,
        target: '_blank'
      },
      {
        name: 'Mirror',
        link: MIRROR_LINK,
        target: '_blank'
      },
      {
        name: 'Giveth',
        link: GIVETH_LINK,
        target: '_blank'
      },
      {
        name: 'Devouch',
        link: DEVOUCH_LINK,
        target: '_blank'
      }
    ]
  },
  {
    name: 'Projects',
    subItems: [
      {
        name: 'Human Rights',
        link: DOCUMENTARY_HUMAN_RIGHTS_LINK,
        target: '_blank'
      },
      {
        name: 'Healing Music',
        link: DIGITAL_STREET_MUSIC_LINK,
        target: '_blank'
      },

      {
        name: 'BloomersTV',
        link: BLOOMERSTV_LINK,
        target: '_blank'
      },
      {
        name: 'Vida Verde',
        link: VIDA_VERDE_LINK,
        target: '_blank'
      }
    ]
  }
]
const TopHeader = () => {
  const [scrollY, setScrollY] = useState(0)
  const [scrollDirection, setScrollDirection] = useState('up')
  const { theme, toggleTheme } = useTheme()
  const [openMenu, setOpenMenu] = useState(false)

  const { isConnected } = useAccount()
  const { openConnectModal } = useConnectModal()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > scrollY) {
        setScrollDirection('down')
      } else {
        setScrollDirection('up')
      }
      setScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [scrollY])

  const headerVariants = {
    hidden: { y: -100, transition: { duration: 0.3 } },
    visible: { y: 0, transition: { duration: 0.3 } }
  }

  const isMobile = useIsMobile()

  // const { theme, toggleTheme } = useTheme()
  return (
    <motion.div
      className="flex h-14 sm:h-20 flex-row items-center justify-between px-3 sm:px-14 bg-p-bg backdrop-blur-md backdrop-filter"
      variants={headerVariants}
      initial="visible"
      // animate={scrollDirection === 'down' ? 'hidden' : 'visible'}
      animate={'visible'}
    >
      <div className="start-center-row gap-x-2 sm:gap-x-4 text-p-text no-underline">
        <Link href={'/'} target="_self">
          <img
            src="/logo.png"
            className="w-8 h-8 sm:w-12 sm:h-12 rounded-full"
          />
        </Link>
        <div className="text-md sm:text-xl font-bold">{APP_NAME}</div>

        {!isMobile && (
          <nav className="ml-8 start-center-row gap-x-8">
            {menuItems.map((item, index) => (
              <MenuItem key={index} item={item} />
            ))}
          </nav>
        )}
      </div>
      <div className="start-center-row sm:gap-x-4 gap-x-3">
        {(isConnected || !isMobile) && (
          <ConnectButton
            accountStatus={isMobile ? 'avatar' : 'full'}
            chainStatus={isMobile ? 'none' : 'full'}
            showBalance={!isMobile}
          />
        )}

        {isMobile && !isConnected && (
          <motion.div
            onClick={openConnectModal}
            whileTap={{
              scale: 0.8,
              opacity: 0.8
            }}
            className="rounded-full bg-transparent hover:text-p-text cursor-pointer border-none text-s-text transition-colors duration-200"
          >
            <Wallet className="w-6 h-6" />
          </motion.div>
        )}

        <motion.div
          onClick={toggleTheme}
          whileTap={{
            scale: 0.8,
            opacity: 0.8
          }}
          className="rounded-full bg-transparent hover:text-p-text cursor-pointer border-none text-s-text transition-colors duration-200"
        >
          {theme === 'light' ? (
            <Sun className="w-6 h-6 " />
          ) : (
            <Moon className="w-6 h-6 " />
          )}
        </motion.div>

        {isMobile && (
          <motion.div
            onClick={() => setOpenMenu(true)}
            whileTap={{
              scale: 0.8,
              opacity: 0.8
            }}
            className="rounded-full bg-transparent hover:text-p-text cursor-pointer border-none text-s-text transition-colors duration-200"
          >
            <Menu className="w-6 h-6" />
          </motion.div>
        )}

        <Drawer
          anchor="right"
          draggable={true}
          size="sm"
          variant="soft"
          open={openMenu}
          onClose={() => setOpenMenu(false)}
        >
          <div className="flex flex-col gap-y-4 p-4 bg-s-bg w-full box-border h-full">
            {menuItems.map((item, index) => {
              if (!item?.subItems) return null
              return (
                <div
                  key={index}
                  className="flex sm:flex-row flex-col gap-2 sm:gap-8"
                >
                  <div className="text-lg font-bold text-p-text">
                    {item.name}
                  </div>
                  <div className="flex flex-col gap-y-2">
                    {item.subItems.map((subItem, index) => (
                      <MenuItem key={index} item={subItem} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </Drawer>
      </div>
      {/* <button onClick={toggleTheme}>
        {theme === 'light' ? 'Dark' : 'Light'}
      </button> */}
    </motion.div>
  )
}

export default TopHeader
