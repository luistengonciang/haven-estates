export default function AIMessageBubble({ children, role = 'assistant' }) {
  const isUser = role === 'user';

  return (
    <div
      className={`min-w-0 max-w-[min(100%,42rem)] rounded-2xl px-4 py-3 text-[13px] leading-6 shadow-sm sm:text-sm ${
        isUser
          ? 'ml-auto rounded-br-md bg-emerald-800 text-white'
          : 'mr-auto w-full rounded-tl-md border border-emerald-950/8 bg-white text-slate-700'
      }`}
    >
      {children}
    </div>
  );
}
