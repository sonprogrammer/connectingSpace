import { FaqSection } from '../widgets/landing/FaqSection';
import { HeroSection } from '../widgets/landing/HeroSection';
import { InquiryCtaSection } from '../widgets/landing/InquiryCtaSection';
import { LandingFooter } from '../widgets/landing/LandingFooter';
import { LandingHeader } from '../widgets/landing/LandingHeader';
import { PhilosophySection } from '../widgets/landing/PhilosophySection';
import { PortfolioSection } from '../widgets/landing/PortfolioSection';
import { PricingSection } from '../widgets/landing/PricingSection';
import { ProcessSection } from '../widgets/landing/ProcessSection';

export default function HomePage() {
  return (
    <main id="top">
      <LandingHeader />
      <HeroSection />
      <PhilosophySection />
      <ProcessSection />
      <PortfolioSection />
      <PricingSection />
      <FaqSection />
      <InquiryCtaSection />
      <LandingFooter />
    </main>
  );
}
