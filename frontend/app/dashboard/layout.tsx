import Sidebar from "@/components/Sidebar";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-green-500/30">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="h-16 bg-[#0a0a0a] border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white/5 hover:text-white transition-colors relative">
              <span className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full border-2 border-[#0a0a0a]" />
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
            </button>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9",
                },
              }}
            />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
