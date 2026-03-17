'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Search, BookOpen, BrainCircuit, Globe, Volume2,
  Compass, Sparkles, SlidersHorizontal,
  GitBranch, Wand2, Network, CheckCircle2, FileText
} from 'lucide-react';
import { LazyMotion, domMax, m as motion, AnimatePresence } from 'framer-motion';

// Dynamic imports for heavy content
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

import { SourceCard } from '@/components/ui/SourceCard';
import { CopyButton } from '@/components/ui/CopyButton';
import { CodeBlock } from '@/components/ui/CodeBlock';
import type { FirestoreSource } from '@/lib/schemas';

type Role = 'user' | 'assistant' | 'system';
type Message = { id: string; role: Role; content: string; sources?: FirestoreSource[] };

const FOLLOW_UP_SUFFIX_LENGTH = 3;

function extractFollowUps(content: string): string[] {
  const sentences = content
    .split(/[.!?]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15 && s.length < 80);

  const candidates = Array.from(new Set(sentences)).slice(0, 8);
  const followUps: string[] = [];

  for (const s of candidates) {
    const lower = s.toLowerCase();
    if (
      lower.includes('how') || lower.includes('what') || lower.includes('why') || 
      lower.includes('when') || lower.includes('explain') || lower.includes('describe')
    ) {
      followUps.push(s.charAt(0).toUpperCase() + s.slice(1) + '?');
      if (followUps.length === FOLLOW_UP_SUFFIX_LENGTH) break;
    }
  }
  return followUps;
}

export default function InfiniteCanvas() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusMode, setFocusMode] = useState<'All' | 'Academic' | 'Writing' | 'Web'>('All');
  const [isProSearch, setIsProSearch] = useState(false);
  const [modelName, setModelName] = useState<'llama-3.1-8b' | 'llama-3.3-70b' | 'mixtral-8x7b' | 'deepseek-r1'>('llama-3.1-8b');
  const [showSettings, setShowSettings] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loaderIndex, setLoaderIndex] = useState(0);

  const thinkLabels = [
    "Aira is synthesizing sources...",
    "Verifying claim provenance...",
    "Spatial indexing knowledge graph...",
    "Mapping cross-domain connections...",
    "Synthesizing high-fidelity answer..."
  ];

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setLoaderIndex((prev) => (prev + 1) % thinkLabels.length);
      }, 2500);
      return () => clearInterval(interval);
    } else {
      setLoaderIndex(0);
    }
  }, [isLoading, thinkLabels.length]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || input;
    if (!query.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    let executionFocus = focusMode;
    let executionPro = isProSearch;
    let finalQuery = query.trim();

    if (finalQuery.startsWith('/write')) {
      executionFocus = 'Writing';
      finalQuery = finalQuery.replace(/^\/write\s*/, '');
    } else if (finalQuery.startsWith('@research_agent')) {
      executionPro = true;
      executionFocus = 'Academic';
      finalQuery = finalQuery.replace(/^@research_agent\s*/, '');
    } else if (finalQuery.startsWith('#current_context') || finalQuery.startsWith('#local')) {
      executionFocus = 'All';
      finalQuery = finalQuery.replace(/^#(current_context|local)\s*/, '');
    } else if (finalQuery.startsWith('/execute python')) {
      executionFocus = 'Writing';
      finalQuery = `Write the raw Python code to solve this, output only code block: ` + finalQuery.replace(/^\/execute python\s*/, '');
    }

    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user' as Role, content: finalQuery },
    ];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: newMessages, 
          chatId,
          focusMode: executionFocus,
          isProSearch: executionPro,
          modelConfig: { modelName, temperature: executionFocus === 'Writing' ? 0.7 : 0.3 }
        }),
      });

      if (!res.ok) throw new Error(res.statusText);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantMsgId = `${Date.now()}-ai`;

      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '' },
      ]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          let addedText = '';
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                addedText += JSON.parse(line.slice(2));
              } catch { /* ignore */ }
            } else if (line.startsWith('e:')) {
              try {
                const meta = JSON.parse(line.slice(2));
                if (meta.chatId) setChatId(meta.chatId);
              } catch { /* ignore */ }
            } else if (line.startsWith('s:')) {
              try {
                const sources = JSON.parse(line.slice(2));
                setMessages((prev) => {
                  const clone = [...prev];
                  clone[clone.length - 1] = { ...clone[clone.length - 1], sources };
                  return clone;
                });
              } catch { /* ignore */ }
            }
          }

          if (addedText) {
            setMessages((prev) => {
              const clone = [...prev];
              clone[clone.length - 1] = { 
                ...clone[clone.length - 1], 
                content: clone[clone.length - 1].content + addedText 
              };
              return clone;
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'An error occurred while connecting to Aira inference. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, input, isLoading, chatId, focusMode, isProSearch, modelName]);

  const handleReadAloud = useCallback(async (msgId: string, text: string) => {
    if (playingId === msgId) return;
    setPlayingId(msgId);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.replace(/[*#`>]/g, '') }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setPlayingId(null);
      audio.play();
    } catch (e) {
      console.error('TTS error', e);
      setPlayingId(null);
    }
  }, [playingId]);

  return (
    <LazyMotion features={domMax}>
    <main className="flex-1 overflow-y-auto scrollbar-none relative">
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#6366f1 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/30 text-black hover:scale-110 active:scale-95 transition-all group"
            >
              <SlidersHorizontal size={20} className={showSettings ? "rotate-180 transition-transform" : ""} />
            </button>
            <button 
              onClick={() => {}}
              className="p-3 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-white hover:scale-110 active:scale-95 transition-all group"
            >
               <FileText size={20} />
               <span className="absolute right-14 bg-black/80 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Export Workspace</span>
            </button>
            <button 
              onClick={() => handleSubmit(undefined, "Synthesize a deep analysis on the future of AGI")}
              className="p-3 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white hover:scale-110 active:scale-95 transition-all group"
            >
              <Wand2 size={20} />
               <span className="absolute right-14 bg-black/80 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Autonomous Jumpstart</span>
            </button>
          </div>

          <AnimatePresence>
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                className="fixed bottom-24 right-8 z-50 w-72 p-6 rounded-2xl bg-[#111116]/95 backdrop-blur-xl border border-[#2a2a32] shadow-2xl"
              >
                <div className="flex flex-col gap-6">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                       <GitBranch size={14}/> Compute Logic
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: 'llama-3.1-8b', label: 'LLaMA 3.1 8B', tag: 'Fast' },
                        { id: 'llama-3.3-70b', label: 'LLaMA 3.3 70B', tag: 'Smart' },
                        { id: 'mixtral-8x7b', label: 'Mixtral 8x7B', tag: 'MoE' },
                        { id: 'deepseek-r1', label: 'DeepSeek R1', tag: 'Reasoning' },
                      ].map(model => (
                        <button
                          key={model.id}
                          onClick={() => setModelName(model.id as 'llama-3.1-8b' | 'llama-3.3-70b' | 'mixtral-8x7b' | 'deepseek-r1')}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${modelName === model.id ? 'bg-amber-500/10 border-amber-500/50 text-amber-200' : 'bg-[#15151a] border-[#2a2a32] text-gray-400 hover:border-gray-600'}`}
                        >
                          <span className="font-medium">{model.label}</span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-black/40 text-gray-500">{model.tag}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Compass size={14}/> Retrieval Context
                    </h4>
                    <label className="flex items-center justify-between p-3 rounded-xl border border-[#2a2a32] bg-[#15151a] cursor-pointer hover:border-gray-600 transition-colors">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-200 flex items-center gap-2"><Sparkles size={14} className={isProSearch ? "text-amber-400" : ""}/> Pro Search</span>
                        <span className="text-[11px] text-gray-500 mt-1">Deep analysis mode</span>
                      </div>
                      <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${isProSearch ? 'bg-amber-500' : 'bg-[#2a2a32]'}`} onClick={() => setIsProSearch(!isProSearch)}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isProSearch ? 'translate-x-2' : '-translate-x-2'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="flex flex-col items-center justify-center pt-[10vh] w-full max-w-4xl mx-auto"
            >
              <div className="text-center mb-10 w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-mono tracking-widest uppercase mb-6">
                  Knowledge Graph Engine Active
                </div>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-8">
                  Define your <span className="text-transparent bg-clip-text bg-linear-to-r from-amber-200 to-amber-500">Hypothesis.</span>
                </h2>
                <div className="flex gap-4 justify-center mb-10">
                   <button 
                     onClick={() => handleSubmit(undefined, "How will quantum computing disrupt current encryption standards?")}
                     className="px-4 py-2 rounded-full bg-amber-500/5 border border-amber-500/20 text-amber-500/80 text-xs font-medium hover:bg-amber-500/10 transition-all"
                   >
                      Sample Research: Quantum Crypto →
                   </button>
                </div>
              </div>

              {/* Research Staging Area */}
              <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                 <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                       <FileText size={20} />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Drop PDF/Data</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                       <Globe size={20} />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Connect URL</span>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                       <Network size={20} />
                    </div>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Import Graph</span>
                 </div>
              </div>

              <div className="w-full bg-[#111113]/80 backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl overflow-visible focus-within:border-amber-500/50 transition-all duration-300 relative z-20 group">
                <form onSubmit={handleSubmit} className="flex flex-col relative w-full">
                  <div className="flex items-center px-5 py-4 w-full">
                    <span className="text-amber-500 font-mono text-sm mr-3 font-bold opacity-70">~</span>
                    <input
                      id="canvas-search-input"
                      type="text"
                      className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 outline-none text-[16px] font-sans"
                      placeholder="Type your hypothesis or research question..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border-t border-[#2a2a32]/50 bg-[#0a0a0c]/80 rounded-b-2xl">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setFocusMode('All')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'All' ? 'bg-[#2a2a32] text-amber-400' : 'text-gray-500 hover:bg-[#1c1c21]'}`}>
                        <Globe size={13} className="inline mr-1"/> Global
                      </button>
                      <button type="button" onClick={() => setFocusMode('Academic')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'Academic' ? 'bg-[#2a2a32] text-amber-400' : 'text-gray-500 hover:bg-[#1c1c21]'}`}>
                        <BookOpen size={13} className="inline mr-1"/> Academic
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-1.5 bg-amber-500 text-black rounded-lg hover:bg-amber-400 disabled:opacity-40 transition-all"
                    >
                      <Search size={16} />
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((message, msgIdx) => {
              const isUser = message.role === 'user';
              const isLastAssistant = !isUser && msgIdx === messages.length - 1 && !isLoading;
              const followUps = isLastAssistant ? extractFollowUps(message.content) : [];

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {isUser && (
                    <div className="text-gray-100 text-[20px] font-semibold max-w-[85%] self-end pt-10 pb-2">
                      {message.content}
                    </div>
                  )}

                  {!isUser && (
                    <div className="flex gap-4 w-full">
                      <div className="flex flex-col gap-6 w-full min-w-0">
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-3 mb-2">
                             <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                <Sparkles size={14} className="text-amber-500" />
                             </div>
                             <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Aira Research Agent</span>
                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-bold uppercase">
                                <CheckCircle2 size={10} /> High Fidelity [98%]
                             </div>
                             <div className="ml-auto text-[10px] font-mono text-gray-600 uppercase tracking-tighter">
                                PROVENANCE STACK v1.4
                             </div>
                          </div>

                          {message.sources && message.sources.length > 0 && (
                            <div className="flex flex-col gap-3 pb-3 border-b border-[#1e1e24]">
                              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                Sources
                              </h3>
                              <div className="flex flex-wrap gap-2">
                                {message.sources.map((source, idx) => (
                                  <SourceCard key={idx} source={source} index={idx} />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="relative group/answer">
                            <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-gray-200">
                              {message.content.includes('<think>') ? (
                                <div className="flex flex-col gap-4">
                                  <details open className="group/think bg-[#0a0c10] border border-white/5 rounded-xl p-1 shadow-inner">
                                    <summary className="list-none flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-colors font-mono text-[11px] text-amber-500 font-bold uppercase tracking-widest select-none">
                                      <BrainCircuit size={14} />
                                      <span>Autonomous Reasoning Trace</span>
                                      <div className="ml-auto flex items-center gap-4 text-gray-600 text-[10px]">
                                         <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> Plan Found</span>
                                         <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500"/> Sources Scanned</span>
                                      </div>
                                    </summary>
                                    <div className="p-5 pt-2 text-[13px] leading-relaxed text-gray-400 font-mono italic border-t border-white/5 mt-1 bg-[#050508]/50 rounded-b-xl">
                                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                                        {message.content.match(/<think>([\s\S]*?)<\/think>/)?.[1] || ''}
                                      </ReactMarkdown>
                                    </div>
                                  </details>
                                  <div className="text-[16px] leading-7 assistant-content">
                                    <ReactMarkdown 
                                      remarkPlugins={[remarkGfm]} 
                                      rehypePlugins={[rehypeRaw]}
                                      components={{
                                        code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                          const match = /language-(\w+)/.exec(className || '');
                                          const codeContent = String(children).replace(/\n$/, '');
                                          return !inline && match ? (
                                            <CodeBlock language={match[1]} {...props}>{codeContent}</CodeBlock>
                                          ) : (
                                            <code className={className} {...props}>{children}</code>
                                          );
                                        }
                                      }}
                                    >
                                      {message.content.replace(/<think>[\s\S]*?<\/think>/, '').trim()}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-[16px] leading-7 assistant-content">
                                  <ReactMarkdown 
                                    remarkPlugins={[remarkGfm]} 
                                    rehypePlugins={[rehypeRaw]}
                                    components={{
                                      code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        const codeContent = String(children).replace(/\n$/, '');
                                        return !inline && match ? (
                                          <CodeBlock language={match[1]} {...props}>{codeContent}</CodeBlock>
                                        ) : (
                                          <code className={className} {...props}>{children}</code>
                                        );
                                      }
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 mt-6 opacity-0 group-hover/answer:opacity-100 transition-opacity">
                              <CopyButton text={message.content} />
                              <button onClick={() => handleReadAloud(message.id, message.content)} className={`p-1.5 rounded-lg hover:bg-[#1c1c21] text-gray-500 ${playingId === message.id ? 'text-amber-400' : ''}`}>
                                <Volume2 size={16} />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-[#1c1c21] text-gray-500">
                                <Network size={16} />
                              </button>
                            </div>
                          </div>

                          {followUps.length > 0 && (
                            <div className="pt-4 border-t border-[#1e1e24]/50 flex flex-col gap-3">
                              <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Related Pathways</h4>
                              <div className="flex flex-col gap-2">
                                {followUps.map((q, idx) => (
                                  <button key={idx} onClick={() => handleSubmit(undefined, q)} className="text-left text-sm py-2 px-3 rounded-lg border border-[#2a2a32] hover:border-amber-500/30 hover:bg-[#1c1c21] group flex items-center justify-between transition-all">
                                    <span className="text-gray-400 group-hover:text-amber-200">{q}</span>
                                    <ArrowRight size={12} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-all" />
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 py-10">
              <div className="w-5 h-5 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin shadow-[0_0_10px_rgba(245,158,11,0.2)]" />
              <div className="flex flex-col">
                <p className="text-sm font-mono text-gray-400 font-bold uppercase tracking-wider">{thinkLabels[loaderIndex]}</p>
                <p className="text-[10px] font-mono text-gray-600">Autonomous Reasoning Engine Active</p>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-24" />
      </div>
    </main>
    </LazyMotion>
  );
}

const ArrowRight = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 12h14m-7-7 7 7-7 7" />
  </svg>
);
