import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { BrainCircuit } from 'lucide-react';

// ── Performance Optimization: Lazy Load Client Hub ──────────────────────────
// This prevents the entire framer-motion and react-markdown bundles from 
// blocking the initial server-render and JS execution.
const InfiniteCanvas = dynamic(() => import('@/components/chat/InfiniteCanvas'), {
  ssr: true, // Enable SSR so the initial UI layout is visible before hydration
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0e0e10]">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
            <BrainCircuit className="text-indigo-400" size={24} />
        </div>
        <p className="text-xs font-mono text-gray-600 uppercase tracking-widest">Initialising Architecture...</p>
      </div>
    </div>
  )
});

export default function Page() {
  return (
    <Suspense fallback={null}>
      <InfiniteCanvas />
    </Suspense>
  );
}
