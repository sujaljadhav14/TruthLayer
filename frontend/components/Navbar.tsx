"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { ScanEye } from "lucide-react";
import Link from "next/link";
import { useAuth, UserButton } from "@clerk/nextjs";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-black/80 backdrop-blur-md border-b border-white/10 py-4" : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded flex items-center justify-center">
            <ScanEye className="text-black w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-wider">TruthLayer</span>
        </Link>

        <div className="flex items-center gap-4">
          {isLoaded && !isSignedIn && (
            <>
              <Link href="/sign-in" className="btn-outline px-4 py-2 text-sm font-medium text-gray-300 border border-white/10 rounded hover:bg-white/5 transition-colors">
                Sign In
              </Link>
              <Link href="/sign-up" className="btn-nav px-4 py-2 text-sm font-medium text-black bg-green-500 rounded hover:bg-green-400 transition-colors">
                Sign Up
              </Link>
            </>
          )}
          {isLoaded && isSignedIn && (
            <>
              <Link href="/dashboard" className="btn-nav px-4 py-2 text-sm font-medium text-black bg-green-500 rounded hover:bg-green-400 transition-colors">
                Dashboard
              </Link>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-9 h-9",
                  },
                }}
              />
            </>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
