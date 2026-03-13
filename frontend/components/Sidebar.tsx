"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ScanEye, 
  Home, 
  UploadCloud, 
  FileSearch, 
  History, 
  AlertTriangle,
  BookOpen
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "New Analysis", href: "/dashboard/analyze", icon: UploadCloud },
    { name: "Results Dashboard", href: "/dashboard/results", icon: FileSearch },
    { name: "Reports History", href: "/dashboard/history", icon: History },
    { name: "File Complaint", href: "/dashboard/complaint", icon: AlertTriangle },
  ];

  return (
    <aside className="w-64 bg-[#0a0a0a] border-r border-white/5 h-screen flex flex-col sticky top-0">
      <div className="p-6 flex items-center gap-3 border-b border-white/5">
        <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center text-black">
          <ScanEye className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white leading-tight tracking-wider">TruthLayer</h1>
          <p className="text-[10px] font-bold text-green-500 tracking-widest">FORENSIC AI</p>
        </div>
      </div>

      <div className="flex-1 py-6 px-4 flex flex-col gap-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-green-500/10 text-green-500 border border-green-500/20" 
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "text-green-500" : "text-gray-500"}`} />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-8 mb-2 px-4">
          <p className="text-xs font-bold text-gray-600 tracking-wider uppercase">Resources</p>
        </div>
        <Link
          href="#"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <BookOpen className="w-5 h-5 text-gray-500" />
          Documentation
        </Link>
      </div>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-[#111]">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold text-sm border border-green-500/30">
            S
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-bold text-white truncate">SUJAL</p>
            <p className="text-xs text-gray-500 truncate">sujal.jadhav2627@gmail.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
