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
        <body suppressHydrationWarning>{children}</body>
      </html>
    </ClerkProvider>
  );
}
