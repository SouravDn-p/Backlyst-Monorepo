"use client";

import { FileCheck, PlayCircle } from "lucide-react";
import EfficiencySection from "../../components/landing/EfficiencySection";
import FAQSection from "../../components/landing/FAQSection";
import Features from "../../components/landing/Features";
import CTASection from "../../components/landing/CtaSection";
import Hero from "../../components/landing/Hero";
import Pricing from "../../components/landing/Pricing";
import ProcessSection from "../../components/landing/ProcessSection";

const LandingPage = () => {
  return (
    <div className="bg-white min-h-screen">
      <Hero />
      <EfficiencySection />
      <Features />
      <ProcessSection />
      <Pricing />
      <FAQSection />
      <div className="mx-auto">
        <CTASection
          title="Ready to grow your authority?"
          description="Join the new era of SEO outreach. Buy credits, create your first task, and experience backlink building without the friction."
          primaryAction={{
            label: "CREATE YOUR FIRST TASK",
            href: "/dashboard",
            icon: <FileCheck className="w-6 h-6" />,
          }}
          secondaryAction={{
            label: "HOW IT WORKS",
            href: "/how-it-works",
            icon: <PlayCircle className="w-6 h-6" />,
          }}
        />
      </div>
    </div>
  );
};

export default LandingPage;
