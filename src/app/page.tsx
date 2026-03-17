'use client';

import React, { Suspense, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { BrainCircuit } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { AiraLanding } from '@/components/landing/AiraLanding';

const InfiniteCanvas = dynamic(() => import('@/components/chat/InfiniteCanvas'), {
  ssr: true, 
  loading: () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#050508]">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <BrainCircuit className="text-amber-500" size={24} />
        </div>
        <p className="text-xs font-mono text-gray-600 uppercase tracking-widest leading-relaxed">Synthesizing System Architecture...</p>
      </div>
    </div>
  )
});

export default function Page() {
  const [isAppStarted, setIsAppStarted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aira_app_started') === 'true';
    }
    return false;
  });

  const handleEnterApp = () => {
    setIsAppStarted(true);
    localStorage.setItem('aira_app_started', 'true');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050508]">
      <AnimatePresence mode="wait">
        {!isAppStarted ? (
          <motion.div
            key="landing"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(10px)' }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <AiraLanding onEnterApp={handleEnterApp} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 flex flex-col h-full overflow-hidden"
          >
            <Suspense fallback={null}>
              <InfiniteCanvas />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
