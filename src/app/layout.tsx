import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/Sidebar';
import { BrainCircuit } from 'lucide-react';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Perplexity Clone',
  description: 'A Next.js 15 App Router knowledge interface',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0e0e10]`}
        >
          <div className="flex h-screen w-full overflow-hidden text-gray-100 font-sans selection:bg-indigo-500/30">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col border-r border-[#1e1e24] bg-[#111116] h-full shadow-2xl z-20 relative">
               <Sidebar />
               
               {/* User Auth Section built right into sidebar bottom */}
               <div className="p-4 border-t border-[#1e1e24] flex items-center justify-between">
                  <SignedIn>
                    <div className="flex items-center gap-3">
                      <UserButton appearance={{ elements: { userButtonAvatarBox: 'w-8 h-8 rounded-full' }}} />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">My Account</span>
                        <span className="text-xs text-gray-400">Free Tier</span>
                      </div>
                    </div>
                  </SignedIn>
                  <SignedOut>
                    <SignInButton mode="modal">
                      <button className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors">Sign In</button>
                    </SignInButton>
                  </SignedOut>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-[#0e0e10] overflow-hidden relative isolate">
                {/* Mobile Auth Header overlay (only shows on mobile) */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-[#1e1e24] sticky top-0 bg-[#0e0e10] z-20">
                  <div className="font-semibold tracking-tight text-gray-100 flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                       <BrainCircuit size={14} className="text-white" />
                     </div>
                     RAG Clone
                  </div>
                  <SignedIn><UserButton /></SignedIn>
                  <SignedOut><SignInButton mode="modal"><span className="text-xs bg-indigo-500 px-3 py-1 rounded text-white cursor-pointer hover:bg-indigo-600 transition-colors">Sign In</span></SignInButton></SignedOut>
                </div>
                
                {children}
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
