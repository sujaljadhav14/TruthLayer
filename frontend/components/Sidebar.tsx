"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { ScanEye, Home, UploadCloud, History, AlertTriangle, BookOpen, LogOut } from "lucide-react";

const emptySubscribe = () => () => {};

const NAV = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "New analysis", href: "/dashboard/analyze", icon: UploadCloud },
  { name: "Reports", href: "/dashboard/history", icon: History },
  { name: "File a complaint", href: "/dashboard/complaint", icon: AlertTriangle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-none flex-col border-r border-white/10 bg-ink md:flex">
      <Link href="/" className="flex items-center gap-2.5 border-b border-white/10 px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-signal text-ink">
          <ScanEye className="h-5 w-5" />
        </span>
        <span className="font-display text-xl font-extrabold tracking-tight text-paper">TruthLayer</span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-5">
        <p className="eyebrow mb-2 px-3 text-paper/40">Workspace</p>
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-signal text-ink" : "text-paper/70 hover:bg-white/5 hover:text-paper"
              }`}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.name}
            </Link>
          );
        })}

        <p className="eyebrow mb-2 mt-8 px-3 text-paper/40">Learn</p>
        <Link href="/#how" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-paper/70 hover:bg-white/5 hover:text-paper">
          <BookOpen className="h-[18px] w-[18px]" />
          How it works
        </Link>
      </nav>

      <div className="space-y-2 border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          {mounted && user?.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.imageUrl} alt="" className="h-8 w-8 rounded-full border border-white/20" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal/20 text-sm font-bold text-signal">
              {mounted ? (user?.firstName?.[0] ?? "?") : "?"}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-paper">{mounted ? (user?.fullName ?? "User") : "User"}</p>
            <p className="truncate text-xs text-paper/50">{mounted ? (user?.primaryEmailAddress?.emailAddress ?? "") : ""}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ redirectUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-paper/60 transition-colors hover:bg-alert/10 hover:text-alert"
        >
          <LogOut className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
