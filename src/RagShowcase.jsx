import { useEffect, useState } from 'react';
import { ArrowUpRight, Database, LoaderCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase, supabaseConfigReady } from './lib/supabase';

const sampleQueries = [
  'What should I check before buying a home in Bataan?',
  'How should I set a realistic home budget?',
  'What makes it great to invest in Bataan?',
];

export default function RagShowcase() {
  const [documentCount, setDocumentCount] = useState(null);
  const [query, setQuery] = useState(sampleQueries[0]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase || !supabaseConfigReady) return undefined;
    let active = true;
    supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (active) setDocumentCount(count ?? 0);
    });
    return () => { active = false; };
  }, []);

  const runQuery = async (value = query) => {
    const search = value.trim();
    if (!search || !supabase || loading) return;
    setQuery(search);
    setLoading(true);
    setError(null);
    const { data, error: retrievalError } = await supabase.functions.invoke('rag-retrieve', {
      body: { query: search, matchCount: 3 },
    });
    if (retrievalError) {
      setError('The knowledge index is taking a moment. Please try again.');
      setResults([]);
    } else {
      setResults(data?.documents ?? []);
    }
    setLoading(false);
  };

  return (
    <section className="rag-showcase bg-[#eef3eb]" id="intelligence">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-[clamp(24px,6vw,96px)] py-20 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16 lg:py-28">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-900/10 bg-white/70 px-3 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[.12em] text-emerald-800"><span className="h-1.5 w-1.5 rounded-full bg-lime-500 shadow-[0_0_0_3px_rgba(132,204,22,.15)]" /> Live Supabase RAG</div>
          <h2 className="max-w-xl font-['Playfair_Display'] text-[clamp(36px,4.6vw,64px)] font-semibold leading-[1.02] tracking-[-.045em] text-[#203329]">Advice grounded in the places you care about.</h2>
          <p className="mt-5 max-w-lg text-[15px] leading-7 text-slate-600">Vanguard searches a curated real-estate knowledge base before it answers, so recommendations start with relevant neighborhood, finance, and market context.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-emerald-900"><span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><Database size={15} /> {documentCount === null ? '...' : documentCount} indexed briefs</span><span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 shadow-sm"><ShieldCheck size={15} /> RLS protected</span></div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-emerald-950/10 bg-white p-4 shadow-[0_24px_70px_rgba(25,57,40,.12)] sm:p-6">
          <div className="rounded-2xl bg-[#173c2c] p-5 text-white sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.12em] text-lime-200"><Sparkles size={14} /> Ask the knowledge base</p><p className="mt-2 text-sm leading-6 text-emerald-50/80">Try a question and inspect the sources Vanguard would use.</p></div><ArrowUpRight className="shrink-0 text-lime-300" size={19} /></div><form className="mt-5 flex gap-2 rounded-xl bg-white p-1.5" onSubmit={(event) => { event.preventDefault(); runQuery(); }}><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-emerald-950 outline-none placeholder:text-slate-400" placeholder="Ask about a neighborhood or budget..." aria-label="Ask the knowledge base" /><button type="submit" disabled={loading || !supabaseConfigReady} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lime-300 text-emerald-950 transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60" aria-label="Search knowledge base">{loading ? <LoaderCircle className="animate-spin" size={18} /> : <Search size={18} />}</button></form></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">{sampleQueries.map((sample) => <button type="button" key={sample} onClick={() => { setQuery(sample); runQuery(sample); }} className="whitespace-nowrap rounded-full border border-slate-200 px-3 py-2 text-left text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900">{sample}</button>)}</div>
          {error && <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>}
          {!error && results.length === 0 && !loading && <div className="mt-5 rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-center text-sm text-slate-500">Run a query to see the top matching sources and similarity scores.</div>}
          {results.length > 0 && <div className="mt-5 max-h-[430px] space-y-3 overflow-y-auto pr-1">{results.map((result) => <article key={result.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-emerald-100 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide text-emerald-800">{result.category}</span><span className="font-mono text-[11px] font-medium text-emerald-700">{Math.round((result.similarity ?? 0) * 100)}% {result.metadata?.match_type === 'relative lexical rank' ? 'listing rank' : 'semantic match'}</span></div><h3 className="mt-3 text-sm font-bold text-slate-900">{result.title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{result.content}</p></article>)}</div>}
        </div>
      </div>
    </section>
  );
}
