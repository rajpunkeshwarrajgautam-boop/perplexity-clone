'use client';
import { Search, BookOpen, BrainCircuit, Globe, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'framer-motion';
import { SourceCard } from '@/components/ui/SourceCard';
import { CopyButton } from '@/components/ui/CopyButton';
import { CodeBlock } from '@/components/ui/CodeBlock';
import type { Components } from 'react-markdown';

type SourceType = { id: number; title: string; relevance: string; url?: string };
type Role = 'user' | 'assistant' | 'system';
type Message = { id: string; role: Role; content: string; sources?: SourceType[] };

/** Suggested follow-up questions derived from the latest AI answer */
const FOLLOW_UP_SUFFIX_LENGTH = 3;

/** Rough heuristic: parse up to 3 plausible follow-up questions from the response */
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
      lower.includes('how') ||
      lower.includes('what') ||
      lower.includes('why') ||
      lower.includes('when') ||
      lower.includes('explain') ||
      lower.includes('describe')
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
  const [focusMode, setFocusMode] = useState<'All' | 'Academic'>('All');
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

    const newMessages: Message[] = [
      ...messages,
      { id: Date.now().toString(), role: 'user' as Role, content: query },
    ];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, chatId }),
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
                  const last = { ...clone[clone.length - 1], sources };
                  clone[clone.length - 1] = last;
                  return clone;
                });
              } catch { /* ignore */ }
            }
          }

          if (addedText) {
            setMessages((prev) => {
              const clone = [...prev];
              const last = { ...clone[clone.length - 1] };
              last.content += addedText;
              clone[clone.length - 1] = last;
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
          content: 'An error occurred while fetching the response. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, input, isLoading, chatId]);

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

  /** Custom react-markdown component map for syntax-highlighted code blocks */
  const markdownComponents: Components = {
    code({ className, children, ...props }) {
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
        <code
          className="bg-[#1c1c21] border border-[#2a2a32] text-indigo-300 px-1.5 py-0.5 rounded text-[0.82em] font-mono"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e10] text-gray-100 font-sans relative">
      <main className="flex-1 overflow-y-auto px-4 py-8 scrollbar-thin scrollbar-thumb-[#2a2a32] scrollbar-track-transparent">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-40">

          {/* ─── EMPTY STATE ─── */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-4xl font-semibold text-gray-100 tracking-tight">
                  What do you want to know?
                </h2>
                <p className="text-gray-500 text-base">Search across your RAG knowledge base instantly.</p>
              </div>

              <div className="w-full max-w-2xl bg-[#1c1c21] rounded-2xl border border-[#2a2a32] shadow-2xl overflow-hidden focus-within:border-indigo-500/40 transition-colors duration-200">
                <form onSubmit={handleSubmit} className="flex flex-col">
                  <input
                    type="text"
                    className="w-full bg-transparent text-gray-100 placeholder:text-gray-500 p-5 outline-none text-lg"
                    placeholder="Ask anything..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                  <div className="flex items-center justify-between p-3 border-t border-[#2a2a32] bg-[#15151a]">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFocusMode('All')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${focusMode === 'All' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <Globe size={14} /> All
                      </button>
                      <button
                        type="button"
                        onClick={() => setFocusMode('Academic')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${focusMode === 'Academic' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        <BookOpen size={14} /> Academic
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:bg-[#2a2a32] disabled:text-gray-500 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick suggestions */}
              <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
                {['What is Semantic Search?', 'Explain Agentic RAG', 'Vector DBs overview', 'How to map chunks?'].map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSubmit(undefined, q)}
                    className="bg-[#1c1c21] border border-[#2a2a32] hover:border-[#3a3a42] text-left p-3.5 rounded-xl text-sm text-gray-400 transition-all duration-200 flex items-center gap-3 group hover:bg-[#25252b]"
                  >
                    <Search size={16} className="text-gray-600 group-hover:text-indigo-400 transition-colors shrink-0" />
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ─── MESSAGES ─── */}
          <AnimatePresence initial={false}>
            {messages.map((message, msgIdx) => {
              const isUser = message.role === 'user';
              const isLastAssistant =
                !isUser && msgIdx === messages.length - 1 && !isLoading;
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
                    <p className="text-gray-100 text-[17px] font-medium max-w-[85%] self-end pt-8 pb-1 leading-snug">
                      {message.content}
                    </p>
                  )}

                  {/* Assistant bubble */}
                  {!isUser && (
                    <div className="flex gap-4 w-full">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 shrink-0 flex items-center justify-center mt-1">
                        <BrainCircuit size={16} className="text-indigo-400" />
                      </div>

                      <div className="flex flex-col gap-4 w-full min-w-0">
                        {/* Source cards */}
                        {message.sources && message.sources.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center gap-2">
                              <BookOpen size={13} /> Sources
                            </h3>
                            <div className="flex gap-3 overflow-x-auto pb-2 snap-x scrollbar-thin scrollbar-thumb-[#2a2a32] scrollbar-track-transparent">
                              {message.sources.map((s, idx) => (
                                <div key={idx} className="snap-start shrink-0">
                                  <SourceCard source={s} index={idx} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Markdown content */}
                        <div className="prose prose-invert prose-p:leading-relaxed prose-p:text-gray-200 prose-headings:text-gray-100 prose-strong:text-gray-100 prose-li:text-gray-300 prose-code:text-indigo-300 text-[15px] max-w-none">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={markdownComponents}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>

                        {/* Action bar */}
                        {!isLoading && message.content && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <CopyButton text={message.content} />
                            <button
                              onClick={() => handleReadAloud(message.id, message.content)}
                              disabled={playingId !== null && playingId !== message.id}
                              className={`flex items-center gap-2 text-xs transition-colors border border-[#2a2a32] bg-[#1c1c21] px-3 py-1.5 rounded-full hover:border-[#3a3a42] disabled:opacity-40 ${playingId === message.id ? 'text-indigo-400 border-indigo-500/30' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                              <Volume2 size={13} />
                              {playingId === message.id ? 'Playing…' : 'Read Aloud'}
                            </button>
                          </div>
                        )}

                        {/* Follow-up pills */}
                        {followUps.length > 0 && (
                          <div className="flex flex-col gap-2 mt-2 border-t border-[#1e1e24] pt-4">
                            <p className="text-xs text-gray-600 font-medium uppercase tracking-wider">Related</p>
                            <div className="flex flex-wrap gap-2">
                              {followUps.map((q) => (
                                <button
                                  key={q}
                                  onClick={() => handleSubmit(undefined, q)}
                                  className="text-xs text-gray-400 bg-[#1c1c21] border border-[#2a2a32] hover:border-indigo-500/40 hover:text-indigo-300 px-3 py-1.5 rounded-full transition-colors duration-200"
                                >
                                  {q}
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

          {/* ─── SKELETON LOADER ─── */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 pt-4"
            >
              <div className="w-8 h-8 rounded-full bg-[#1c1c21] shrink-0 animate-pulse" />
              <div className="flex flex-col gap-2.5 w-full max-w-lg pt-1.5">
                {[1, 0.83, 0.65].map((w, i) => (
                  <div
                    key={i}
                    className="h-4 bg-[#1c1c21] rounded animate-pulse"
                    style={{ width: `${w * 100}%`, animationDelay: `${i * 100}ms` }}
                  />
                ))}
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
              className="relative flex flex-col bg-[#1c1c21] border border-[#2a2a32] rounded-2xl shadow-2xl focus-within:border-indigo-500/40 transition-colors duration-200"
            >
              <input
                type="text"
                className="w-full bg-transparent text-gray-100 placeholder:text-gray-500 pt-4 pb-14 px-5 outline-none text-[15px]"
                placeholder="Ask a follow-up..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-white text-black rounded-full hover:bg-gray-100 disabled:opacity-40 disabled:bg-[#2a2a32] disabled:text-gray-500 transition-colors"
                  aria-label="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
