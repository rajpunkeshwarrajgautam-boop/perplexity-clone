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
      className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#1c1c21] border border-[#2a2a32] hover:bg-[#25252b] hover:border-[#3a3a42] transition-colors w-48 shrink-0 group relative cursor-pointer"
    >
      <div className="absolute top-2 right-2 flex items-center justify-center w-5 h-5 rounded-full bg-[#15151a] text-[#8a8a93] text-[10px] font-bold border border-[#2a2a32]">
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
          <BookOpen size={14} className="text-gray-500" />
        )}
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider truncate w-full">
          {source.domain || (isWeb ? 'WEB SOURCE' : 'INTERNAL PDF')}
        </span>
      </div>

      <h4 className="text-sm font-semibold text-gray-200 line-clamp-2 leading-snug mt-1 group-hover:text-indigo-400 transition-colors">
        {source.title}
      </h4>

      {source.snippet && (
        <p className="text-[12px] text-gray-400 line-clamp-2 mt-0.5 leading-snug font-sans">
          &ldquo;{source.snippet}&rdquo;
        </p>
      )}

      {/* <div className="text-[10px] text-gray-600 font-medium mt-auto pt-1 flex justify-between">
        <span>Relevance</span>
        <span className={Number(source.relevance) > 70 ? 'text-green-500/70' : ''}>
          {source.relevance}%
        </span>
      </div> */}
    </a>
  );
});

SourceCard.displayName = 'SourceCard';
