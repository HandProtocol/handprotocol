import React, { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowUpRight, ChevronUp } from 'lucide-react'

export interface MenuItemProps {
  name: string
  link?: string
  target?: '_self' | '_blank' | '_parent' | '_top'
  subItems?: MenuItemProps[]
}
const MenuItem = ({ item }: { item: MenuItemProps }) => {
  const [isOpen, setIsOpen] = useState(false)

  const variants = {
    open: { opacity: 1, y: 0, display: 'block' },
    closed: { opacity: 0, y: 20, transitionEnd: { display: 'none' } }
  }

  const iconVariants = {
    hidden: { opacity: 0, x: -5, y: 5 },
    visible: { opacity: 1, x: 0, y: 0 }
  }

  const chevronVariants = {
    up: { rotate: 0 },
    down: { rotate: 180 }
  }

  return (
    <div
      className="relative shrink-0 text-lg text-s-text flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {item.link ? (
        <Link
          className="text-s-text shrink-0 no-underline flex items-center"
          href={item.link}
          target={item.target}
        >
          <motion.div
            className="mr-1"
            animate={
              isOpen ? { color: 'var(--p-text)' } : { color: 'var(--s-text)' }
            }
            transition={{ duration: 0.3 }}
          >
            {item.name}
          </motion.div>
          {item.target === '_blank' && (
            <motion.div
              initial="hidden"
              animate={isOpen ? 'visible' : 'hidden'}
              variants={iconVariants}
              transition={{ duration: 0.3 }}
            >
              <ArrowUpRight size={16} />
            </motion.div>
          )}
        </Link>
      ) : (
        <span className="flex items-center">
          <motion.span
            className="mr-1"
            animate={
              isOpen ? { color: 'var(--p-text)' } : { color: 'var(--s-text)' }
            }
          >
            {item.name}
          </motion.span>
          {item.subItems && (
            <motion.div
              initial="up"
              animate={isOpen ? 'up' : 'down'}
              variants={chevronVariants}
              transition={{ duration: 0.3 }}
            >
              <ChevronUp size={16} />
            </motion.div>
          )}
        </span>
      )}
      {item.subItems && (
        <motion.div
          className="absolute left-0 top-4 mt-2.5 bg-s-bg shadow-lg p-4 pr-8 w-28  space-y-4 rounded-xl"
          initial="closed"
          animate={isOpen ? 'open' : 'closed'}
          variants={variants}
        >
          {item.subItems.map((subItem, index) => (
            <MenuItem key={index} item={subItem} />
          ))}
        </motion.div>
      )}
    </div>
  )
}

export default MenuItem
