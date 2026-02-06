'use client'
import './globals.css'

import FeaturedProjects from '../components/pages/home/FeaturedProjects'
import FooterSection from '../components/pages/home/FooterSection'
import LandingSection from '../components/pages/home/LandingSection'
import EcosystemSection from '../components/pages/home/EcosystemSection'
import { useRef } from 'react'
import FaqSection from '../components/pages/home/FaqSection'

export default function Home() {
  const projectsRef = useRef<HTMLDivElement>(null)

  const scrollToProjects = () => {
    if (projectsRef.current) {
      projectsRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }
  return (
    <div className="w-full h-full start-col relative overflow-hidden no-scrollbar">
      <LandingSection scrollToProjects={scrollToProjects} />
      <div ref={projectsRef} className="mt-20 sm:mt-0">
        <FeaturedProjects />
      </div>
      <EcosystemSection />
      <FaqSection />
      <FooterSection />
    </div>
  )
}
