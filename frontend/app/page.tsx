import SiteNav from "@/components/landing/SiteNav";
import Story from "@/components/landing/Story";
import SampleReport from "@/components/landing/SampleReport";
import WhatWeCheck from "@/components/landing/WhatWeCheck";
import Faq from "@/components/landing/Faq";
import FinalCta from "@/components/landing/FinalCta";

export default function Home() {
  return (
    <main className="min-h-screen bg-ink font-sans selection:bg-caution/60">
      <SiteNav />
      <Story />
      <SampleReport />
      <WhatWeCheck />
      <Faq />
      <FinalCta />
    </main>
  );
}
