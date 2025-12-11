'use client'
import { useRef } from 'react'
import HeroSection from './components/HeroSection'
import ProgramSection from './components/ProgramSection'
import ComparisonSection from './components/ComparisonSection'
import BenefitSection from './components/BenefitSection'
import FeaturesSection from './components/FeaturesSection'
import WhyChooseUs from './components/WhyChooseUs'
import PersonalizedLearningSection from './components/PersonalizedLearningSection'
import TestimonialsSection from './components/TestimonialsSection'
import FAQSection from './components/FAQSection'

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