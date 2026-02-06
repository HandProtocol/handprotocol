import { ChevronUp } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import clsx from 'clsx'
import { DISCORD_INVITE_LINK } from '../../../utils/config'
export const FaqData = [
  {
    q: 'How can I get involved with Hand Protocol?',
    a: `To get involved, you can join our Discord community where we coordinate efforts, discuss ideas, and work on projects. Whether you're looking to donate, collaborate, or simply learn more, everyone is welcome! Join us`
  },
  {
    q: 'What is Hand Protocol’s mission?',
    a: 'Our mission is to make a tangible impact on the world through innovative, transparent crypto-driven projects. We support initiatives like bloomerstv, the Music Onboarding Machine, and the Lost Children of Benin City, with a holistic approach to empowering communities and causes.'
  },
  {
    q: `How can I donate to Hand Protocol's projects?`,
    a: 'You can donate directly to any of our featured projects through our platform or by using Glo Dollar, which also gives you $NICE tokens that can be redeemed for swag at events. Donations help us support key initiatives, from education and infrastructure to music and culture.'
  },
  {
    q: 'Are there ways to contribute other than donating?',
    a: 'Absolutely! Besides donations, you can contribute by spreading the word on social media, participating in our community discussions, or helping with specific project needs. Join our Discord to see the latest opportunities and become part of the solution.'
  }
]

const FaqSection: React.FC = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

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
    <div className="p-4 my-12 sm:p-14 box-border w-full center text-center">
      <div className="w-full sm:w-[600px] " ref={ref}>
        <div className="text-3xl sm:text-4xl font-bold text-p-text mb-4">
          Frequently Asked Questions
        </div>
        <div className="text-s-text text-base sm:text-lg mb-4 sm:mb-8">
          Please feel free to ask us on Discord if you have any other questions.
        </div>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
          className="w-full rounded-xl box-border"
        >
          {FaqData.map((faq, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={clsx(
                'mb-2 cursor-pointer sm:mb-3 bg-s-bg p-4 rounded-xl text-start',
                expandedIndex === index ? 'shadow-md' : 'shadow-sm'
              )}
            >
              <div
                onClick={() => toggleExpand(index)}
                className="w-full between-row gap-x-2 text-left"
              >
                <span className="text-lg sm:text-xl font-semibold">
                  {faq.q}
                </span>
                <motion.div
                  initial={{ rotate: 0 }}
                  animate={
                    expandedIndex === index ? { rotate: 180 } : { rotate: 0 }
                  }
                  transition={{ duration: 0.3 }}
                >
                  <ChevronUp className="w-5 h-5" />
                </motion.div>
              </div>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={
                  expandedIndex === index
                    ? { height: 'auto', opacity: 1 }
                    : { height: 0, opacity: 0 }
                }
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden text-s-text  font-semibold text-sm sm:text-base"
              >
                <div className="mt-1 sm:mt-2">
                  {faq.a}{' '}
                  {index === 0 && (
                    <span>
                      <a
                        className="font-semibold text-p-text"
                        href={DISCORD_INVITE_LINK}
                        target="_blank"
                      >
                        here
                      </a>
                    </span>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}

export default FaqSection
