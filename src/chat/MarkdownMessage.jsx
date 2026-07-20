import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import Callout from './Callout';
import CodeBlock from './CodeBlock';
import Table from './Table';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

export default function MarkdownMessage({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeHighlight, rehypeKatex]}
      components={{
        p: ({ children: content }) => <p className="my-0 break-words [&+p]:mt-3">{content}</p>,
        a: ({ href, children: content }) => <a href={href} target="_blank" rel="noreferrer" className="font-medium text-emerald-700 underline decoration-emerald-300 underline-offset-2 transition hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">{content}</a>,
        ul: ({ children: content }) => <ul className="my-3 list-disc space-y-1.5 pl-5 marker:text-emerald-600">{content}</ul>,
        ol: ({ children: content }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-emerald-700">{content}</ol>,
        li: ({ children: content }) => <li className="pl-1">{content}</li>,
        blockquote: ({ children: content }) => <Callout>{content}</Callout>,
        table: Table,
        thead: ({ children: content }) => <thead className="border-b border-slate-200 bg-slate-50 text-slate-900">{content}</thead>,
        th: ({ children: content }) => <th className="whitespace-nowrap px-3 py-2.5 font-semibold">{content}</th>,
        td: ({ children: content }) => <td className="border-t border-slate-100 px-3 py-2 align-top">{content}</td>,
        pre: ({ children: content }) => <>{content}</>,
        code: ({ className, children: content }) => {
          const language = /language-([^\s]+)/.exec(className || '')?.[1];
          return language ? <CodeBlock language={language}>{content}</CodeBlock> : <code className="rounded bg-emerald-950/8 px-1.5 py-0.5 font-mono text-[.9em] text-emerald-950">{content}</code>;
        },
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
