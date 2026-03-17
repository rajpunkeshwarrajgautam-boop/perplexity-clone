'use client';

import React from 'react';
import NextImage from 'next/image';
import { m as motion, useScroll, useTransform } from 'framer-motion';
import { 
  BrainCircuit, Sparkles, Shield, 
  Search, Network, 
  ArrowRight, Play, LucideIcon
} from 'lucide-react';

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: { icon: LucideIcon, title: string, description: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay, duration: 0.5 }}
    className="p-6 rounded-2xl bg-[#0a0c10] border border-white/5 hover:border-amber-500/30 transition-all group relative overflow-hidden"
  >
    <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4 text-amber-500 group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <h3 className="text-xl font-bold text-gray-100 mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
  </motion.div>
);

export function AiraLanding({ onEnterApp }: { onEnterApp: () => void }) {
  const { scrollYProgress } = useScroll();
  const yScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [1, 0]);

  const capabilities = [
    {
      icon: Search,
      title: "Hybrid Answer Engine",
      description: "Seamlessly merges real-time web intelligence with your private research repositories."
    },
    {
      icon: Network,
      title: "Infinite Knowledge Canvas",
      description: "Visual workspace for spatial reasoning. Map connections between sources, PDFs, and data points."
    },
    {
      icon: Shield,
      title: "High-Fidelity Provenance",
      description: "Every assertion is numerically weighted and traced to its primary source. Academic-grade reliability."
    },
    {
      icon: BrainCircuit,
      title: "Autonomous Research Agents",
      description: "Dispatch Aira to plan, execute, and synthesize multi-stage research workflows while you sleep."
    }
  ];

  const useCases = [
    {
      title: "Academic Research",
      description: "Auto-generate literature reviews, cross-reference papers, and track citations with zero friction.",
      stats: "PhD Level Depth"
    },
    {
      title: "Market Intelligence",
      description: "Synthesize competitor moves, quarterly reports, and news cycles into executive-ready briefings.",
      stats: "Edge in Minutes"
    },
    {
      title: "Competitive Analysis",
      description: "Build live battlecards and technical teardowns using real-time web scraping and spatial analysis.",
      stats: "Unfair Advantage"
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-none bg-[#050508]">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 overflow-hidden">
         {/* Atmospheric Background Crystals */}
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full" />
         
         <motion.div 
           style={{ scale: yScale, opacity }}
           className="z-10 text-center max-w-4xl"
         >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold tracking-widest uppercase mb-8"
            >
              <div className="flex items-center gap-2">
                <Sparkles size={14} />
                Introducing Aira v2.0
              </div>
              <div className="w-px h-3 bg-amber-500/20" />
              <div className="text-gray-400 lowercase italic font-normal">build_0428 active</div>
            </motion.div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.1]">
              Research, <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-200 to-amber-500">Connected.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              The infinite-canvas AI engine for researchers who need depth. 
              Synthesize 1,000+ sources into a single spatial knowledge graph.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
               <button 
                 onClick={onEnterApp}
                 className="px-8 py-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-lg transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)] flex items-center gap-2 group"
               >
                 Try the Infinite Canvas
                 <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
               </button>
               <button className="px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-lg transition-all flex items-center gap-2">
                 Watch the Tour
                 <Play size={18} />
               </button>
            </div>
         </motion.div>

         {/* Hero Preview Card (The Demo Widget Placeholder) */}
         <motion.div
           initial={{ opacity: 0, y: 40 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.2 }}
           className="mt-20 w-full max-w-6xl rounded-3xl border border-white/5 bg-[#0a0c10]/50 backdrop-blur-3xl shadow-2xl relative group overflow-hidden"
         >
            <div className="absolute inset-0 bg-linear-to-b from-amber-500/5 to-transparent pointer-events-none z-10" />
            <div className="p-3 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
               <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
               </div>
               <div className="text-[10px] text-gray-500 font-mono tracking-[0.3em] uppercase">aira_environment_v2.0_stable</div>
               <div className="flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                  <div className="text-[10px] text-emerald-500/80 font-mono">SYSTEM_2_ACTIVE</div>
               </div>
            </div>
            <div className="relative aspect-video w-full overflow-hidden">
               <NextImage 
                 src="/aira_hero_mockup.png" 
                 alt="Aira Infinite Canvas Preview" 
                 fill
                 className="object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-700"
                 priority
               />
               <div className="absolute inset-0 bg-linear-to-t from-[#050508] via-transparent to-transparent" />
               
               {/* Quick Feature Overlays */}
               <div className="absolute bottom-10 left-10 flex gap-4 z-20">
                  <div className="px-4 py-2 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md text-[10px] font-mono text-gray-300">
                     LATENCY: 42MS
                  </div>
                  <div className="px-4 py-2 rounded-xl bg-black/60 border border-amber-500/20 backdrop-blur-md text-[10px] font-mono text-amber-500 font-bold">
                     REASONING: MULTI-STAGE
                  </div>
               </div>
            </div>
         </motion.div>
      </section>

      {/* Problem Section */}
      <section className="py-32 px-6 border-t border-white/5 relative bg-[#0a0c10]/30">
         <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
            <div>
               <h2 className="text-4xl font-bold text-white mb-6 leading-tight uppercase tracking-tighter">
                  Research is <span className="text-red-500">Broken.</span>
               </h2>
               <div className="space-y-6">
                  {[
                    "Standard chats lose context after 2 questions.",
                    "Citation tracking is a manual nightmare.",
                    "Information is scattered across 50 tabs.",
                    "Synthesis is linear, while knowledge is spatial."
                  ].map((text, i) => (
                    <div key={i} className="flex items-start gap-4">
                       <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500" />
                       <p className="text-gray-400 text-lg">{text}</p>
                    </div>
                  ))}
               </div>
            </div>
            <div className="p-8 rounded-3xl bg-linear-to-br from-indigo-500/5 to-transparent border border-white/5">
               <h3 className="text-amber-500 font-mono text-sm uppercase tracking-widest mb-4">The Solution</h3>
               <p className="text-2xl font-light text-gray-200 leading-relaxed mb-8">
                  Aira treats research as a <span className="font-bold underline decoration-amber-500 underline-offset-8">graph</span>, not a chat log. We synthesize across domains in real-time.
               </p>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-bold text-white">10x</span>
                     <span className="text-xs text-gray-500 uppercase">Faster Synthesis</span>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2">
                     <span className="text-2xl font-bold text-white">100%</span>
                     <span className="text-xs text-gray-500 uppercase">Citation Fidelity</span>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-32 px-6 border-t border-white/5 relative bg-[#050508]">
         <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-6">
               <div className="max-w-2xl">
                  <h2 className="text-amber-500 font-mono text-xs uppercase tracking-[0.3em] mb-4">Industrial Applications</h2>
                  <h3 className="text-4xl md:text-5xl font-bold text-white tracking-tighter">
                     Aira is built for <span className="italic font-light">extreme</span> depth.
                  </h3>
               </div>
               <div className="text-gray-500 font-mono text-xs uppercase mb-2">SCROLL TO ANALYZE →</div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
               {useCases.map((uc, i) => (
                 <motion.div
                   key={i}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: i * 0.1 }}
                   className="group p-8 rounded-3xl bg-[#0a0c10] border border-white/5 hover:border-amber-500/50 transition-all flex flex-col h-full"
                 >
                    <div className="text-amber-500/50 font-mono text-[10px] mb-6 tracking-widest uppercase">{uc.stats}</div>
                    <h4 className="text-2xl font-bold text-white mb-4 group-hover:text-amber-400 transition-colors">{uc.title}</h4>
                    <p className="text-gray-400 leading-relaxed mb-8 flex-1">{uc.description}</p>
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                       Explore Pathway <ArrowRight size={14} />
                    </div>
                 </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Capabilities Section */}
      <section className="py-32 px-6 max-w-7xl mx-auto">
         <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">God-Tier Capabilities</h2>
            <p className="text-gray-400">Professional infrastructure for modern knowledge workers.</p>
         </div>
         <div className="grid md:grid-cols-3 gap-8">
            {capabilities.map((cap, i) => (
              <FeatureCard key={i} {...cap} delay={i * 0.1} />
            ))}
         </div>
      </section>

      {/* Social Proof Placeholder */}
      <section className="py-20 border-y border-white/5 bg-white/[0.02]">
         <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">Trusted by builders at</p>
            <div className="flex flex-wrap items-center gap-12 opacity-30 grayscale contrast-125">
               <div className="text-2xl font-bold">OXFORD</div>
               <div className="text-2xl font-bold">MIT</div>
               <div className="text-2xl font-bold">NVIDIA</div>
               <div className="text-2xl font-bold">DEEPMIND</div>
            </div>
         </div>
      </section>

      {/* Footer / Final CTA */}
      <footer className="py-32 bg-[#050508] text-center border-t border-white/5">
         <h2 className="text-4xl font-bold text-white mb-8">Ready to evolve your research?</h2>
         <button 
           onClick={onEnterApp}
           className="px-12 py-5 rounded-2xl bg-white text-black font-bold text-xl hover:bg-gray-200 transition-colors shadow-2xl shadow-white/10"
         >
           Enter the Canvas
         </button>
         <div className="mt-20 text-gray-600 text-xs font-mono">
            &copy; 2026 Aira AI Platform. All rights reserved.
         </div>
      </footer>
    </div>
  );
}
