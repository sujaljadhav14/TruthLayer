import { SignIn } from "@clerk/nextjs";
import { ScanEye, Shield, Fingerprint, Eye } from "lucide-react";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center auth-bg">
      {/* Floating orbs */}
      <div className="auth-orb-1" />
      <div className="auth-orb-2" />
      <div className="auth-orb-3" />

      <div className="relative z-10 w-full max-w-[1100px] mx-auto px-6 py-10">
        <div className="glass-card rounded-[2rem] p-0 flex flex-col lg:flex-row min-h-[640px]">

          {/* Left panel — gradient bg + glow + fadeInLeft entrance */}
          <div className="left-panel lg:w-[45%] p-10 lg:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.06]">
            <div>
              <Link href="/" className="flex items-center gap-3 mb-12 fade-in-1">
                <div className="brand-icon w-11 h-11 bg-green-500 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <ScanEye className="text-black w-6 h-6" />
                </div>
                <div>
                  <span className="text-xl font-bold tracking-wider text-white">TruthLayer</span>
                  <p className="text-[10px] font-bold text-green-500 tracking-[0.25em]">FORENSIC AI</p>
                </div>
              </Link>

              <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3 leading-snug fade-in-2">
                Detect deepfakes with
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-500"> AI-powered </span>
                forensics
              </h1>
              <p className="text-gray-400 text-base mb-10 leading-relaxed fade-in-3">
                Sign in to your forensic dashboard and protect against digital deception.
              </p>

              <div className="space-y-3 fade-in-4">
                <div className="feature-card flex items-center gap-4 p-4 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                    <Shield className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Military-grade detection</p>
                    <p className="text-xs text-gray-500">Multi-model AI pipeline with 99.2% accuracy</p>
                  </div>
                </div>
                <div className="feature-card flex items-center gap-4 p-4 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                    <Fingerprint className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Digital forensics reports</p>
                    <p className="text-xs text-gray-500">Court-admissible PDF evidence reports</p>
                  </div>
                </div>
                <div className="feature-card flex items-center gap-4 p-4 rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                    <Eye className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Real-time analysis</p>
                    <p className="text-xs text-gray-500">Upload video, audio, or images for instant scan</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 mt-8 fade-in-5">
              &copy; 2026 TruthLayer &middot; Built by Byte Devs
            </p>
          </div>

          {/* Right panel — form card with fadeInRight entrance */}
          <div className="right-panel lg:w-[55%] flex items-center justify-center p-8 lg:p-12">
            <div className="w-full max-w-sm">
              <div className="mb-8 text-center">
                <div className="brand-icon w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center border border-green-500/20 mx-auto mb-5">
                  <ScanEye className="w-7 h-7 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1.5">Welcome back</h2>
                <p className="text-sm text-gray-400">Sign in to your forensic dashboard</p>
              </div>
              <SignIn
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    cardBox: "w-full shadow-none",
                    card: "w-full bg-transparent shadow-none p-0",
                    header: "hidden",
                    socialButtonsBlockButton:
                      "clerk-google-btn",
                    formButtonPrimary:
                      "clerk-continue-btn",
                    footerActionLink: "text-green-500 hover:text-green-400",
                    formFieldInput:
                      "clerk-input",
                    dividerLine: "bg-white/[0.08]",
                    dividerText: "text-gray-500",
                    formFieldLabel: "text-gray-300",
                    footer: "bg-transparent",
                  },
                }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
