"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ScanEye, ArrowUpRight } from "lucide-react";
import { useAuth, UserButton } from "@clerk/nextjs";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#sample", label: "Sample report" },
  { href: "#checks", label: "What we check" },
];

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled ? "bg-ink/95 text-white backdrop-blur border-b border-white/10" : "bg-transparent text-ink"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-md border-2 ${scrolled ? "border-signal bg-signal text-ink" : "border-ink bg-ink text-signal"}`}>
            <ScanEye className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">TruthLayer</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-6">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hidden text-sm font-semibold hover:underline underline-offset-4 md:inline">
              {l.label}
            </a>
          ))}
          {isLoaded && !isSignedIn && (
            <Link href="/sign-in" className="hidden px-2 text-sm font-semibold whitespace-nowrap hover:underline underline-offset-4 sm:inline">
              Sign in
            </Link>
          )}
          {isLoaded && isSignedIn ? (
            <>
              <Link href="/dashboard" className="btn-chunky bg-paper text-ink !py-2 !px-3 sm:!px-4 text-sm whitespace-nowrap">
                Dashboard
              </Link>
              <UserButton appearance={{ elements: { avatarBox: "w-9 h-9" } }} />
            </>
          ) : (
            <Link href="/dashboard/analyze" className="btn-chunky bg-paper text-ink !py-2 !px-3 sm:!px-4 text-sm whitespace-nowrap">
              Check a file <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
