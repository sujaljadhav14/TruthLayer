import type {Metadata} from 'next';
import {ClerkProvider} from '@clerk/nextjs';
import {dark} from '@clerk/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'TruthLens',
  description: 'AI-powered deepfake and media forensics detection platform',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#22c55e',
          colorBackground: '#0a0a0a',
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
      <html lang="en">
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

        <body suppressHydrationWarning>
          {/*
            ─────────────────────────────────────────────────────────────
            STEP 3 – Loading Screen:
            Rendered server-side so it appears before any JS executes.
            The <script> below listens for the native 'load' event (all
            assets downloaded) and fades the overlay out — identical to
            the plain-HTML version but injected via dangerouslySetInnerHTML
            so Next.js doesn't try to parse it as JSX.
            Structure/design of the app is NOT changed; this sits above
            it in z-index and is removed on load.
            ─────────────────────────────────────────────────────────────
          */}

          {/* STEP 3: Full-screen loader overlay */}
          <div
            id="pageLoader"
            suppressHydrationWarning
            style={{
              position: 'fixed',
              top: '0px',
              left: '0px',
              width: '100%',
              height: '100%',
              background: '#0a0a0a',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              transition: 'opacity 0.4s ease, visibility 0.4s ease',
            }}
          >
            {/* STEP 3: Spinner ring using pure inline CSS — no external dep */}
            <div
              style={{
                width: 52,
                height: 52,
                border: '4px solid rgba(255,255,255,0.08)',
                borderTop: '4px solid #22c55e',
                borderRadius: '50%',
                animation: 'loaderSpin 0.9s linear infinite',
              }}
            />

            {/* STEP 3: TruthLayer wordmark shown while loading */}
            <p
              style={{
                color: '#22c55e',
                marginTop: 20,
                fontFamily: 'sans-serif',
                fontSize: 14,
                letterSpacing: '0.15em',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              TruthLayer
            </p>
            <p
              style={{
                color: 'rgba(255,255,255,0.3)',
                marginTop: 6,
                fontFamily: 'sans-serif',
                fontSize: 12,
                letterSpacing: '0.05em',
              }}
            >
              Loading...
            </p>
          </div>

          {/* STEP 3: Keyframe for the spinner + hide logic on window load */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes loaderSpin { to { transform: rotate(360deg); } }
          `}} />

          {/* STEP 3: Hide loader as soon as first paint is ready.
              Uses DOMContentLoaded (faster) instead of load (waits for all assets).
              Opacity fade gives a smooth 300ms transition, then display:none frees the layer. */}
          <script dangerouslySetInnerHTML={{__html: `
            (function() {
              function hideLoader() {
                var el = document.getElementById('pageLoader');
                if (el) {
                  el.style.opacity = '0';
                  el.style.visibility = 'hidden';
                  setTimeout(function() { el.style.display = 'none'; }, 400);
                }
              }
              if (document.readyState !== 'loading') {
                hideLoader();
              } else {
                document.addEventListener('DOMContentLoaded', hideLoader);
              }
            })();
          `}} />

          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
