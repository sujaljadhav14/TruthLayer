import Link from "next/link";
import { ScanEye, UploadCloud } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-ink font-sans text-white selection:bg-caution/60">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/10 bg-ink/90 px-5 backdrop-blur sm:px-8">
          {/* Mobile: logo (sidebar is hidden below md) */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-ink">
              <ScanEye className="h-5 w-5" />
            </span>
            <span className="font-display text-lg font-extrabold text-paper">TruthLayer</span>
          </Link>
          <span className="hidden md:block" />
          <div className="flex items-center gap-4">
            <Link href="/dashboard/analyze" className="btn-chunky bg-signal text-ink !border-ink !py-1.5 !px-3 text-sm !shadow-[3px_3px_0_0_#000]">
              <UploadCloud className="h-4 w-4" /> New analysis
            </Link>
            <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  );
}
