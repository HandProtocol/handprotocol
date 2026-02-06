import { delay, useInView } from 'framer-motion'
import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { DEVOUCH_LINK } from '../../../utils/config'
import clsx from 'clsx'
import { ArrowUpRight } from 'lucide-react'

const EcosystemSection = () => {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: false,
    margin: '0px 100px -50px 0px'
  })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.3
      }
    }
  }

  return (
    <div
      ref={ref}
      className="w-full my-28 box-border p-4 sm:p-14 start-center-col"
    >
      <div className="text-4xl sm:text-3xl font-bold text-p-text mb-1 sm:mb-2">
        In the Spotlight
      </div>
      <div className="text-s-text text-base sm:text-lg mb-6 sm:mb-12">
        Highlighted by Trusted Communities
      </div>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        className=" start-col sm:center-row gap-6 sm:gap-8"
      >
        {/* top vouched project on devouch */}
        <motion.a
          target="_blank"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={clsx(
            'bg-[#D6D8FE] no-underline  sm:w-[300px] text-[#3742FA] start-col p-4 cursor-pointer sm:p-6 rounded-xl text-xl text-s-text font-bold shadow-sm hover:shadow-lg'
          )}
          href={DEVOUCH_LINK}
        >
          <motion.div
            variants={itemVariants}
            className="start-center-row gap-x-1"
          >
            <img
              src={'https://devouch.xyz/images/logo.svg'}
              className="w-8 sm:w-10 h-8 sm:h-10"
            />
            <img
              src={'https://devouch.xyz/images/logotype.svg'}
              className="h-8 sm:h-10"
            />

            <ArrowUpRight className="text-[#3742FA] ml-3" size={30} />
          </motion.div>
          <motion.div variants={itemVariants} className="mt-3 text-[#3742FA]">
            <span>Highly Ranked Project on Devouch</span>
          </motion.div>
        </motion.a>
        <motion.a
          target="_blank"
          variants={itemVariants}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={clsx(
            'bg-[#1f009e] no-underline  sm:w-[300px] text-white start-col p-4 cursor-pointer sm:p-6 rounded-xl text-xl text-s-text font-bold shadow-sm hover:shadow-lg'
          )}
        >
          <motion.div
            variants={itemVariants}
            className="start-center-row gap-x-1"
          >
            <img src={'/images/tokensmart_logo.png'} className="h-14 sm:h-16" />
          </motion.div>
          <motion.div variants={itemVariants} className="mt-3 text-white">
            <span>Featured on TokenSmart</span>
          </motion.div>
        </motion.a>
      </motion.div>
    </div>
  )
}

export default EcosystemSection
