'use client';
import { useChat } from '@ai-sdk/react';
import { Search, Compass, BookOpen, BrainCircuit, Globe } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans selection:bg-indigo-500/30">
      <header className="flex items-center justify-between p-4 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <BrainCircuit size={18} className="text-white" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Perplexity<span className="text-indigo-400 font-normal">Clone</span></h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-8 custom-scrollbar">
        <div className="max-w-3xl mx-auto flex flex-col gap-8 pb-32">
          
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center space-y-4 animate-in fade-in duration-700">
              <Compass size={48} className="text-gray-700 mb-2" />
              <h2 className="text-3xl font-semibold text-gray-200">Where knowledge begins.</h2>
              <p className="text-gray-400 max-w-md">Search across the RAG PDF knowledge base.</p>
              
              <div className="grid grid-cols-2 gap-3 w-full max-w-xl mt-8">
                {["What is Semantic Search?", "Explain Agentic RAG", "Vector DBs overview", "How to map chunks?"].map(q => (
                   <button 
                     key={q} 
                     onClick={() => handleInputChange({ target: { value: q } } as any)}
                     className="bg-gray-900 border border-gray-800 hover:border-gray-700 text-left p-3 rounded-xl text-sm text-gray-400"
                   >
                     {q}
                   </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => {
            const message = m as any;
            const isUser = message.role === 'user';
            return (
              <div key={message.id} className={`flex flex-col gap-3 ${isUser ? 'items-end' : 'items-start'} animate-in fade-in`}>
                {isUser && (
                  <div className="bg-gray-800 text-gray-100 px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-[85%] text-[15px] shadow-sm">
                    {message.content}
                  </div>
                )}
                
                {!isUser && (
                  <div className="flex gap-4 max-w-[100%] w-full">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex-shrink-0 flex items-center justify-center mt-1">
                       <BrainCircuit size={16} className="text-indigo-400" />
                    </div>
                    
                    <div className="flex flex-col gap-3 w-full">
                      <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-gray-900 text-gray-200 text-[15px] max-w-none">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {isLoading && messages[messages.length-1]?.role === 'user' && (
            <div className="flex gap-4 animate-pulse">
               <div className="w-8 h-8 rounded-full bg-gray-800 flex-shrink-0"></div>
               <div className="flex flex-col gap-2 w-full max-w-md pt-2">
                 <div className="h-3 bg-gray-800 rounded w-full"></div>
                 <div className="h-3 bg-gray-800 rounded w-5/6"></div>
               </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pt-12">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <Search className="absolute left-4 text-gray-500 z-10" size={20} />
            <input
              type="text"
              className="w-full bg-gray-900 border border-gray-700/80 text-gray-100 rounded-full pl-12 pr-16 py-4 outline-none focus:border-indigo-500 transition-all placeholder:text-gray-500 text-[15px]"
              placeholder="Ask anything..."
              value={input}
              onChange={handleInputChange}
            />
            <button
              type="submit"
              disabled={!(input || '').trim() || isLoading}
              className="absolute right-2 p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
