'use client'
import { useRef } from 'react'
import dynamic from 'next/dynamic'
import HeroSection from './components/HeroSection'
import ProgramSection from './components/ProgramSection'

const ComparisonSection = dynamic(() => import('./components/ComparisonSection'))
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
      <ProgramSection landingPlanRef={landingPlanRef} />
      <ComparisonSection />
      <BenefitSection />
      <FeaturesSection />
      <WhyChooseUs landingPlanRef={landingPlanRef} />
      <PersonalizedLearningSection landingPlanRef={landingPlanRef} />
      <TestimonialsSection />
      <FAQSection />
    </div>
  )
}
