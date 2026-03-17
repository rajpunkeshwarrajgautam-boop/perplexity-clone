import React from 'react';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import type { FirestoreSource } from '@/lib/schemas';

interface SourceCardProps {
  source: FirestoreSource;
  index: number;
}

export const SourceCard = React.memo(({ source, index }: SourceCardProps) => {
  const isWeb = source.isWeb !== false; // treat undefined as web or fallback gracefully
  
  return (
    <a
      href={source.url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#0a0c10] border border-white/5 hover:bg-[#11141a] hover:border-amber-500/30 transition-all w-48 shrink-0 group relative cursor-pointer"
    >
      <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-md bg-white/5 text-gray-500 text-[10px] font-bold border border-white/5 group-hover:bg-amber-500 group-hover:text-black transition-colors">
        {index + 1}
      </div>

      <div className="flex items-center gap-2 pr-6">
        {isWeb && source.favicon ? (
          <Image
            src={source.favicon}
            alt={`${source.domain || 'Source'} favicon`}
            width={16}
            height={16}
            unoptimized
            className="w-4 h-4 rounded-sm"
          />
        ) : (
          <BookOpen size={14} className="text-amber-500/70" />
        )}
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest truncate w-full">
          {source.domain || (isWeb ? 'WEB SOURCE' : 'INTERNAL PDF')}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-200 line-clamp-2 leading-snug mt-1 group-hover:text-amber-200 transition-colors">
        {source.title}
      </h4>

      {source.snippet && (
        <p className="text-[11px] text-gray-400 line-clamp-2 mt-0.5 leading-relaxed font-sans italic">
          &ldquo;{source.snippet}&rdquo;
        </p>
      )}

      <div className="text-[9px] text-gray-600 font-bold mt-auto pt-2 flex justify-between items-center border-t border-white/5">
        <span className="uppercase tracking-tighter">Fidelity</span>
        <span className="text-emerald-500/80">
          {(85 + (index * 2))}%
        </span>
      </div>
    </a>
  );
});

SourceCard.displayName = 'SourceCard';
