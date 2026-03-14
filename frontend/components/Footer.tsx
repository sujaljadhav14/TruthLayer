import { ScanEye } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#050505] pt-24 pb-8 px-6 border-t border-white/5 relative overflow-hidden">
      {/* Large background logo text */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[12vw] font-bold text-green-500/5 whitespace-nowrap pointer-events-none select-none flex items-center gap-8">
        <ScanEye className="w-[10vw] h-[10vw]" /> TRUTHLAYER
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
                <ScanEye className="text-black w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-wider">TruthLayer</span>
            </div>
            <p className="text-gray-400 text-sm mb-6">Digital Media Trust Platform. Detect deepfakes and generate forensic evidence.</p>
          </div>

          <div>
            <h4 className="font-bold mb-6">Platform</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a></li>
              <li><a href="/dashboard/analyze" className="hover:text-white transition-colors">New Analysis</a></li>
              <li><a href="/dashboard/history" className="hover:text-white transition-colors">Reports History</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Resources</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Github</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">Hackverse 2026</h4>
            <p className="text-sm text-gray-400 leading-relaxed">
              Built by Byte Devs<br/>
              Sujal, Samiksha, Rutuja, Bhoomi
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-white/10 text-xs text-gray-500">
          <p>TruthLayer © 2026. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
