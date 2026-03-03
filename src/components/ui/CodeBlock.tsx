'use client';
import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Check, Copy } from 'lucide-react';

interface CodeBlockProps {
  language?: string;
  children: string;
}

export function CodeBlock({ language = 'text', children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden border border-[#2a2a32] my-3">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161619] border-b border-[#2a2a32]">
        <span className="text-xs font-mono text-gray-500">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors duration-150"
          aria-label="Copy code"
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
      </div>

      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#0f0f12',
          fontSize: '0.82rem',
          lineHeight: '1.6',
        }}
        showLineNumbers={language !== 'text' && language !== 'bash' && language !== 'shell'}
        wrapLongLines
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
}
