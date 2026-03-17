import { Compass, Network, Database, FolderGit2, Users, GitBranch, Layers, Sparkles, BrainCircuit } from 'lucide-react';
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
    { name: 'Knowledge Graph', icon: Network, href: '#' },
  ];

  return (
    <aside className={`flex flex-col h-full bg-[#050508] border-r border-white/5 ${isMobile ? 'w-full' : 'w-[280px]'}`}>
      <div className="p-5 flex items-center gap-3 border-b border-white/5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.4)]">
          <BrainCircuit size={18} className="text-black" />
        </div>
        <h1 className="font-bold text-[18px] tracking-tight bg-clip-text text-transparent bg-linear-to-r from-gray-100 to-gray-400">Aira</h1>
      </div>

      <div className="px-4 mb-6">
         <button className="w-full bg-amber-500 hover:bg-amber-600 text-black text-sm font-bold py-2.5 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.2)] group">
            <Sparkles size={16} />
            <span>New Canvas</span>
            <kbd className="ml-auto text-[9px] text-black/60 font-mono bg-black/10 px-1.5 py-0.5 rounded border border-black/10">⌘ K</kbd>
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
                className="flex items-center gap-3 px-2 py-2 text-[14px] font-medium text-gray-400 hover:text-gray-100 hover:bg-white/5 rounded-lg transition-colors group"
              >
                <item.icon size={18} className="text-amber-500/50 group-hover:text-amber-400 transition-colors" />
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
                 className="flex items-center gap-3 px-2 py-2 text-[14px] font-medium text-gray-400 hover:text-gray-100 hover:bg-white/5 rounded-lg transition-colors group"
               >
                 <item.icon size={18} className="text-gray-600 group-hover:text-amber-400 transition-colors" />
                 {item.name}
               </Link>
             ))}
           </nav>
        </div>
      </div>

      {/* MoE / System 2 Indicator */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-[#0a0c10] border border-white/5 shadow-inner relative overflow-hidden group cursor-pointer hover:border-amber-500/40 transition-colors">
        <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <h3 className="text-[11px] font-semibold text-gray-200 mb-1 flex items-center gap-2">
           <BrainCircuit size={14} className="text-amber-500" />
           MoE Architecture
        </h3>
        <p className="text-[10px] text-gray-500 mb-3 leading-relaxed">256 experts, 8M+ token context vector. System-2 Reasoning enabled.</p>
        <div className="w-full flex items-center justify-between text-[10px] font-medium">
          <span className="text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> TTFT &lt; 50ms</span>
          <span className="text-amber-500/80">Premium Tier</span>
        </div>
      </div>
    </aside>
  );
}
