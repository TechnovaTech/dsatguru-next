'use client'
import { useRef } from 'react'
import dynamic from 'next/dynamic'
import HeroSection from './components/HeroSection'
import ProgramSection from './components/ProgramSection'
import MediaShowcase from './components/MediaShowcase'

const BenefitSection = dynamic(() => import('./components/BenefitSection'))
const FeaturesSection = dynamic(() => import('./components/FeaturesSection'))
const WhyChooseUs = dynamic(() => import('./components/WhyChooseUs'))
const PersonalizedLearningSection = dynamic(
  () => import('./components/PersonalizedLearningSection')
)
const TestimonialsSection = dynamic(() => import('./components/TestimonialsSection'))
const FAQSection = dynamic(() => import('./components/FAQSection'))

export default function Home() {
  const landingPlanRef = useRef(null)

  return (
    <div className="font-[Poppins]">
      <HeroSection landingPlanRef={landingPlanRef} />
      <FeaturesSection />
      <ProgramSection landingPlanRef={landingPlanRef} />
      <PersonalizedLearningSection landingPlanRef={landingPlanRef} />
      <MediaShowcase items={[]} />
      <BenefitSection />
      <WhyChooseUs landingPlanRef={landingPlanRef} />
      <TestimonialsSection />
      <FAQSection />
    </div>
  )
}
