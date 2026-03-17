'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { 
  Search, BookOpen, BrainCircuit, Globe, Volume2, 
  FileText, Compass, PenTool, Sparkles, SlidersHorizontal, 
  Settings2, GitBranch, Wand2, Network 
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
          content: 'An error occurred while connecting to ROSE inference. Please try again.',
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
      {/* Background Dots Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#6366f1 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
          
          {/* Action Bar / Floating Trigger */}
          <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-3 rounded-full bg-indigo-600 shadow-lg shadow-indigo-500/30 text-white hover:scale-110 active:scale-95 transition-all group"
            >
              <SlidersHorizontal size={20} className={showSettings ? "rotate-180 transition-transform" : ""} />
              <span className="absolute right-14 bg-black/80 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Model Engine</span>
            </button>
            
            <button 
              onClick={() => handleSubmit(undefined, "Explain the latest AI trends [Pro]")}
              className="p-3 rounded-full bg-purple-600 shadow-lg shadow-purple-500/30 text-white hover:scale-110 active:scale-95 transition-all group"
            >
              <Wand2 size={20} />
              <span className="absolute right-14 bg-black/80 text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Surprise Me</span>
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
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all ${modelName === model.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-200' : 'bg-[#15151a] border-[#2a2a32] text-gray-400 hover:border-gray-600'}`}
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
                        <span className="text-sm font-medium text-gray-200 flex items-center gap-2"><Sparkles size={14} className={isProSearch ? "text-indigo-400" : ""}/> Pro Search</span>
                        <span className="text-[11px] text-gray-500 mt-1">Deep analysis, iterative multi-step queries</span>
                      </div>
                      <div className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors ${isProSearch ? 'bg-indigo-500' : 'bg-[#2a2a32]'}`} onClick={() => setIsProSearch(!isProSearch)}>
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isProSearch ? 'translate-x-2' : '-translate-x-2'}`} />
                      </div>
                    </label>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── CANVAS EMPTY STATE ─── */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center pt-[15vh] w-full max-w-3xl mx-auto"
            >
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.03)_0%,rgba(14,14,16,0)_60%)] pointer-events-none" />
              
              <div className="text-center mb-8 relative z-10 w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono tracking-widest uppercase mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Infinite Canvas Active
                </div>
                <h2 className="text-4xl md:text-5xl font-medium tracking-tight bg-clip-text text-transparent bg-linear-to-br from-white via-gray-200 to-gray-500 mb-4">
                  Everything connected.
                </h2>
              </div>

              <div className="w-full bg-[#111113]/80 backdrop-blur-xl rounded-2xl border border-[#2a2a32] shadow-2xl overflow-visible focus-within:border-indigo-500/50 focus-within:shadow-[0_0_30px_rgba(99,102,241,0.1)] transition-all duration-300 relative z-20 group">
                <form onSubmit={handleSubmit} className="flex flex-col relative w-full">
                  <div className="flex items-center px-5 py-4 w-full">
                    <span className="text-indigo-400 font-mono text-sm mr-3 font-bold opacity-70">~</span>
                    <input
                      id="canvas-search-input"
                      type="text"
                      className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 outline-none text-[16px] font-sans"
                      placeholder="Type '/' for commands, '@' for agents, or natural language..."
                      aria-label="Canvas search input — type queries, slash commands, or @agent mentions"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoading}
                      autoFocus
                    />
                  </div>
                  
                  {isProSearch && (
                     <div className="absolute right-4 top-4">
                       <span className="bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[9px] uppercase font-bold tracking-wider px-2 py-1 rounded flex items-center gap-1 shadow-[0_0_10px_rgba(99,102,241,0.2)]">
                         <BrainCircuit size={10} /> System 2 Active
                       </span>
                     </div>
                  )}

                  <div className="flex items-center justify-between p-3 border-t border-[#2a2a32]/50 bg-[#0a0a0c]/80 rounded-b-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button type="button" aria-label="Global Logic mode" onClick={() => setFocusMode('All')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'All' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <Globe size={13} /> Global Logic
                      </button>
                      <button type="button" aria-label="Deep Research mode" onClick={() => setFocusMode('Academic')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'Academic' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <BookOpen size={13} /> Deep Research
                      </button>
                      <button type="button" aria-label="Prose Agent mode" onClick={() => setFocusMode('Writing')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'Writing' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <PenTool size={13} /> Prose Agent
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden md:inline text-[10px] text-gray-600 font-mono">Press Enter ↵</span>
                      <button
                        type="submit"
                        aria-label="Submit search query"
                        disabled={!input.trim() || isLoading}
                        className="p-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500/30 disabled:opacity-40 disabled:bg-[#2a2a32] disabled:border-transparent disabled:text-gray-600 transition-all"
                      >
                        <Search size={16} />
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Contextual Smart Chips */}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-8 w-full max-w-4xl relative z-20">
                {[
                  { q: '/execute python data_analysis.py', icon: <FileText size={12}/> },
                  { q: '@research_agent compare OpenAI vs DeepSeek', icon: <Compass size={12}/> },
                  { q: 'Convert this whiteboard to React components', icon: <BrainCircuit size={12}/> },
                  { q: '#current_context Generate unit tests', icon: <Settings2 size={12}/> }
                ].map(({q, icon}) => (
                  <button
                    key={q}
                    aria-label={`Quick query: ${q}`}
                    onClick={() => handleSubmit(undefined, q)}
                    className="flex flex-col bg-[#111113] border border-[#2a2a32] hover:border-indigo-500/50 hover:bg-[#1a1a21] text-left p-4 rounded-xl text-xs text-gray-400 transition-all duration-300 group shadow-sm flex-1 min-w-[200px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                       <div className="p-1.5 rounded-md bg-[#1c1c21] text-indigo-400 group-hover:bg-indigo-500/10 group-hover:scale-110 transition-all">{icon}</div>
                    </div>
                    <span className="leading-snug text-[13px]">{q}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── MESSAGES ─── */}
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
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                  className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* User bubble */}
                  {isUser && (
                    <div className="text-gray-100 text-[20px] font-semibold max-w-[85%] self-end pt-10 pb-2 leading-tight">
                      {message.content}
                    </div>
                  )}

                  {/* Assistant Engine */}
                  {!isUser && (
                    <div className="flex gap-4 w-full">
                      <div className="flex flex-col gap-6 w-full min-w-0">
                        {/* Source cards container */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="flex flex-col gap-3 pb-3 border-b border-[#1e1e24]">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2">
                              {isProSearch && <Sparkles size={12} className="text-indigo-400"/>} Sources
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {message.sources.map((source, idx) => (
                                <SourceCard key={idx} source={source} index={idx} />
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="relative group/answer">
                          <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#111116] prose-pre:border prose-pre:border-[#2a2a32] prose-pre:rounded-xl max-w-none text-gray-200">
                            {message.content.includes('<think>') ? (
                              <div className="flex flex-col gap-4">
                                <details className="group/think bg-[#1c1c21]/30 border border-[#2a2a32]/50 rounded-xl p-1 overflow-hidden transition-all duration-300">
                                  <summary className="list-none flex items-center gap-2 p-3 cursor-pointer hover:bg-white/5 transition-colors font-mono text-xs text-indigo-300/70 select-none">
                                    <BrainCircuit size={14} className="group-open/think:rotate-12 transition-transform" />
                                    <span>Thought Process</span>
                                    <div className="ml-auto w-4 h-4 rounded-full border border-current flex items-center justify-center opacity-40 group-open/think:rotate-180 transition-transform">
                                      <Search size={8} />
                                    </div>
                                  </summary>
                                  <div className="p-4 pt-0 text-[13px] leading-relaxed text-gray-500 font-mono italic border-t border-[#2a2a32]/30 mt-1">
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
                                      code({ inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                          <CodeBlock
                                            language={match[1]}
                                            value={String(children).replace(/\n$/, '')}
                                            {...props}
                                          />
                                        ) : (
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
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
                                      code({ inline, className, children, ...props }: any) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                          <CodeBlock
                                            language={match[1]}
                                            value={String(children).replace(/\n$/, '')}
                                            {...props}
                                          />
                                        ) : (
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        );
                                      }
                                    }}
                                  >
                                    {message.content}
                                  </ReactMarkdown>
                                </div>
                            )}
                          </div>
                          
                          {/* Answer Action Bar */}
                          <div className="flex items-center gap-1 mt-6 opacity-0 group-hover/answer:opacity-100 transition-opacity">
                            <CopyButton text={message.content} />
                            <button 
                              onClick={() => handleReadAloud(message.id, message.content)}
                              className={`p-1.5 rounded-lg hover:bg-[#1c1c21] text-gray-500 hover:text-gray-300 transition-all ${playingId === message.id ? 'text-indigo-400 animate-pulse' : ''}`}
                              title="Read aloud"
                            >
                              <Volume2 size={16} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-[#1c1c21] text-gray-500 hover:text-gray-300 transition-all" title="View Source Graph">
                              <Network size={16} />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-[#1c1c21] text-gray-500 hover:text-gray-300 transition-all font-mono text-[10px] px-2" title="Create Private Branch">
                              + Branch
                            </button>
                          </div>
                        </div>

                        {/* Follow up suggestions */}
                        {followUps.length > 0 && (
                          <div className="pt-4 border-t border-[#1e1e24]/50 flex flex-col gap-3">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-600 flex items-center gap-2">
                              <GitBranch size={12} className="rotate-90"/> Related Pathways
                            </h4>
                            <div className="flex flex-col gap-2">
                              {followUps.map((q, idx) => (
                                <button 
                                  key={idx}
                                  onClick={() => handleSubmit(undefined, q)}
                                  className="text-left text-sm py-2 px-3 rounded-lg border border-[#2a2a32] hover:border-indigo-500/30 hover:bg-[#1c1c21] transition-all group flex items-center justify-between"
                                >
                                  <span className="text-gray-400 group-hover:text-gray-200">{q}</span>
                                  <SlidersHorizontal size={12} className="text-gray-600 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 py-10"
            >
              <div className="w-5 h-5 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm font-mono text-gray-500 animate-pulse">ContextRiver is thinking...</p>
            </motion.div>
          )}

          <div ref={messagesEndRef} className="h-24" />
      </div>
    </main>
    </LazyMotion>
  );
}
