import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

function textContent(node) {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textContent).join('');
  return textContent(node?.props?.children || '');
}

export default function CodeBlock({ children, language = 'text' }) {
  const [copied, setCopied] = useState(false);
  const code = textContent(children).replace(/\n$/, '');

  const copyCode = async () => {
    await navigator.clipboard?.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl border border-slate-700/70 bg-slate-950 text-slate-100 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 bg-slate-900/70 px-3 py-2 text-xs">
        <span className="font-mono text-slate-300">{language}</span>
        <button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-slate-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300" aria-label="Copy code">
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="m-0 overflow-x-auto p-4 text-xs leading-5 sm:text-sm"><code className={`hljs language-${language}`}>{children}</code></pre>
    </div>
  );
}
