import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import getStampFyiURL from '../utils/getStampFyiURL'
import clsx from 'clsx'

interface UserAvatarProps {
  address: string
  size?: 'sm' | 'md' | 'lg'
}

const glowAnimation = {
  initial: {
    filter: 'drop-shadow(0 0 0px rgba(147, 51, 234, 0))',
    scale: 1
  },
  hover: {
    filter: 'drop-shadow(0 0 8px rgba(147, 51, 234, 0.5))',
    scale: 1.05,
    transition: {
      duration: 0.2
    }
  }
}

export function UserAvatar({ address, size = 'md' }: UserAvatarProps) {
  const [imageLoading, setImageLoading] = useState(true)

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  }

  const avatarContainerClasses = clsx(
    sizeClasses[size],
    'bg-gradient-to-r from-purple-100 to-purple-200',
    'rounded-full',
    'flex items-center justify-center',
    'cursor-pointer',
    'transition-shadow duration-300',
    'hover:shadow-lg hover:shadow-purple-200/50',
    'relative',
    'overflow-hidden'
  )

  const imageClasses = clsx(
    sizeClasses[size], // Use the same size as container
    'rounded-full', // Make image rounded
    'object-cover', // Ensure image covers the full area
    'w-full h-full', // Fill the container completely
    'text-purple-600',
    'transition-opacity duration-300',
    {
      'opacity-0': imageLoading,
      'opacity-100': !imageLoading
    }
  )

  return (
    <Link href={`/profile/${address}`} className="no-underline">
      <motion.div
        initial="initial"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={avatarContainerClasses}
      >
        {imageLoading && (
          <div className="absolute inset-0 animate-pulse bg-purple-100 rounded-full" />
        )}
        <img
          src={getStampFyiURL(address)}
          onLoad={() => setImageLoading(false)}
          className={imageClasses}
          alt={`Avatar for ${address}`}
        />
      </motion.div>
    </Link>
  )
}
