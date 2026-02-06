import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Candy,
  Home,
  LayoutDashboard,
  Settings,
  Globe2,
  User,
  Menu,
  X,
  Bell,
  Github,
  Globe
} from 'lucide-react'
import { NotificationDropdown } from './navigation/NotificationDropdown'
import { ProfileDropdown } from './navigation/ProfileDropdown'
import { useScrollDirection } from '../hooks/useScrollDirection'
import { useClickOutside } from '../hooks/useClickOutside'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAdminQuery } from '../graphql/generated'
import { GITHUB_LINK, ORG_LINK } from '../utils/config'

export function Navigation() {
  const { address } = useAccount()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const { isVisible } = useScrollDirection()
  const { data: adminData } = useAdminQuery({
    variables: {
      address: address?.toLowerCase()!
    },
    skip: !address
  })

  const isAdmin = adminData?.admin?.id

  const notificationRef = React.useRef(null)
  const profileRef = React.useRef(null)

  useClickOutside(notificationRef, () => setShowNotifications(false))
  useClickOutside(profileRef, () => setShowProfile(false))

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <motion.nav
      className="bg-white shadow-lg fixed top-0 left-0 right-0 z-50"
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : '-100%' }}
      transition={{ duration: 0.3 }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-x-4">
            <Link href="/" className="flex items-center gap-x-2 no-underline">
              <Candy className="h-8 w-8 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">
                Sweet Spot
              </span>
            </Link>

            <Link
              href={ORG_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-x-1 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <Globe className="h-5 w-5" />
              <span className="text-sm font-medium">Org</span>
            </Link>

            <Link
              href={GITHUB_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-x-1 text-gray-600 hover:text-purple-600 transition-colors"
            >
              <Github className="h-5 w-5" />
              <span className="text-sm font-medium">GitHub</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            <NavLink to="/" icon={<Home className="h-5 w-5" />} text="Home" />

            <NavLink
              to="/sweetverse"
              icon={<Globe2 className="h-5 w-5" />}
              text="Sweet Verse"
            />

            <NavLink
              to="/dashboard"
              icon={<LayoutDashboard className="h-5 w-5" />}
              text="Dashboard"
            />
            {isAdmin && (
              <NavLink
                to="/admin"
                icon={<Settings className="h-5 w-5" />}
                text="Admin"
              />
            )}
            {address && (
              <div className="flex items-center space-x-2 ml-4">
                {/* <div className="relative" ref={notificationRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-600 hover:text-purple-600 transition-colors relative bg-transparent border-none"
                >
                  <Bell className="h-6 w-6" />
                  <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    3
                  </span>
                </motion.button>
                <NotificationDropdown
                  isOpen={showNotifications}
                  onClose={() => setShowNotifications(false)}
                />
              </div> */}

                <div className="relative" ref={profileRef}>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowProfile(!showProfile)}
                    className="p-2 text-gray-600 hover:text-purple-600 transition-colors bg-transparent border-none"
                  >
                    <User className="h-6 w-6" />
                  </motion.button>
                  <ProfileDropdown
                    isOpen={showProfile}
                    onClose={() => setShowProfile(false)}
                    address={address}
                  />
                </div>
              </div>
            )}

            <ConnectButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <div className="relative" ref={notificationRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:text-purple-600 transition-colors relative"
              >
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 h-4 w-4 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                  3
                </span>
              </motion.button>
              <NotificationDropdown
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>

            {address && (
              <div className="relative" ref={profileRef}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowProfile(!showProfile)}
                  className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
                >
                  <User className="h-6 w-6" />
                </motion.button>
                <ProfileDropdown
                  isOpen={showProfile}
                  onClose={() => setShowProfile(false)}
                  address={address}
                />
              </div>
            )}

            <button
              onClick={toggleMenu}
              className="p-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="container mx-auto px-4 py-4 space-y-4">
              <MobileNavLink
                to="/"
                icon={<Home className="h-5 w-5" />}
                text="Home"
                onClick={toggleMenu}
              />
              <MobileNavLink
                to="/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                text="Dashboard"
                onClick={toggleMenu}
              />
              <MobileNavLink
                to="/sweetverse"
                icon={<Globe2 className="h-5 w-5" />}
                text="Sweet Verse"
                onClick={toggleMenu}
              />
              <MobileNavLink
                to="/admin"
                icon={<Settings className="h-5 w-5" />}
                text="Admin"
                onClick={toggleMenu}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center"
              >
                {address
                  ? `${address.slice(0, 6)}...${address.slice(-4)}`
                  : 'Connect Wallet'}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

function NavLink({
  to,
  icon,
  text
}: {
  to: string
  icon: React.ReactNode
  text: string
}) {
  return (
    <Link
      href={to}
      className="flex items-center space-x-1 no-underline text-gray-600 hover:text-purple-600 transition-colors"
    >
      {icon}
      <span className="text-sm font-medium">{text}</span>
    </Link>
  )
}

function MobileNavLink({
  to,
  icon,
  text,
  onClick
}: {
  to: string
  icon: React.ReactNode
  text: string
  onClick: () => void
}) {
  return (
    <Link
      href={to}
      onClick={onClick}
      className="flex items-center space-x-3 text-gray-600 no-underline hover:text-purple-600 transition-colors p-2 rounded-lg hover:bg-purple-50"
    >
      {icon}
      <span className="text-base font-medium">{text}</span>
    </Link>
  )
}
