import type {Metadata} from 'next';
import {ClerkProvider} from '@clerk/nextjs';
import {dark} from '@clerk/themes';
import {Archivo, Inter, JetBrains_Mono} from 'next/font/google';
import './globals.css';

const display = Archivo({subsets: ['latin'], weight: ['500', '700', '800', '900'], style: ['normal', 'italic'], variable: '--font-archivo'});
const body = Inter({subsets: ['latin'], variable: '--font-inter'});
const mono = JetBrains_Mono({subsets: ['latin'], weight: ['400', '600'], variable: '--font-jetbrains'});

export const metadata: Metadata = {
  title: 'TruthLayer — know if a video or voice clip is real',
  description: 'Deepfake forensics for video and audio: a verdict, the reasons behind it, and a signed report you can share.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#2bd46b',
          colorBackground: '#0e110f',
          colorInputBackground: '#111111',
          colorInputText: '#ffffff',
          colorText: '#ffffff',
          colorTextSecondary: '#9ca3af',
          colorNeutral: '#ffffff',
          borderRadius: '0.75rem',
        },
        elements: {
          userButtonPopoverCard: 'bg-[#0a0a0a] border border-white/10',
          userButtonPopoverActionButton: 'text-gray-300 hover:bg-white/5',
          userButtonPopoverActionButtonText: 'text-gray-300',
          userButtonPopoverFooter: 'hidden',
        },
      }}
    >
      <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
        {/*
          STEP 6 – Preload Critical Assets:
          Equivalent to <link rel="preload"> / <link rel="dns-prefetch"> in a
          plain HTML <head>. Clerk loads from external origins — prefetching
          their DNS saves ~100-200ms on first auth request.
          Next.js injects its own hashed CSS/JS preloads automatically,
          so we only need to hint external and public-folder resources here.
        */}
        <head>
          {/* STEP 6: DNS prefetch for Clerk auth endpoints (external origin) */}
          <link rel="dns-prefetch" href="//clerk.accounts.dev" />
          <link rel="dns-prefetch" href="//img.clerk.com" />

          {/* STEP 6: Prefetch the two most-visited app routes so
              navigation is instant after first load */}
          <link rel="prefetch" href="/dashboard" as="document" />
          <link rel="prefetch" href="/sign-in" as="document" />

          {/* STEP 6: Preconnect to Clerk image CDN to warm up the TCP/TLS
              handshake before the user avatar is fetched */}
          <link rel="preconnect" href="https://img.clerk.com" crossOrigin="anonymous" />
        </head>

        <body suppressHydrationWarning className="font-sans antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
