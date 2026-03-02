import { FileText, Link as LinkIcon } from 'lucide-react';

export function SourceCard({ source, index }: { source: any; index: number }) {
  const isWeb = source.title.startsWith('http');
  const Icon = isWeb ? LinkIcon : FileText;

  return (
    <div className="shrink-0 w-48 bg-[#1c1c21] hover:bg-[#25252b] border border-[#2a2a32] hover:border-[#3a3a42] rounded-xl p-3 cursor-pointer transition-colors duration-200 group">
      <div className="flex items-start justify-between mb-2">
        <div className="bg-[#2a2a32] text-gray-300 text-xs font-semibold px-1.5 py-0.5 rounded-md flex items-center justify-center min-w-[20px]">
          {index + 1}
        </div>
        <div className="text-xs font-medium text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity">
          {source.relevance}% Match
        </div>
      </div>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} className="text-gray-500 group-hover:text-indigo-400 transition-colors" />
        <h4 className="text-sm font-medium text-gray-200 truncate" title={source.title}>
          {source.title.replace('AIKosh Dataset: ', '')}
        </h4>
      </div>
      <p className="text-xs text-gray-500 truncate mt-1">
        {isWeb ? (() => { try { return new URL(source.title).hostname; } catch { return 'Web Source'; } })() : 'Knowledge Base'}
      </p>
    </div>
  );
}
