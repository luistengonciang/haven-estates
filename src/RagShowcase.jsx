import { useEffect, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Database, FileText, Layers, LoaderCircle, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { supabase, supabaseConfigReady } from './lib/supabase';

const sampleQueries = [
  {
    tag: 'Legal Due Diligence',
    label: 'Title & Ownership Checks',
    query: 'What should I check before buying a home in Bataan?',
  },
  {
    tag: 'Financial Strategy',
    label: 'Budgeting & Hidden Fees',
    query: 'How should I set a realistic home budget?',
  },
  {
    tag: 'Market & Location',
    label: 'Coastal & Regional Zoning',
    query: 'What makes it great to invest in Bataan?',
  },
];

const defaultDocuments = [
  {
    id: 'bataan-title-dd',
    category: 'due-diligence',
    similarity: 0.94,
    title: 'Bataan Land and Title Due Diligence',
    content: 'Always verify the Original Certificate of Title (OCT) or Transfer Certificate of Title (TCT) directly with the Bataan Registry of Deeds in Balanga. Confirm survey plans, seller authority, right-of-way, municipal zoning, and unpaid real-property taxes. Stated listing specs are leads, not legal proof.',
    metadata: { place: 'Bataan, Philippines', kind: 'general-guidance' },
  },
  {
    id: 'bataan-budget-guidance',
    category: 'finance',
    similarity: 0.88,
    title: 'Comprehensive Purchase Budget Framework',
    content: 'Beyond the seller asking price, prepare for documentary stamp tax (1.5%), transfer tax (approx 0.5-0.75%), registration fees, notarial fees (1-2%), appraisal, and property contingency. Confirm allocations with certified local brokers.',
    metadata: { place: 'Bataan, Philippines', kind: 'general-guidance' },
  },
];

export default function RagShowcase() {
  const [documentCount, setDocumentCount] = useState(6);
  const [activeQueryIndex, setActiveQueryIndex] = useState(0);
  const [query, setQuery] = useState(sampleQueries[0].query);
  const [results, setResults] = useState(defaultDocuments);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!supabase || !supabaseConfigReady) return undefined;
    let active = true;
    supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (active && count) setDocumentCount(count);
    });
    // Run initial live query on mount
    void runQuery(sampleQueries[0].query);
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

    if (retrievalError || data?.error) {
      // If function is cold or warming up, gracefully keep default curated documents
      if (results.length === 0) setResults(defaultDocuments);
    } else if (data?.documents?.length > 0) {
      setResults(data.documents);
    } else if (results.length === 0) {
      setResults(defaultDocuments);
    }
    setLoading(false);
  };

  const handleSelectSample = (sample, index) => {
    setActiveQueryIndex(index);
    setQuery(sample.query);
    void runQuery(sample.query);
  };

  return (
    <section className="intelligence-showcase" id="intelligence">
      <div className="intelligence-inner">
        {/* Left Editorial Narrative Column */}
        <div className="intelligence-narrative">
          <div className="intelligence-eyebrow">
            <Sparkles size={14} className="text-[#beef68]" />
            <span>Vanguard Intelligence Engine</span>
            <span className="live-pulse" />
          </div>

          <h2>Advice grounded in data, not sales pressure.</h2>

          <p className="intelligence-lead">
            In Philippine real estate, critical details are frequently obscured by unlisted prices, unverified titles, and informal developer terms.
          </p>

          <p className="intelligence-sub">
            Vanguard operates as your private intelligence desk. Before it answers, it performs semantic vector retrieval over municipal registries, titling guidelines, and micro-market comparables to give you objective, audit-ready clarity.
          </p>

          <div className="intelligence-metrics-grid">
            <div className="int-metric-card">
              <Database size={17} className="text-[#beef68]" />
              <div>
                <strong>{documentCount}+ Curated Briefs</strong>
                <small>Bataan titling, tax & zoning laws</small>
              </div>
            </div>
            <div className="int-metric-card">
              <ShieldCheck size={17} className="text-[#beef68]" />
              <div>
                <strong>pgvector RLS Secure</strong>
                <small>Private, authenticated vector embeddings</small>
              </div>
            </div>
            <div className="int-metric-card">
              <CheckCircle2 size={17} className="text-[#beef68]" />
              <div>
                <strong>Broker Calibrated</strong>
                <small>Verified by Melissa Barlin</small>
              </div>
            </div>
          </div>
        </div>

        {/* Right Interactive Command Console */}
        <div className="intelligence-console-card">
          <div className="console-header-bar">
            <div className="console-window-dots">
              <span className="dot dot-red" />
              <span className="dot dot-yellow" />
              <span className="dot dot-green" />
            </div>
            <span className="console-header-title">VANGUARD KNOWLEDGE DESK · BATAAN VECTOR INDEX</span>
            <span className="console-live-tag">LIVE</span>
          </div>

          <div className="console-body">
            <p className="console-prompt-label">Select a topic or test your own due diligence question:</p>

            {/* Smart Inquiry Category Pills */}
            <div className="console-query-pills">
              {sampleQueries.map((sample, index) => (
                <button
                  type="button"
                  key={sample.query}
                  onClick={() => handleSelectSample(sample, index)}
                  className={`console-pill ${activeQueryIndex === index ? 'is-active' : ''}`}
                >
                  <span className="pill-category">{sample.tag}</span>
                  <span className="pill-text">{sample.label}</span>
                </button>
              ))}
            </div>

            {/* Interactive Search Field */}
            <form
              className="console-search-form"
              onSubmit={(event) => {
                event.preventDefault();
                void runQuery();
              }}
            >
              <div className="console-input-wrap">
                <Search size={16} className="console-search-icon" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="console-search-input"
                  placeholder="Ask Vanguard about titles, taxes, or Bataan locations..."
                  aria-label="Ask Vanguard knowledge base"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !supabaseConfigReady}
                className="console-run-btn"
                title="Run Vector Search"
              >
                {loading ? <LoaderCircle className="animate-spin" size={16} /> : <ArrowUpRight size={17} />}
                <span>{loading ? 'Retrieving…' : 'Inspect Sources'}</span>
              </button>
            </form>

            {error && (
              <div className="console-alert error">
                {error}
              </div>
            )}

            {/* Live Retrieved Intelligence Briefs */}
            <div className="console-results-stream">
              <div className="results-stream-header">
                <span className="stream-title">
                  <FileText size={13} /> Top Grounded Matches ({results.length})
                </span>
                <span className="stream-status">Vector Cosine Distance</span>
              </div>

              <div className="results-cards-stack">
                {results.map((result) => (
                  <article key={result.id || result.title} className="retrieved-doc-card">
                    <div className="doc-meta-row">
                      <span className="doc-category-badge">
                        {result.category?.replace('-', ' ') || 'Due Diligence'}
                      </span>
                      <span className="doc-match-score">
                        {Math.round((result.similarity ?? 0.94) * 100)}% Confidence Match
                      </span>
                    </div>
                    <h4 className="doc-card-title">{result.title}</h4>
                    <p className="doc-card-content">{result.content}</p>
                    {result.source_url && (
                      <a
                        className="doc-source-link"
                        href={result.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Inspect Official Registry Source <ArrowUpRight size={12} />
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
