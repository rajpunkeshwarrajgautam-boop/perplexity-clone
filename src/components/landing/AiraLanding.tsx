'use client';

import React from 'react';
import NextImage from 'next/image';
import { motion } from 'framer-motion';
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
      {/* Hero Section: Split Screen */}
      <section className="relative min-h-[90vh] flex flex-col md:flex-row items-center justify-between px-6 md:px-20 py-20 overflow-hidden">
         {/* Atmospheric Background Crystals */}
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 blur-[120px] rounded-full -z-10" />
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full -z-10" />
         
         {/* Left Side: Headline + CTA */}
         <motion.div 
           initial={{ opacity: 0, x: -50 }}
           animate={{ opacity: 1, x: 0 }}
           transition={{ duration: 0.8 }}
           className="flex-1 z-10 text-left max-w-2xl mb-12 md:mb-0"
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
            
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.85]">
               Synthesize <br />
               <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-200 to-amber-500">PhD-Level Depth.</span>
            </h1>
            
            <p className="text-xl text-gray-400 mb-10 leading-relaxed max-w-xl">
              Research is broken by information fragmentation. Aira is the first <span className="text-white font-medium">Infinite Knowledge Canvas</span> designed for PhD-level depth and industrial intelligence.
            </p>
            
            <div className="flex flex-wrap gap-4">
               <button 
                 onClick={onEnterApp}
                 className="px-8 py-4 rounded-full bg-amber-500 text-black font-bold flex items-center gap-2 hover:bg-amber-400 hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(245,158,11,0.2)]"
               >
                 Launch Canvas <ArrowRight size={18} />
               </button>
               <button className="px-8 py-4 rounded-full bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-all">
                 Request Demo
               </button>
            </div>

            {/* Trust Signals / Social Proof */}
            <div className="mt-16 pt-8 border-t border-white/5">
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold mb-6">Trusted by Researchers at</p>
                <div className="flex items-center gap-8 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all">
                   <span className="text-sm font-black text-white">MIT</span>
                   <span className="text-sm font-black text-white">DEEPMIND</span>
                   <span className="text-sm font-black text-white">UPENN</span>
                   <span className="text-sm font-black text-white">STAMFORD</span>
                </div>
            </div>
         </motion.div>

         {/* Right Side: Visual Demo */}
         <motion.div
           initial={{ opacity: 0, x: 50, scale: 0.9 }}
           animate={{ opacity: 1, x: 0, scale: 1 }}
           transition={{ duration: 1, delay: 0.2 }}
           className="flex-1 relative w-full flex items-center justify-center md:-mr-20"
         >
            <div className="relative w-full aspect-video rounded-3xl border border-white/5 bg-[#0a0c10]/50 backdrop-blur-3xl shadow-2xl overflow-hidden group">
                <div className="absolute inset-0 bg-linear-to-b from-amber-500/5 to-transparent pointer-events-none z-10" />
                <div className="p-3 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
                   <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20" />
                   </div>
                   <div className="text-[10px] text-gray-500 font-mono tracking-[0.3em] uppercase">environment_v2.0_stable</div>
                </div>
                <div className="relative h-full w-full min-h-[400px]">
                   <NextImage 
                     src="/aira_hero_mockup.png" 
                     alt="Aira Infinite Canvas Preview" 
                     fill
                     className="object-cover opacity-80 group-hover:scale-[1.05] transition-transform duration-[3s]"
                     priority
                   />
                   <div className="absolute inset-0 bg-linear-to-t from-[#050508]/80 via-transparent to-transparent" />
                   
                   {/* Dynamic Overlay Elements */}
                   <motion.div 
                     animate={{ y: [0, -10, 0] }}
                     transition={{ duration: 4, repeat: Infinity }}
                     className="absolute bottom-1/4 right-1/4 p-4 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md z-20 shadow-2xl"
                   >
                       <div className="flex items-center gap-3">
                          <Network size={16} className="text-amber-500" />
                          <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-white uppercase tracking-tighter">Linking Sources</span>
                             <div className="w-24 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                <motion.div 
                                  animate={{ x: ['-100%', '100%'] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                  className="w-full h-full bg-amber-500"
                                />
                             </div>
                          </div>
                       </div>
                   </motion.div>
                </div>
            </div>
         </motion.div>
      </section>

      {/* Why Section: The Problem Statement */}
      <section className="py-24 px-6 bg-[#050508] relative">
         <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="relative">
                <div className="absolute -top-10 -left-10 text-[120px] font-black text-white/5 select-none leading-none">?</div>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">Research is <span className="text-red-500/80">Broken.</span></h2>
                <div className="space-y-6 text-gray-400 text-lg leading-relaxed">
                   <p>Traditional AI tools are optimized for <span className="text-white italic">chat</span>, not for <span className="text-white italic">understanding</span>. They hallucinate, lack provenance, and lose the thread of deep investigation.</p>
                   <p>Fragmentation across browser tabs, PDFs, and notes creates a cognitive tax that slows discovery.</p>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[ 
                   { label: "Hallucinated Citations", value: "62%", color: "text-red-400" },
                   { label: "Lost Context", value: "90%", color: "text-amber-400" },
                   { label: "Shadow Data", value: "75%", color: "text-indigo-400" },
                   { label: "Research Tax", value: "4H/Day", color: "text-emerald-400" }
                ].map((stat, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/[0.07] transition-all">
                     <span className={`text-3xl font-black ${stat.color} block mb-1`}>{stat.value}</span>
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-tight">{stat.label}</span>
                  </div>
                ))}
            </div>
         </div>
      </section>

      {/* Loom Feature Demo Section */}
      <section className="py-24 px-6 md:px-20 bg-[#0a0c10]/30 border-y border-white/5">
         <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-20">
            <div className="flex-1">
               <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 mb-8">
                  <Play size={24} />
               </div>
               <h2 className="text-4xl font-bold text-white mb-6 tracking-tighter">See Aira in Action</h2>
               <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                  Watch a 3-minute walk-through of how Aira transforms a disconnected research query into a structured Knowledge Graph with citation fidelity.
               </p>
               <button className="flex items-center gap-3 text-amber-500 font-bold uppercase tracking-widest text-[10px] group border-b border-amber-500/20 pb-1">
                  Watch Full Demo <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
            <div className="flex-1 relative aspect-video w-full rounded-2xl bg-black border border-white/10 overflow-hidden shadow-2xl group cursor-pointer">
                <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                   <div className="w-16 h-16 rounded-full bg-amber-500 text-black flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play size={28} fill="currentColor" />
                   </div>
                </div>
                <NextImage 
                  src="/aira_hero_mockup.png" 
                  alt="Aira Video Demo" 
                  fill 
                  className="object-cover opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700" 
                />
            </div>
         </div>
      </section>

      {/* Comparison Section: Aira vs Old Guards */}
      <section className="py-32 px-6">
         <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-20 tracking-tighter">
               Engineered for <span className="text-amber-500 underline decoration-amber-500/30 underline-offset-8">High Stakes.</span>
            </h2>
            <div className="grid grid-cols-1 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl">
               <div className="grid grid-cols-4 bg-white/5 p-6 border-b border-white/10 items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  <div className="col-span-1">Feature</div>
                  <div className="text-center">Search Engines</div>
                  <div className="text-center">Standard AI</div>
                  <div className="text-center text-amber-500">Aira Platform</div>
               </div>
               {[
                 { f: "Spatial Knowledge Graph", a: true, b: false, c: false },
                 { f: "100% Citation Fidelity", a: true, b: false, c: false },
                 { f: "Autonomous Agents", a: true, b: false, c: false },
                 { f: "Industrial Use Cases", a: true, b: false, c: false },
                 { f: "Real-time Synthesis", a: true, b: true, c: true },
               ].map((row, i) => (
                 <div key={i} className={`grid grid-cols-4 p-6 items-center text-sm ${i % 2 === 0 ? 'bg-white/2' : ''}`}>
                    <div className="text-gray-300 font-medium">{row.f}</div>
                    <div className="flex justify-center">{row.c ? <Shield size={16} className="text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/10" />}</div>
                    <div className="flex justify-center">{row.b ? <Shield size={16} className="text-emerald-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/10" />}</div>
                    <div className="flex justify-center"><Shield size={18} className="text-amber-500 animate-pulse" /></div>
                 </div>
               ))}
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
      <section className="py-20 border-y border-white/5 bg-white/2">
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

      {/* Floating Aira Interaction Widget */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2 }}
        className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4"
      >
         <div className="px-4 py-3 rounded-2xl bg-amber-500 text-black text-xs font-bold shadow-2xl flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all">
            <Sparkles size={16} />
            Ask Aira Anything...
         </div>
      </motion.div>
    </div>
  );
}
