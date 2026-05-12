'use client'

import React, { useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import clsx from 'clsx'
import {
  HandCoins,
  Copy,
  Check,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  Target,
  Users,
  Heart,
  Zap,
  Clock,
  Eye,
  Shield,
  Wrench,
  Globe,
  Sparkles,
  MapPin,
  Repeat,
  FileCheck,
  Handshake
} from 'lucide-react'
import { GIVETH_LINK, DISCORD_INVITE_LINK, X_LINK } from '../../utils/config'
import FooterSection from '../../components/pages/home/FooterSection'

/* ─── Constants ─── */

const CRYPTO_ADDRESSES = {
  evm: '0x344676c01daf3de84cf4c7b53330bbbda4b474b8',
  solana: '2xC6eZjRpq3pV6ejfXVuJAa4fus39WZhHjH54Y6xniSC',
  stellar: 'GD4HA7CJ5QCOMQL4NPKODQLEE2D7I3IRCEWGF4IAV2FLZQN5BLZW22HA'
}

const EVM_CHAINS = [
  'Ethereum',
  'Polygon',
  'Base',
  'Arbitrum',
  'Optimism',
  'Celo',
  'Gnosis',
  'Ethereum Classic'
]

const FUNDING_TIERS = [
  {
    amount: '$7,777',
    name: 'Filing Floor',
    label: 'Legal existence plus a real beginning',
    items: [
      'Federal 501(c)(3) filing fee & Texas state registration: $625',
      'Legal counsel & bylaws (basic): $2,400',
      'Domain, hosting & initial infrastructure: $1,500',
      'Initial brand identity & foundation site: $1,500',
      'Insurance setup: $500',
      'Founding administrative cushion: $1,252'
    ]
  },
  {
    amount: '$22,222',
    name: 'Operating Minimum',
    label: 'Filing + websites + 6 months of work',
    featured: true,
    items: [
      'Filing & nonprofit formation (rolls in floor tier): $7,777',
      'Ongoing legal & compliance: $2,222',
      '3 pilot Companion websites & branding: $3,333',
      'Core infrastructure, tools & insurance: $1,111',
      '6-month part-time program lead: $7,779'
    ]
  },
  {
    amount: '$77,777',
    name: 'First Goal',
    label: 'Full launch, 12 months of accompaniment',
    items: [
      '501(c)(3) filing, compliance & legal: $7,777',
      'Pilot Companion websites & ongoing support: $11,111',
      'Core infrastructure, tools & insurance: $5,555',
      '12-month part-time program lead & ops: $33,333',
      'Pilot program development & matching: $11,111',
      'AI Companion model — POC integration: $5,555',
      'Contingency & opportunity fund: $3,335'
    ]
  }
]

const CONTRIBUTION_TIERS = [
  { amount: '$77', name: 'Seed Planter', perks: ['Our gratitude', 'Name on supporter wall'] },
  { amount: '$111', name: 'Garden Tender', perks: ['Everything below', 'Quarterly impact updates'] },
  { amount: '$222', name: 'Root Builder', perks: ['Everything below', 'Early access to healer directory'] },
  { amount: '$333', name: 'Community Pillar', perks: ['Everything below', 'Virtual community gathering invite'] },
  { amount: '$555', name: 'Foundation Stone', perks: ['Everything below', 'Recognized as founding supporter'], featured: true },
  { amount: '$1,111', name: 'Architect', perks: ['Everything below', '1:1 conversation with founders'] },
  { amount: '$2,222+', name: 'Keystone', perks: ['Everything below', 'Input on pilot program priorities'] }
]

const SERVE_DATA = {
  healers: {
    title: 'Those working directly with individuals',
    description: 'Holding space for transformation, recovery, and wellbeing. They carry deep community trust but often lack structural support.',
    tags: ['Bodyworkers & Somatic Practitioners', 'Sound Healers & Breathwork', 'Plant Medicine Facilitators', 'Energy Workers & Reiki', 'Holistic Therapists', 'Doulas & Midwives', 'Meditation Guides', 'Indigenous Medicine Keepers']
  },
  entrepreneurs: {
    title: 'Builders creating healing-aligned products & communities',
    description: 'Not chasing extraction, but trying to resource and scale care. Traditional startup infrastructure doesn\'t fit their values.',
    tags: ['Herbal Medicine & Wellness Brands', 'Retreat & Event Organizers', 'Wellness Platform Creators', 'Course Creators & Educators', 'Community Spaces & Studios', 'Cooperative Ventures']
  },
  organizations: {
    title: 'Nonprofits, collectives, and grassroots groups',
    description: 'Doing community-centered work adjacent to healing. Often more established structurally but still under-resourced for sustained outreach.',
    tags: ['Harm Reduction', 'Peer Support Networks', 'Food Sovereignty', 'Land Stewardship', 'Mutual Aid Networks', 'Recovery Communities']
  }
}

/* ─── Animation Variants ─── */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

/* ─── Helpers ─── */

function AnimatedSection({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' })
  return (
    <motion.div
      ref={ref}
      variants={staggerContainer}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function CopyAddress({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="between-row bg-p-bg rounded-xl p-3 sm:p-4 gap-x-3">
      <div className="start-col gap-y-1 min-w-0">
        <span className="text-xs font-semibold text-s-text uppercase tracking-wider">{label}</span>
        <span className="text-sm font-mono text-p-text truncate">{truncated}</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={handleCopy}
        className="shrink-0 center-row gap-x-1.5 bg-s-bg border border-[var(--s-text)]/20 hover:border-[var(--p-text)]/40 text-p-text rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer transition-colors duration-200"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </motion.button>
    </div>
  )
}

/* ─── Page Component ─── */

export default function RaisePage() {
  const [activeTab, setActiveTab] = useState<'healers' | 'entrepreneurs' | 'organizations'>('healers')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  const tabs = [
    { key: 'healers' as const, label: 'Healers' },
    { key: 'entrepreneurs' as const, label: 'Entrepreneurs' },
    { key: 'organizations' as const, label: 'Organizations' }
  ]

  return (
    <div className="w-full start-col relative overflow-hidden no-scrollbar">

      {/* ─── Hero ─── */}
      <section className="w-full min-h-[85vh] sm:min-h-[90vh] center-col text-center px-4 sm:px-14 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-p-bg z-0" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 center-col gap-y-6 sm:gap-y-8 max-w-[800px]"
        >
          <div className="center-row gap-x-2 bg-s-bg px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs sm:text-sm font-semibold text-s-text">
              Operating for over a year &middot; $8,893 raised &middot; 88 contributors
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-p-text leading-tight">
            Regenerative Infrastructure{' '}
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
              for Those Who Heal,
            </span>{' '}
            Build & Serve
          </h1>

          <p className="text-s-text text-base sm:text-xl font-semibold max-w-[640px] leading-relaxed">
            We support healers, impact entrepreneurs, and community organizations with branding, marketing, and
            long-term development&mdash;without walking away once the work is done. Now we&rsquo;re becoming a nonprofit
            foundation in Austin, Texas.
          </p>

          <div className="center-row flex-wrap gap-4 mt-2">
            <motion.a
              href={GIVETH_LINK}
              target="_blank"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-p-text center-row gap-x-3 text-p-bg font-bold text-base sm:text-lg px-8 py-4 rounded-2xl no-underline cursor-pointer"
            >
              <HandCoins className="w-5 h-5" />
              Donate on Giveth
            </motion.a>
            <motion.a
              href="#funding"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-s-bg center-row gap-x-3 text-p-text font-bold text-base sm:text-lg px-8 py-4 rounded-2xl no-underline cursor-pointer"
            >
              See Funding Goals
            </motion.a>
          </div>
        </motion.div>
      </section>

      {/* ─── About ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">About the Campaign</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Support the people already doing the work.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-10">
            <motion.div variants={staggerItem} className="start-col gap-y-4">
              <p className="text-s-text text-base sm:text-lg font-semibold leading-relaxed">
                HAND Protocol&mdash;<em>Holistic Approach to Nurture & Develop</em>&mdash;has been operating for over a year, supporting impact projects, participating in quadratic funding rounds, and building transparent accountability systems.
              </p>
              <p className="text-s-text text-base font-semibold leading-relaxed">
                Now we&rsquo;re raising funds to establish a <strong className="text-p-text">tax-exempt nonprofit foundation in Austin, Texas</strong> and formalize what&rsquo;s already working.
              </p>
              <p className="text-s-text text-base font-semibold leading-relaxed">
                We focus on healers, impact entrepreneurs, and community organizations, providing branding, marketing, and one-on-one development support&mdash;<strong className="text-p-text">without abandoning anyone once a website or campaign is finished</strong>.
              </p>
            </motion.div>

            <motion.div variants={staggerItem} className="start-col gap-y-4">
              {[
                { icon: Check, title: 'Proven, Not Theoretical', text: 'Over a year of active support across sectors.' },
                { icon: Users, title: 'Long-Term Commitment', text: 'We walk alongside practitioners as they grow.' },
                { icon: Eye, title: 'Transparent by Default', text: 'Clear budgets, milestones, and deliverables.' }
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-s-bg rounded-xl p-5 start-row gap-x-4">
                  <div className="shrink-0 w-10 h-10 center bg-amber-500/10 rounded-lg">
                    <Icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="font-bold text-p-text text-sm">{title}</div>
                    <div className="text-s-text text-sm font-semibold">{text}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Problem ─── */}
      <section className="w-full box-border bg-s-bg px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">The Problem</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Transformative work, inadequate support.
            </h2>
            <p className="text-s-text text-base sm:text-lg font-semibold mt-3 max-w-[600px] mx-auto">
              Across Austin and beyond, three groups are doing vital community work with barriers that keep their impact invisible or unsustainable.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10">
            {[
              { num: '01', title: 'Healers & Practitioners', text: 'Hold space for community wellbeing but spend more time surviving than serving. Deep community trust, zero structural support.' },
              { num: '02', title: 'Impact Entrepreneurs', text: 'Building healing-aligned products and communities, but traditional startup infrastructure doesn\'t fit their values.' },
              { num: '03', title: 'Grassroots Organizations', text: 'Doing vital community work\u2014harm reduction, mutual aid, food access\u2014often more established but still under-resourced.' }
            ].map(({ num, title, text }) => (
              <motion.div key={num} variants={staggerItem} className="bg-p-bg rounded-xl p-6 start-col gap-y-3">
                <span className="text-xs font-bold text-amber-600 font-mono">{num}</span>
                <h3 className="text-lg font-bold text-p-text">{title}</h3>
                <p className="text-s-text text-sm font-semibold leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={staggerItem} className="center-col gap-y-4">
            <h3 className="text-base font-bold text-p-text">Common barriers they all face:</h3>
            <div className="center-row flex-wrap gap-2">
              {[
                'Operate informally or under-resourced',
                'Lack consistent branding & fundraising tools',
                'Offered short-term help that disappears',
                'Spend more time surviving than serving'
              ].map((barrier) => (
                <span key={barrier} className="bg-p-bg text-s-text text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full">
                  {barrier}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Solution ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Our Solution</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Regenerative support infrastructure.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <motion.div variants={staggerItem} className="start-col gap-y-5">
              {[
                { icon: Sparkles, title: 'Branding & Narrative Development', text: 'Rooted in each practitioner\'s values\u2014not cookie-cutter templates.' },
                { icon: Globe, title: 'Marketing & Outreach Systems', text: 'Systems that continue operating over time, not campaigns that expire.' },
                { icon: Users, title: 'One-on-One Development Support', text: 'Strategy, tools, and guidance tailored to where each person actually is.' },
                { icon: Zap, title: 'Automated Systems', text: 'Reduce ongoing burden. Technology serves practitioners\u2014not the other way around.' },
                { icon: Heart, title: 'Long-Term Commitment', text: 'We walk alongside practitioners as they grow, adapt, and deepen their impact.' }
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="start-row gap-x-4">
                  <div className="shrink-0 w-10 h-10 center bg-s-bg rounded-lg border border-[var(--s-text)]/10">
                    <Icon className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-p-text">{title}</h3>
                    <p className="text-s-text text-sm font-semibold">{text}</p>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div variants={staggerItem} className="start-col gap-y-4">
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 sm:p-8 text-white">
                <h3 className="text-lg font-bold mb-3">Why Healers First?</h3>
                <p className="text-gray-300 text-sm font-semibold leading-relaxed mb-3">
                  Healers sit at the intersection of community trust, cultural continuity, and collective wellbeing&mdash;yet they are often the <strong className="text-white">least supported structurally</strong>.
                </p>
                <p className="text-gray-300 text-sm font-semibold leading-relaxed">
                  Austin is our proving ground. What works here becomes a model for expansion.
                </p>
              </div>
              <div className="bg-s-bg rounded-2xl p-6 start-col gap-y-2">
                <h3 className="text-base font-bold text-p-text mb-1">What Makes Us Different</h3>
                {['Holistic, not transactional', 'Automation with care', 'Local-first proof', 'Web3-aware, not Web3-dependent', 'Transparent & accountable'].map((item) => (
                  <div key={item} className="start-center-row gap-x-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <span className="text-s-text text-sm font-semibold">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Who We Serve ─── */}
      <section className="w-full box-border bg-s-bg px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[800px] mx-auto center-col">
          <motion.div variants={staggerItem} className="text-center mb-8">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Who We Serve</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Three interconnected groups.
            </h2>
          </motion.div>

          <motion.div variants={staggerItem} className="center-row flex-wrap gap-2 mb-8">
            {tabs.map((tab) => (
              <motion.button
                key={tab.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  'px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer border-none transition-colors duration-200',
                  activeTab === tab.key
                    ? 'bg-p-text text-p-bg'
                    : 'bg-p-bg text-s-text hover:text-p-text'
                )}
              >
                {tab.label}
              </motion.button>
            ))}
          </motion.div>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full center-col text-center gap-y-5"
          >
            <h3 className="text-xl font-bold text-p-text">{SERVE_DATA[activeTab].title}</h3>
            <p className="text-s-text text-base font-semibold max-w-[500px]">{SERVE_DATA[activeTab].description}</p>
            <div className="center-row flex-wrap gap-2">
              {SERVE_DATA[activeTab].tags.map((tag) => (
                <span key={tag} className="bg-p-bg text-s-text text-xs font-semibold px-3 py-1.5 rounded-full border border-[var(--s-text)]/10">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Track Record ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Track Record</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Already operating, shipping, and learning.
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Active Impact Support', text: 'Coordinated initiatives across music onboarding, humanitarian aid, animal welfare, and community storytelling.' },
              { icon: Target, title: 'Quadratic Funding', text: 'Successfully participated in ecosystem-wide matching programs and quadratic funding rounds.' },
              { icon: Shield, title: 'Milestone Tracking', text: 'Public reporting via attestation and impact platforms. Deliverables documented, not assumed.' },
              { icon: Clock, title: 'Long-Term Stewardship', text: 'Maintained continuity with supported projects\u2014the exact long-term commitment this nonprofit formalizes.' },
              { icon: Eye, title: 'Donor Transparency', text: 'Contributions tracked and acknowledged transparently, reinforcing trust and ethical stewardship.' },
              { icon: Sparkles, title: 'Creative & Cultural Infrastructure', text: 'Supported creative practitioners and cultural projects\u2014using art, music, and storytelling to make complex systems accessible.' },
              { icon: Wrench, title: 'Tooling Prototypes', text: 'Designed and tested donation tooling, onboarding mechanisms, and impact verification flows.' }
            ].map(({ icon: Icon, title, text }) => (
              <motion.div key={title} variants={staggerItem} className="bg-s-bg rounded-xl p-5 sm:p-6 start-col gap-y-3 hover:shadow-md transition-shadow duration-200">
                <div className="w-10 h-10 center bg-amber-500/10 rounded-lg">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <h3 className="text-sm font-bold text-p-text">{title}</h3>
                <p className="text-s-text text-sm font-semibold leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Funding Goals ─── */}
      <section id="funding" className="w-full box-border bg-gradient-to-b from-gray-900 to-gray-950 px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[960px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Funding Goals</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
              A stability and accountability budget.
            </h2>
            <p className="text-gray-400 text-base font-semibold mt-3 max-w-[500px] mx-auto">
              Not growth-at-all-costs. The most affordable and responsible amount to ensure longevity.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            {FUNDING_TIERS.map((tier) => (
              <motion.div
                key={tier.name}
                variants={staggerItem}
                className={clsx(
                  'rounded-2xl p-6 start-col gap-y-4 relative',
                  tier.featured
                    ? 'bg-amber-500/10 border-2 border-amber-500/50'
                    : 'bg-white/5 border border-white/10'
                )}
              >
                {tier.featured && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                    Target
                  </span>
                )}
                <div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{tier.name}</span>
                  <div className="text-3xl sm:text-4xl font-bold text-white mt-1">{tier.amount}</div>
                  <div className="text-sm text-gray-400 font-semibold mt-0.5">{tier.label}</div>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full w-full" />
                </div>
                <div className="start-col gap-y-2">
                  {tier.items.map((item) => (
                    <div key={item} className="start-center-row gap-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-gray-300 text-sm font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Fund Us / Donate ─── */}
      <section id="donate" className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[800px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">How to Fund</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Multiple ways to contribute.
            </h2>
          </motion.div>

          {/* Giveth */}
          <motion.div variants={staggerItem} className="bg-s-bg rounded-2xl p-6 sm:p-8 mb-6">
            <div className="between-row flex-wrap gap-4 mb-6">
              <div className="start-col gap-y-1">
                <h3 className="text-xl font-bold text-p-text">Donate on Giveth</h3>
                <p className="text-s-text text-sm font-semibold">GIVbacks eligible &middot; Up to 78% rewards on donations of $5+</p>
              </div>
              <motion.a
                href={GIVETH_LINK}
                target="_blank"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-p-text text-p-bg font-bold text-sm px-6 py-3 rounded-xl no-underline center-row gap-x-2 cursor-pointer shrink-0"
              >
                <HandCoins className="w-4 h-4" />
                Donate Now
                <ExternalLink className="w-3.5 h-3.5" />
              </motion.a>
            </div>

            <div className="start-col gap-y-3">
              <h4 className="text-sm font-bold text-p-text">Direct Crypto Addresses</h4>

              {/* EVM */}
              <div className="start-col gap-y-2">
                <CopyAddress address={CRYPTO_ADDRESSES.evm} label={`EVM \u2014 ${EVM_CHAINS.join(', ')}`} />
                <CopyAddress address={CRYPTO_ADDRESSES.solana} label="Solana" />
                <CopyAddress address={CRYPTO_ADDRESSES.stellar} label="Stellar" />
              </div>
            </div>
          </motion.div>

          {/* Indiegogo - Coming Soon */}
          <motion.div variants={staggerItem} className="bg-s-bg rounded-2xl p-6 sm:p-8 opacity-70 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Coming Soon
            </div>
            <div className="start-col gap-y-2">
              <h3 className="text-xl font-bold text-p-text">Indiegogo Campaign</h3>
              <p className="text-s-text text-sm font-semibold max-w-[400px]">
                A traditional crowdfunding campaign is being prepared for those who prefer fiat contributions. Stay tuned.
              </p>
            </div>
          </motion.div>

          {/* Other coming soon */}
          <motion.div variants={staggerItem} className="bg-s-bg rounded-2xl p-6 sm:p-8 mt-6 opacity-70 relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
              Coming Soon
            </div>
            <div className="start-col gap-y-2">
              <h3 className="text-xl font-bold text-p-text">Additional Platforms</h3>
              <p className="text-s-text text-sm font-semibold max-w-[400px]">
                More funding channels will be announced soon. Follow us on X or join Discord to stay updated.
              </p>
            </div>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Timeline ─── */}
      <section className="w-full box-border bg-s-bg px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[700px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Timeline</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">From filing to proof.</h2>
          </motion.div>

          <div className="start-col gap-y-6 relative pl-8 sm:pl-12">
            <div className="absolute left-3 sm:left-5 top-0 bottom-0 w-0.5 bg-[var(--s-text)]/20" />

            {[
              { phase: 'Phase 1', period: 'Months 1\u20132', title: 'Foundation Setup', items: ['Nonprofit formation and tax-exempt filing', 'Operational systems established', 'Community advisory group formed'] },
              { phase: 'Phase 2', period: 'Months 3\u20136', title: 'Pilot Program Launch', items: ['Onboard first cohort of local healers', 'Deliver branding, marketing, and development support', 'Implement automated support systems', 'Begin intake for impact entrepreneurs and organizations'] },
              { phase: 'Phase 3', period: 'Months 7\u201312', title: 'Proof & Refinement', items: ['Measure outcomes and refine processes', 'Publish transparent impact documentation', 'Expand to additional practitioners and organizations', 'Prepare replication framework for other cities'] }
            ].map(({ phase, period, title, items }) => (
              <motion.div key={phase} variants={staggerItem} className="start-col gap-y-2 relative">
                <div className="absolute -left-[22px] sm:-left-[30px] top-1 w-3 h-3 rounded-full bg-amber-500 border-2 border-p-bg" />
                <div className="center-row gap-x-3">
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{phase}</span>
                  <span className="text-xs font-bold text-s-text uppercase tracking-wider">{period}</span>
                </div>
                <h3 className="text-lg font-bold text-p-text">{title}</h3>
                <div className="start-col gap-y-1">
                  {items.map((item) => (
                    <div key={item} className="start-center-row gap-x-2">
                      <span className="w-1 h-1 rounded-full bg-s-text shrink-0" />
                      <span className="text-s-text text-sm font-semibold">{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Year 1 Outcomes ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Year 1 Outcomes</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">What success looks like.</h2>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { number: '10', label: 'Healers with sustained branding & operational infrastructure' },
              { number: '5', label: 'Impact entrepreneurs with long-term development support' },
              { number: '3', label: 'Impact organizations with operational systems & outreach' },
              { number: '\u2713', label: 'Transparent documentation of every engagement and lesson learned' }
            ].map(({ number, label }) => (
              <motion.div key={number} variants={staggerItem} className="bg-s-bg rounded-xl p-5 center-col text-center gap-y-2">
                <span className="text-4xl font-bold text-amber-600">{number}</span>
                <p className="text-s-text text-xs sm:text-sm font-semibold">{label}</p>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>
      </section>

      {/* ─── Long-Term Vision ─── */}
      <section className="w-full box-border bg-s-bg px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[800px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Long-Term Vision</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Scale without losing locality.
            </h2>
            <p className="text-s-text text-base font-semibold mt-3 max-w-[500px] mx-auto">
              HAND Protocol is designed to grow while keeping what matters most&mdash;local trust and real relationships.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: MapPin, text: 'Additional local impact sectors beyond healing' },
              { icon: Repeat, text: 'Replication in other cities with aligned communities' },
              { icon: Handshake, text: 'Deeper integration with regenerative funding and donation tools' },
              { icon: Users, text: 'Network effects where supported practitioners support each other' }
            ].map(({ icon: Icon, text }) => (
              <motion.div key={text} variants={staggerItem} className="bg-p-bg rounded-xl p-5 start-center-row gap-x-4">
                <div className="shrink-0 w-10 h-10 center bg-amber-500/10 rounded-lg">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-s-text text-sm font-semibold">{text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div variants={staggerItem} className="text-center mt-8">
            <p className="text-s-text text-base font-semibold italic">
              But none of that matters without proof. Austin is the proof.
            </p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Transparency & Trust ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[700px] mx-auto center-col text-center">
          <motion.div variants={staggerItem} className="mb-8">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Transparency & Trust</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">We believe</h2>
          </motion.div>

          <div className="start-col gap-y-4 w-full">
            {[
              { icon: Shield, text: 'Trust is built through consistency, not promises' },
              { icon: Heart, text: 'Infrastructure should serve people, not extract from them' },
              { icon: FileCheck, text: 'Impact must be verifiable, not performative' }
            ].map(({ icon: Icon, text }) => (
              <motion.div key={text} variants={staggerItem} className="bg-s-bg rounded-xl p-5 start-center-row gap-x-4 w-full">
                <div className="shrink-0 w-10 h-10 center bg-amber-500/10 rounded-lg">
                  <Icon className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-p-text text-base font-semibold text-left">{text}</p>
              </motion.div>
            ))}
          </div>

          <motion.p variants={staggerItem} className="text-s-text text-sm font-semibold mt-6">
            All major milestones, budgets, and outcomes will be documented and shared publicly.
          </motion.p>
        </AnimatedSection>
      </section>

      {/* ─── The Team ─── */}
      <section className="w-full box-border bg-s-bg px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[700px] mx-auto center-col text-center">
          <motion.div variants={staggerItem} className="mb-6">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">The Team</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">
              Building from within.
            </h2>
          </motion.div>

          <motion.div variants={staggerItem} className="bg-p-bg rounded-2xl p-6 sm:p-8 text-center">
            <p className="text-s-text text-base font-semibold leading-relaxed mb-4">
              HAND Protocol is founded by practitioners and technologists rooted in Austin&rsquo;s wellness community&mdash;people who have experienced firsthand the gap between transformative healing work and the infrastructure needed to sustain it.
            </p>
            <p className="text-p-text text-base font-bold">
              We&rsquo;re not building from the outside. We&rsquo;re building from within.
            </p>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Contribution Tiers ─── */}
      <section className="w-full box-border px-4 sm:px-14 py-16 sm:py-24">
        <AnimatedSection className="max-w-[1000px] mx-auto">
          <motion.div variants={staggerItem} className="text-center mb-10 sm:mb-14">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Contribution Tiers</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-p-text mt-2">Every contribution plants a seed.</h2>
            <p className="text-s-text text-base font-semibold mt-3 max-w-[500px] mx-auto">
              All contributors receive transparent reporting on how funds are used and what outcomes are achieved.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {CONTRIBUTION_TIERS.map((tier) => (
              <motion.div
                key={tier.name}
                variants={staggerItem}
                whileHover={{ y: -2 }}
                className={clsx(
                  'bg-p-bg rounded-xl p-4 sm:p-5 start-col gap-y-2 transition-shadow duration-200 hover:shadow-md',
                  tier.featured && 'ring-2 ring-amber-500/50 bg-amber-500/5'
                )}
              >
                <span className="text-xl font-bold text-amber-600">{tier.amount}</span>
                <h3 className="text-sm font-bold text-p-text">{tier.name}</h3>
                <div className="start-col gap-y-1 mt-1">
                  {tier.perks.map((perk) => (
                    <div key={perk} className="start-center-row gap-x-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                      <span className="text-s-text text-xs font-semibold">{perk}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div variants={staggerItem} className="center mt-10">
            <motion.a
              href={GIVETH_LINK}
              target="_blank"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-p-text text-p-bg font-bold text-base sm:text-lg px-10 py-4 rounded-2xl no-underline center-row gap-x-3 cursor-pointer"
            >
              <HandCoins className="w-5 h-5" />
              Contribute on Giveth
              <ExternalLink className="w-4 h-4" />
            </motion.a>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="w-full box-border bg-gradient-to-b from-gray-900 to-black px-4 sm:px-14 py-20 sm:py-28">
        <AnimatedSection className="max-w-[700px] mx-auto center-col text-center gap-y-6">
          <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold text-white">
            HAND Protocol is proven work seeking a permanent home.
          </motion.h2>
          <motion.p variants={staggerItem} className="text-gray-400 text-base sm:text-lg font-semibold leading-relaxed">
            We&rsquo;ve already supported projects across sectors, participated in funding rounds, tracked milestones publicly, and maintained long-term relationships with the people we serve. Now we&rsquo;re formalizing that work as a nonprofit foundation.
          </motion.p>
          <motion.div variants={staggerItem}>
            <motion.a
              href={GIVETH_LINK}
              target="_blank"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg px-10 py-4 rounded-2xl no-underline center-row gap-x-3 cursor-pointer transition-colors duration-200"
            >
              <HandCoins className="w-5 h-5" />
              Support on Giveth
            </motion.a>
          </motion.div>

          <motion.div variants={staggerItem} className="start-col gap-y-3 mt-6 pt-6 border-t border-white/10 text-left w-full max-w-[480px] mx-auto">
            <p className="text-gray-500 text-sm font-semibold mb-1">Even if you can&rsquo;t contribute financially:</p>
            {[
              { bold: 'Share this campaign', text: ' with anyone who believes in supporting healers' },
              { bold: 'Connect us', text: ' with aligned foundations or individuals' },
              { bold: 'Nominate a healer', text: ' in Austin who could benefit' }
            ].map(({ bold, text }) => (
              <div key={bold} className="start-center-row gap-x-2 text-gray-400 text-sm font-semibold">
                <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span><strong className="text-gray-200">{bold}</strong>{text}</span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={staggerItem} className="center-row gap-x-4 mt-4">
            <a href={X_LINK} target="_blank" className="text-gray-500 hover:text-gray-300 transition-colors no-underline text-sm font-semibold">
              Follow on X
            </a>
            <span className="text-gray-700">&middot;</span>
            <a href={DISCORD_INVITE_LINK} target="_blank" className="text-gray-500 hover:text-gray-300 transition-colors no-underline text-sm font-semibold">
              Join Discord
            </a>
            <span className="text-gray-700">&middot;</span>
            <a href={GIVETH_LINK} target="_blank" className="text-gray-500 hover:text-gray-300 transition-colors no-underline text-sm font-semibold">
              Giveth Project
            </a>
          </motion.div>
        </AnimatedSection>
      </section>

      {/* ─── Footer ─── */}
      <FooterSection />
    </div>
  )
}
