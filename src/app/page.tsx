'use client';
import React from 'react';

import { Search, BookOpen, BrainCircuit, Globe, Volume2, FileText, Compass, PenTool, Sparkles, SlidersHorizontal, Settings2, GitBranch, Wand2 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { motion, AnimatePresence } from 'framer-motion';
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

export default function Home() {
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

    // Command Parser (No mocks - real feature mapping)
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
      // Future capability: actual container execution. For now, we instruct the LLM to write the exact standalone code.
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

  /** Custom react-markdown component map for syntax-highlighted code blocks + citations */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markdownComponents: any = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    code({ className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeContent = String(children).replace(/\n$/, '');
      const isBlock = codeContent.includes('\n') || match;
      if (isBlock) {
        return (
          <CodeBlock language={match ? match[1] : 'text'}>
            {codeContent}
          </CodeBlock>
        );
      }
      return (
        <code className="bg-[#1c1c21] border border-[#2a2a32] text-indigo-300 px-1.5 py-0.5 rounded text-[0.82em] font-mono" {...props}>
          {children}
        </code>
      );
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    think({ children }: any) {
      return (
        <details className="mb-6 bg-[#111113] border border-[#2a2a32] rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden shadow-inner group">
          <summary className="px-4 py-2.5 text-xs font-semibold text-gray-400 cursor-pointer hover:bg-[#1c1c21] transition-colors flex items-center gap-2 uppercase tracking-wide select-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 group-open:hidden transition-transform"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4"/><path d="M8 12h8"/></svg>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 hidden group-open:block transition-transform"><circle cx="12" cy="12" r="10"/><path d="m16 12-4 4-4-4"/><path d="M12 8v8"/></svg>
            Thought Process
          </summary>
          <div className="px-4 pb-4 pt-3 text-[14px] text-gray-400 font-sans border-t border-[#2a2a32]/50 italic leading-relaxed whitespace-pre-wrap">
            {children}
          </div>
        </details>
      );
    },
    // Intercept [1], [2] brackets to render them as citation badges
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    p({ children }: any) {
      const modifiedChildren = React.Children.map(children, child => {
        if (typeof child === 'string') {
          return child.split(/(\[\d+\])/g).map((part, i) => {
            const match = part.match(/\[(\d+)\]/);
            if (match) {
              return (
                <sup key={i} className="inline-flex cursor-pointer text-xs font-semibold px-1 rounded-sm bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/40 transition-colors mx-0.5 relative -top-1">
                  {match[1]}
                </sup>
              );
            }
            return part;
          });
        }
        return child;
      });
      return <p className="mb-4">{modifiedChildren}</p>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e10] text-gray-100 font-sans relative">
      <main className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin scrollbar-thumb-[#2a2a32] scrollbar-track-transparent">
        <div className="max-w-4xl mx-auto flex flex-col gap-8 pb-40">

          {/* ─── HEADER / SETTINGS ─── */}
          {messages.length === 0 && (
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-gray-400 hover:bg-[#1c1c21] transition-colors"
              >
                <Settings2 size={14} /> Models & Controls
              </button>
            </div>
          )}
          
          <AnimatePresence>
            {showSettings && messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="bg-[#1c1c21] border border-[#2a2a32] rounded-2xl p-5 shadow-2xl overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row gap-8">
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <BrainCircuit size={14}/> Base Model
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
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
                      type="text"
                      className="w-full bg-transparent text-gray-100 placeholder:text-gray-600 outline-none text-[16px] font-sans"
                      placeholder="Type '/' for commands, '@' for agents, or natural language..."
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
                      <button type="button" onClick={() => setFocusMode('All')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'All' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <Globe size={13} /> Global Logic
                      </button>
                      <button type="button" onClick={() => setFocusMode('Academic')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'Academic' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <BookOpen size={13} /> Deep Research
                      </button>
                      <button type="button" onClick={() => setFocusMode('Writing')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${focusMode === 'Writing' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:bg-[#1c1c21] hover:text-gray-300'}`}>
                        <PenTool size={13} /> Prose Agent
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden md:inline text-[10px] text-gray-600 font-mono">Press Enter ↵</span>
                      <button
                        type="submit"
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
                            <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-[#2a2a32] scrollbar-track-transparent">
                              {message.sources.map((s, idx) => (
                                <div key={idx} className="snap-start shrink-0">
                                  <SourceCard source={s} index={idx} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Markdown content Engine Style */}
                        <div className="flex gap-4">
                          <div className="w-8 h-8 rounded-full bg-[#1c1c21] shrink-0 flex items-center justify-center mt-1 border border-[#2a2a32]">
                            <Search size={14} className="text-gray-300" />
                          </div>
                          
                          <div className="flex flex-col w-full max-w-none">
                            <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 mt-1 flex items-center gap-2">Answer</h3>
                            <div className="prose prose-invert prose-p:leading-[1.75] prose-p:text-gray-300 prose-headings:text-gray-100 prose-strong:text-gray-100 prose-li:text-gray-300 prose-code:text-indigo-300 text-[16px] max-w-none font-serif tracking-[0.01em]">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw]}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                components={markdownComponents as any}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>

                            {/* Action bar */}
                            {!isLoading && message.content && (
                              <div className="flex items-center gap-2 mt-6 flex-wrap">
                                <CopyButton text={message.content} />
                                <button
                                  onClick={() => handleReadAloud(message.id, message.content)}
                                  disabled={playingId !== null && playingId !== message.id}
                                  className={`flex items-center gap-2 text-xs transition-colors border border-[#2a2a32] bg-[#1c1c21] px-3 py-1.5 rounded-full hover:border-[#3a3a42] disabled:opacity-40 outline-none ${playingId === message.id ? 'text-indigo-400 border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                                >
                                  <Volume2 size={13} />
                                  {playingId === message.id ? 'Playing…' : 'Speech'}
                                </button>
                                <button
                                  className="flex items-center gap-2 text-xs transition-colors border border-[#2a2a32] bg-[#1c1c21] px-3 py-1.5 rounded-full hover:border-indigo-500/50 hover:text-indigo-300 text-gray-400 outline-none"
                                >
                                  <GitBranch size={13} />
                                  Branch
                                </button>
                                <span className="text-[10px] uppercase font-bold text-gray-600 tracking-wider ml-auto pr-2 flex items-center gap-1.5">
                                  <Wand2 size={10} className="text-indigo-500/50" />
                                  {modelName} engine
                                </span>
                              </div>
                            )}

                            {/* Follow-up pills */}
                            {followUps.length > 0 && (
                              <div className="flex flex-col gap-3 mt-6 border-t border-[#1e1e24] pt-6">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 flex items-center gap-2"><SlidersHorizontal size={12}/> Related Queries</p>
                                <div className="flex flex-col gap-2">
                                  {followUps.map((q) => (
                                    <button
                                      key={q}
                                      onClick={() => handleSubmit(undefined, q)}
                                      className="text-[15px] font-medium text-left text-gray-300 hover:text-indigo-400 py-2 border-b border-[#2a2a32] last:border-0 transition-colors duration-200 focus:outline-none flex justify-between items-center group"
                                    >
                                      {q}
                                      <span className="text-gray-600 group-hover:text-indigo-400 transition-colors">+</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* ─── SKELETON LOADER ─── */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 pt-10"
            >
              <div className="flex flex-col gap-6 w-full min-w-0">
                <div className="h-16 w-full max-w-sm bg-[#1c1c21] rounded-xl animate-pulse" />
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#1c1c21] shrink-0 animate-pulse border border-[#2a2a32]" />
                  <div className="flex flex-col gap-3 w-full max-w-2xl pt-2">
                    {[1, 0.9, 0.95, 0.4].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 bg-[#1c1c21] rounded animate-pulse"
                        style={{ width: `${w * 100}%`, animationDelay: `${i * 100}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* ─── FLOATING BOTTOM INPUT ─── */}
      {messages.length > 0 && (
        <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none">
          <div className="max-w-3xl mx-auto pointer-events-auto">
            <form
              onSubmit={handleSubmit}
              className="relative flex flex-col bg-[#1c1c21] border border-[#2a2a32] rounded-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] focus-within:border-indigo-500/40 focus-within:ring-4 ring-indigo-500/10 transition-all duration-300"
            >
              <input
                type="text"
                className="w-full bg-transparent text-gray-100 placeholder:text-gray-500 pt-5 pb-16 px-6 outline-none text-[15px] font-medium"
                placeholder="Ask follow-up..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer border transition-colors ${isProSearch ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-[#15151a] border-[#2a2a32] text-gray-500 hover:text-gray-300 hover:bg-[#1c1c21]'}`}>
                    <Sparkles size={12}/> Pro Search
                    <input type="checkbox" className="hidden" checked={isProSearch} onChange={() => setIsProSearch(!isProSearch)} />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-indigo-500 text-white rounded-full hover:bg-indigo-400 disabled:opacity-40 disabled:bg-[#2a2a32] disabled:text-gray-500 transition-colors shadow-md"
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
