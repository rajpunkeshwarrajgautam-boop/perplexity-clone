import { Compass, Search, Map, CheckCircle, Network, Code2, Database, FolderGit2, MessagesSquare, Users, GitBranch, Layers, Sparkles, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export function Sidebar({ isMobile = false }) {
  const KnowledgeLinks = [
    { name: 'Canvas Home', icon: Compass, href: '/' },
    { name: 'Active Memory', icon: Network, href: '#' },
    { name: 'Knowledge Graph', icon: Database, href: '#' },
    { name: 'Repositories', icon: FolderGit2, href: '#' },
  ];

  const WorkspaceLinks = [
    { name: 'Private Branches', icon: GitBranch, href: '#' },
    { name: 'Shared Workspaces', icon: Users, href: '#' },
    { name: 'Agent Workflows', icon: Layers, href: '#' },
  ];

  return (
    <aside className={`flex flex-col h-full bg-[#0a0a0c]/80 backdrop-blur-2xl border-r border-[#1e1e24] ${isMobile ? 'w-full' : 'w-[280px]'}`}>
      <div className="p-5 flex items-center gap-3 border-b border-[#1e1e24]/50 mb-4">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)]">
          <BrainCircuit size={18} className="text-white" />
        </div>
        <h1 className="font-bold text-[18px] tracking-tight bg-clip-text text-transparent bg-linear-to-r from-gray-100 to-gray-400">Context<span className="font-light">River</span></h1>
      </div>

      <div className="px-4 mb-6">
         <button className="w-full bg-[#1c1c21] hover:bg-[#2a2a32] text-gray-300 text-sm font-medium py-2.5 rounded-lg border border-[#2a2a32] hover:border-indigo-500/30 transition-all duration-300 flex items-center justify-center gap-2 shadow-inner group">
            <Sparkles size={16} className="text-indigo-400 group-hover:animate-pulse" />
            <span>New Canvas</span>
            <kbd className="ml-auto text-[10px] text-gray-500 font-mono bg-[#111113] px-1.5 py-0.5 rounded border border-[#2a2a32]">⌘ K</kbd>
         </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-none px-4 space-y-8 pb-4">
        <div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 px-2">Knowledge Edge</h3>
          <nav className="space-y-0.5">
            {KnowledgeLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-2 py-2 text-[14px] font-medium text-gray-400 hover:text-gray-100 hover:bg-[#1c1c21]/50 rounded-lg transition-colors group"
              >
                <item.icon size={18} className="text-indigo-500/50 group-hover:text-indigo-400 transition-colors" />
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div>
           <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-3 px-2">Workspaces</h3>
           <nav className="space-y-0.5">
             {WorkspaceLinks.map((item) => (
               <Link
                 key={item.name}
                 href={item.href}
                 className="flex items-center gap-3 px-2 py-2 text-[14px] font-medium text-gray-400 hover:text-gray-100 hover:bg-[#1c1c21]/50 rounded-lg transition-colors group"
               >
                 <item.icon size={18} className="text-purple-500/50 group-hover:text-purple-400 transition-colors" />
                 {item.name}
               </Link>
             ))}
           </nav>
        </div>
      </div>

      {/* MoE / System 2 Indicator */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-[#111116] border border-[#2a2a32] shadow-inner relative overflow-hidden group cursor-pointer hover:border-indigo-500/40 transition-colors">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <h3 className="text-[11px] font-semibold text-gray-200 mb-1 flex items-center gap-2">
           <BrainCircuit size={14} className="text-indigo-400" />
           MoE Architecture
        </h3>
        <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">256 experts, 8M+ token context vector. System-2 Reasoning enabled.</p>
        <div className="w-full flex items-center justify-between text-[10px] font-medium">
          <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> TTFT &lt; 50ms</span>
          <span className="text-indigo-400">100% SLA</span>
        </div>
      </div>
    </aside>
  );
}
