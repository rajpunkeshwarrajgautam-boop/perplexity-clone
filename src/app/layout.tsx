import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
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
  title: 'Aira — God-Tier AI Research Platform',
  description: 'Aira is an infinite-canvas AI research engine powered by hybrid vector search, multi-model LLM orchestration, and real-time web intelligence.',
  keywords: ['AI', 'RAG', 'research', 'LLM', 'GPT', 'DeepSeek', 'knowledge graph', 'context window'],
  authors: [{ name: 'Aira Team' }],
  robots: 'index, follow',
  openGraph: {
    title: 'Aira — God-Tier AI Research Platform',
    description: 'Infinite canvas AI engine with hybrid vector search and real-time web intelligence.',
    url: 'https://aira.ai',
    siteName: 'Aira',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Aira AI Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aira — God-Tier AI Research Platform',
    description: 'Infinite canvas AI engine with hybrid vector search and real-time web intelligence.',
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0e0e10',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050508]`}
        >
          <div className="flex h-screen w-full overflow-hidden text-gray-100 font-sans selection:bg-amber-500/30">
            {/* Desktop Sidebar */}
            <div className="hidden md:flex flex-col border-r border-white/5 bg-[#050508] h-full shadow-2xl z-20 relative">
               <Sidebar />
               
               {/* User Auth Section built right into sidebar bottom */}
               <div className="p-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-bold text-xs shadow-md">ND</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Developer Mode</span>
                        <span className="text-xs text-gray-500">Pro Tier Active</span>
                      </div>
                    </div>
               </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full bg-[#050508] overflow-hidden relative isolate">
                {/* Mobile Auth Header overlay (only shows on mobile) */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-white/5 sticky top-0 bg-[#050508] z-20">
                  <div className="font-semibold tracking-tight text-gray-100 flex items-center gap-2">
                     <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                       <BrainCircuit size={14} className="text-black" />
                     </div>
                     Aira
                  </div>
                  <div className="text-xs bg-amber-500 px-3 py-1 rounded text-black font-bold cursor-pointer hover:bg-amber-600 transition-colors">Developer</div>
                </div>
                
                {children}
            </div>
          </div>
        </body>
      </html>
  );
}
