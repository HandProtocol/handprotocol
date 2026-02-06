'use client'
import React from 'react'
import { APP_NAME, SPLINE_SCENE_IFRAME_LINK } from '../../utils/config'
import { motion } from 'framer-motion'
import Link from 'next/link'
// this is a temp page to show handprotocol
const page = () => {
  return (
    <div className="w-full h-screen box-border flex flex-col justify-start space-y-10 items-center overflow-hidden no-scrollbar">
      <Link href={'/'} className="no-underline">
        <div className="start-center-row gap-x-4 sm:gap-x-4 text-p-text no-underline">
          <img
            src="/logo.png"
            className="w-12 h-12 sm:w-12 sm:h-12 rounded-full"
          />
          <div className="text-2xl sm:text-xl font-bold">{APP_NAME}</div>
        </div>
      </Link>
      <Link href={'/'} className="no-underline">
        <motion.div
          className="text-4xl text-center text-s-text px-4 sm:px-0 sm:text-6xl font-bold"
          transition={{ duration: 0.3, type: 'spring' }}
          initial={{ opacity: 0, x: -20, scale: 1.5 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
        >
          Empowering Public Goods Projects
        </motion.div>
      </Link>

      <div className="-translate-y-20 -translate-x-6 w-[calc(100vh+20px)] sm:w-2/3 h-[500px] sm:h-full sm:-mr-20">
        <div className="absolute bg-p-bg w-full h-14 sm:h-24 bottom-0 left-0 right-0 z-10" />
        <iframe
          src={SPLINE_SCENE_IFRAME_LINK}
          style={{
            border: 'none'
          }}
          width="100%"
          height="100%"
        ></iframe>
      </div>
    </div>
  )
}

export default page
