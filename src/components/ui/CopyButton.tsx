'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
}

export function CopyButton({ text, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 text-xs text-gray-400 hover:text-gray-200 transition-colors border border-[#2a2a32] bg-[#1c1c21] px-3 py-1.5 rounded-full hover:border-[#3a3a42] ${className}`}
      aria-label="Copy response"
    >
      {copied ? (
        <>
          <Check size={13} className="text-emerald-400" />
          <span className="text-emerald-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy size={13} />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}
