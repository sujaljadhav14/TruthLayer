import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="bg-[#050505] text-white min-h-screen font-sans selection:bg-green-500/30">
      <Navbar />
      <Hero />
      <HowItWorks />
      <Footer />
    </main>
  );
}
