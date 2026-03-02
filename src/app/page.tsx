'use client';
import { Search, Compass, BookOpen, BrainCircuit, Globe } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';

type Role = 'user' | 'assistant' | 'system';
type Message = { id: string; role: Role; content: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusMode, setFocusMode] = useState<'All'|'Academic'|'Gov'>('All');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent, presetQuery?: string) => {
    if (e) e.preventDefault();
    const query = presetQuery || input;
    if (!query.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    const newMessages = [...messages, { id: Date.now().toString(), role: 'user' as Role, content: query }];
    setMessages(newMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: newMessages, chatId })
      });

      if (!res.ok) throw new Error(res.statusText);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      
      const assistantMsgId = Date.now().toString() + "-ai";
      setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          let addedText = "";
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const text = JSON.parse(line.slice(2));
                addedText += text;
              } catch (err) {}
            } else if (line.startsWith('e:')) {
              try {
                const meta = JSON.parse(line.slice(2));
                if (meta.chatId) setChatId(meta.chatId);
              } catch (err) {}
            }
          }

          if (addedText) {
            setMessages(prev => {
              const clone = [...prev];
              const lastIndex = clone.length - 1;
              const last = { ...clone[lastIndex] };
              last.content += addedText;
              clone[lastIndex] = last;
              return clone;
            });
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: 'An error occurred while fetching the response.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0e0e10] text-gray-100 font-sans relative">
      <main className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-32">
          
          {messages.length === 0 && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6"
            >
              <h2 className="text-4xl font-semibold text-gray-100 tracking-tight">What do you want to know?</h2>

              <div className="w-full max-w-2xl bg-[#1c1c21] rounded-2xl border border-[#2a2a32] shadow-2xl overflow-hidden focus-within:border-indigo-500/50 transition-colors">
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
                        <button type="button" onClick={() => setFocusMode('All')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${focusMode === 'All' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}><Globe size={14}/> All</button>
                        <button type="button" onClick={() => setFocusMode('Academic')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${focusMode === 'Academic' ? 'bg-[#2a2a32] text-gray-200' : 'text-gray-500 hover:text-gray-300'}`}><BookOpen size={14}/> Academic</button>
                     </div>
                     <button
                        type="submit"
                        disabled={!(input || '').trim() || isLoading}
                        className="p-2 bg-white text-black rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:bg-gray-700 disabled:text-gray-400 transition-colors"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                      </button>
                  </div>
                </form>
              </div>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mt-8">
                {["What is Semantic Search?", "Explain Agentic RAG", "Vector DBs overview", "How to map chunks?"].map(q => (
                   <button 
                     key={q} 
                     onClick={() => handleSubmit(undefined, q)}
                     className="bg-[#1c1c21] border border-[#2a2a32] hover:border-[#3a3a42] text-left p-3.5 rounded-xl text-sm text-gray-400 transition-colors flex items-center gap-3 group"
                   >
                     <Search size={16} className="text-gray-600 group-hover:text-indigo-400 transition-colors" />
                     {q}
                   </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <motion.div 
                   key={message.id} 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {isUser && (
                    <div className="text-gray-100 text-[17px] font-medium max-w-[85%] self-end pt-8 pb-2">
                       {message.content}
                    </div>
                  )}
                  
                  {!isUser && (
                    <div className="flex gap-4 w-full">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 flex items-center justify-center mt-1">
                         <BrainCircuit size={16} className="text-indigo-400" />
                      </div>
                      
                      <div className="flex flex-col gap-3 w-full">
                        <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1c1c21] prose-pre:border prose-pre:border-[#2a2a32] text-gray-200 text-[15px] max-w-none">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                        
                        {!isLoading && message.content && (
                          <div className="flex items-center gap-2 mt-2">
                             <button
                               onClick={async () => {
                                 try {
                                   const res = await fetch('/api/tts', {
                                     method: 'POST',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ text: message.content.replace(/[*#]/g, '') })
                                   });
                                   if (!res.ok) throw new Error('TTS failed');
                                   const blob = await res.blob();
                                   const audioUrl = URL.createObjectURL(blob);
                                   new Audio(audioUrl).play();
                                 } catch (e) {
                                   console.error('Error playing production audio', e);
                                   alert('Production TTS is currently unavailable / requires external API quota.');
                                 }
                               }}
                               className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors w-fit border border-[#2a2a32] bg-[#1c1c21] px-3 py-1.5 rounded-full"
                             >
                               <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>
                               Read Aloud
                             </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
          
          {isLoading && messages[messages.length-1]?.role === 'user' && (
            <div className="flex gap-4 animate-pulse pt-4">
               <div className="w-8 h-8 rounded-full bg-[#1c1c21] flex-shrink-0"></div>
               <div className="flex flex-col gap-2 w-full max-w-md pt-2">
                 <div className="h-4 bg-[#1c1c21] rounded w-full"></div>
                 <div className="h-4 bg-[#1c1c21] rounded w-5/6"></div>
                 <div className="h-4 bg-[#1c1c21] rounded w-4/6 mt-2"></div>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating Bottom Input Area (Only shows if messages exist) */}
      {messages.length > 0 && (
         <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none">
           <div className="max-w-3xl mx-auto relative pointer-events-auto">
             <form onSubmit={handleSubmit} className="relative flex flex-col bg-[#1c1c21] border border-[#2a2a32] rounded-2xl shadow-2xl focus-within:border-indigo-500/50 transition-colors">
               <input
                 type="text"
                 className="w-full bg-transparent text-gray-100 placeholder:text-gray-500 pt-4 pb-14 px-5 outline-none text-[15px]"
                 placeholder="Ask a follow-up..."
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 disabled={isLoading}
               />
               <div className="absolute bottom-2 right-2 flex items-center justify-between pointer-events-auto">
                    <button
                      type="submit"
                      disabled={!(input || '').trim() || isLoading}
                      className="p-2 bg-white text-black rounded-full hover:bg-gray-200 disabled:opacity-50 disabled:bg-[#2a2a32] disabled:text-gray-500 transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                    </button>
               </div>
             </form>
           </div>
         </div>
      )}
    </div>
  );
}
