import { Compass, Search, Map, CheckCircle, ChevronLeft, LayoutDashboard, BrainCircuit } from 'lucide-react';
import Link from 'next/link';

export function Sidebar({ isMobile = false }) {
  const NavLinks = [
    { name: 'Home', icon: Compass, href: '/' },
    { name: 'Discover', icon: Search, href: '#' },
    { name: 'Spaces', icon: LayoutDashboard, href: '#' },
    { name: 'Library', icon: Map, href: '#' },
  ];

  return (
    <aside className={`flex flex-col h-full bg-gray-950/80 backdrop-blur-xl border-r border-gray-800/80 ${isMobile ? 'w-full' : 'w-[260px]'}`}>
      <div className="p-4 flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <BrainCircuit size={18} className="text-white" />
        </div>
        <h1 className="font-semibold text-[17px] tracking-tight text-gray-100">Perplexity<span className="text-indigo-400 font-normal">Clone</span></h1>
      </div>

      <div className="px-3 mb-6">
         <button className="w-full bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-sm font-medium py-2.5 rounded-full border border-indigo-500/20 transition-colors flex items-center justify-center gap-2">
            <Search size={16} />
            <span>New Thread</span>
         </button>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NavLinks.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 text-[15px] font-medium text-gray-400 hover:text-gray-100 hover:bg-gray-900 rounded-lg transition-colors group"
          >
            <item.icon size={20} className="text-gray-500 group-hover:text-gray-300" />
            {item.name}
          </Link>
        ))}
      </nav>

      {/* Pro Upgrade CTA */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200 mb-1 flex items-center gap-2">
           <CheckCircle size={14} className="text-indigo-400" />
           Try Pro
        </h3>
        <p className="text-xs text-gray-500 mb-3">Upgrade to access GPT-4o, Claude 3, and Deep Research.</p>
        <button className="w-full py-1.5 text-xs font-semibold bg-gray-100 hover:bg-white text-gray-900 rounded-md transition-colors">
          Upgrade
        </button>
      </div>
    </aside>
  );
}
