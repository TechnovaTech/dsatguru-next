import HeroSection from "./HeroSection";
import ProgramSection from "./ProgramSection";
import ComparisonSection from "./ComparisonSection";
import BenefitsSection from "./BenefitSection";
import FeaturesSection from "./FeaturesSection";
import WhyChooseUs from "./WhyChooseUs";
import PersonalizedLearning from "./PersonalizedLearningSection";
import TestimonialSection from "./TestimonialsSection";
import FAQSection from "./FAQSection";
import { useRef } from "react";

export default function Home() {
  const landingPlanRef = useRef(null);
  return (
    <div className="font-[Poppins]">
      <HeroSection landingPlanRef={landingPlanRef} />
      <ProgramSection landingPlanRef={landingPlanRef} />
      <ComparisonSection />
      <BenefitsSection />
      <FeaturesSection />
      <WhyChooseUs landingPlanRef={landingPlanRef} />
      <PersonalizedLearning landingPlanRef={landingPlanRef} />
      <TestimonialSection />
      <FAQSection />
    </div>
  );
}
