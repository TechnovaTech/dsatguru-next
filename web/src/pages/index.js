import { useRef } from "react";
import HeroSection from "./Home/HeroSection";
import ProgramSection from "./Home/ProgramSection";
import ComparisonSection from "./Home/ComparisonSection";
import BenefitsSection from "./Home/BenefitSection";
import FeaturesSection from "./Home/FeaturesSection";
import WhyChooseUs from "./Home/WhyChooseUs";
import PersonalizedLearning from "./Home/PersonalizedLearningSection";
import TestimonialSection from "./Home/TestimonialsSection";
import FAQSection from "./Home/FAQSection";

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
      <div ref={landingPlanRef} />
    </div>
  );
}
