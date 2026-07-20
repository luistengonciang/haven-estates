import { Info } from 'lucide-react';

export default function Callout({ children }) {
  return (
    <aside className="my-4 flex gap-3 rounded-r-xl border-l-4 border-lime-500 bg-lime-50 px-4 py-3 text-slate-700">
      <Info className="mt-0.5 shrink-0 text-lime-700" size={17} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </aside>
  );
}
