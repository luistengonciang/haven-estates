import { useEffect, useMemo, useState } from 'react';
import { Bath, BedDouble, Building2, ChevronDown, ExternalLink, Heart, MapPin, Menu, MoveRight, Search, SlidersHorizontal, Sparkles, Square, TreePine } from 'lucide-react';
import AgenticChatbot from './AgenticChatbot';
import RagShowcase from './RagShowcase';
import { AuthControls } from './AuthGate';
import { filterAndSortProperties, getBataanProperties } from './lib/properties';

const PAGE_SIZE = 9;
const SAVED_LISTINGS_KEY = 'haven-saved-bataan-listings';

function PropertyCard({ property, onSelect, isSaved, onToggleSaved }) {
  return <article className="property-card">
    <div className="property-image"><img src={property.image} alt="" /><span>{property.type}</span><button className={isSaved ? 'is-saved' : ''} type="button" aria-label={`${isSaved ? 'Remove' : 'Save'} ${property.title}`} aria-pressed={isSaved} onClick={() => onToggleSaved(property.id)}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
    <div className="property-info"><p className="property-price">{property.price}</p><h3>{property.title}</h3><p className="property-place"><MapPin size={14} /> {property.location}</p><div className="property-specs"><span><BedDouble size={16} /> {property.bedrooms} beds</span><span><Bath size={16} /> {property.bathrooms} baths</span><span><Square size={15} /> {property.floorArea}</span></div><button className="detail-button" type="button" onClick={() => onSelect(property)}>View details <MoveRight size={17} /></button></div>
  </article>;
}

export default function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ query: '', priceBand: '', propertyType: '', sort: 'newest' });
  const [draftQuery, setDraftQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [showSaved, setShowSaved] = useState(false);

  const loadProperties = async () => {
    setLoading(true); setError(null);
    try { setProperties(await getBataanProperties()); }
    catch (loadError) { setError(loadError.message === 'SUPABASE_NOT_CONFIGURED' ? 'Property listings are not configured yet.' : 'We could not load property listings. Please try again.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadProperties(); }, []);
  useEffect(() => {
    try { setSavedIds(new Set(JSON.parse(window.localStorage.getItem(SAVED_LISTINGS_KEY) || '[]'))); } catch { setSavedIds(new Set()); }
  }, []);
  const searchedProperties = useMemo(() => filterAndSortProperties(properties, filters), [properties, filters]);
  const filteredProperties = useMemo(() => showSaved ? searchedProperties.filter((property) => savedIds.has(property.id)) : searchedProperties, [searchedProperties, savedIds, showSaved]);
  const pageCount = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const visibleProperties = filteredProperties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(filters.query || filters.priceBand || filters.propertyType);
  const updateFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const submitSearch = (event) => { event.preventDefault(); updateFilter('query', draftQuery); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); };
  const clearSearch = () => { setDraftQuery(''); setFilters({ query: '', priceBand: '', propertyType: '', sort: 'newest' }); setPage(1); };
  const toggleSaved = (id) => setSavedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    window.localStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify([...next]));
    return next;
  });
  const toggleSavedView = () => { setShowSaved((current) => !current); setPage(1); };

  return <main>
    <section className="hero"><nav><a className="brand" href="#top"><span>H</span> HAVEN</a><div className="nav-links"><a href="#properties">Buy</a><a href="#intelligence">Intelligence</a><a href="#about">Our story</a></div><AuthControls /><a className="nav-cta" href="#intelligence">Speak with Melissa Barlin <MoveRight size={17} /></a><button className="mobile-menu" type="button" aria-label="Open menu"><Menu size={23} /></button></nav><div className="hero-content" id="top"><div className="eyebrow"><Sparkles size={15} /> Curated homes. Human guidance.</div><h1>Find your next <em>sanctuary.</em></h1><p>Discover exceptional homes, thoughtfully matched to the life you want to live.</p><form className="search-panel" onSubmit={submitSearch}><label><MapPin size={19} /><span>Location<input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="City, neighborhood, or listing" aria-label="Search Bataan listings" /></span></label><label className="search-filter"><span className="search-label-icon">$</span><span>Price range<small>{filters.priceBand === 'under1m' ? 'Under ₱1M' : filters.priceBand === '1m-5m' ? '₱1M–₱5M' : filters.priceBand === '5m-10m' ? '₱5M–₱10M' : filters.priceBand === 'over10m' ? 'Over ₱10M' : 'Any price'}</small></span><ChevronDown className="select-chevron" size={18} /><select className="filter-select" value={filters.priceBand} onChange={(event) => updateFilter('priceBand', event.target.value)} aria-label="Price range"><option value="">Any price</option><option value="under1m">Under ₱1M</option><option value="1m-5m">₱1M–₱5M</option><option value="5m-10m">₱5M–₱10M</option><option value="over10m">Over ₱10M</option></select></label><label className="search-filter"><Building2 size={19} /><span>Property type<small>{filters.propertyType || 'All properties'}</small></span><ChevronDown className="select-chevron" size={18} /><select className="filter-select" value={filters.propertyType} onChange={(event) => updateFilter('propertyType', event.target.value)} aria-label="Property type"><option value="">All properties</option><option>House</option><option>Condo</option><option>Land</option><option>Commercial</option></select></label><button type="submit"><Search size={19} /> Search homes</button></form></div><div className="hero-foot"><span><i /> New homes matched daily</span><span>Trusted by 12,000+ home seekers</span></div></section>
    <section className="properties" id="properties"><div className="section-heading"><div><p className="section-kicker">Bataan listings</p><h2>{showSaved ? 'Your saved listings.' : 'Homes worth coming home to.'}</h2></div><label className="sort-control">Sort by<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="title">Listing title</option></select></label></div>{!loading && !error && <div className="results-toolbar"><p className="result-count">{filteredProperties.length} listing{filteredProperties.length === 1 ? '' : 's'} found</p><div className="results-actions"><button className={`saved-toggle ${showSaved ? 'saved-toggle-active' : ''}`} type="button" onClick={toggleSavedView} aria-pressed={showSaved}><Heart size={15} fill={showSaved ? 'currentColor' : 'none'} /> Saved ({savedIds.size})</button>{hasActiveFilters && <button className="clear-search" type="button" onClick={clearSearch}>Clear search</button>}</div></div>}{loading && <div className="property-state">Loading Bataan property listings…</div>}{error && <div className="property-state error-state"><p>{error}</p><button type="button" onClick={() => void loadProperties()}>Try again</button></div>}{!loading && !error && visibleProperties.length === 0 && <div className="property-state">{showSaved ? 'You have no saved listings yet. Use the heart on a listing to save it.' : 'No listings match those filters.'} {!showSaved && <button className="clear-search" type="button" onClick={clearSearch}>Clear search</button>}</div>}{!loading && !error && visibleProperties.length > 0 && <><div className="property-grid">{visibleProperties.map((property) => <PropertyCard property={property} key={property.id} onSelect={setSelected} isSaved={savedIds.has(property.id)} onToggleSaved={toggleSaved} />)}</div><nav className="pagination" aria-label="Property listing pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav></>}</section>
    {selected && <div className="property-dialog-backdrop" role="presentation" onMouseDown={() => setSelected(null)}><section className="property-dialog" role="dialog" aria-modal="true" aria-labelledby="property-detail-title" onMouseDown={(event) => event.stopPropagation()}><button className="dialog-close" type="button" onClick={() => setSelected(null)} aria-label="Close property details">×</button><p className="section-kicker">{selected.type}</p><h2 id="property-detail-title">{selected.title}</h2><p className="property-price">{selected.price}</p><p className="property-place"><MapPin size={15} /> {selected.fullLocation || selected.location}</p><div className="property-specs"><span><BedDouble size={16} /> {selected.bedrooms} beds</span><span><Bath size={16} /> {selected.bathrooms} baths</span><span><Square size={15} /> {selected.floorArea}</span></div><a className="source-link" href={selected.sourceUrl} target="_blank" rel="noreferrer">View original listing <ExternalLink size={16} /></a></section></div>}
    <RagShowcase />
    <section className="advisor-banner" id="advisors"><div className="banner-mark"><TreePine size={34} /></div><div><p className="section-kicker">A better way home</p><h2>Expert advice, on your terms.</h2><p>From the first search to the final signature, our local advisors pair intelligence with an exceptionally personal experience.</p></div><a href="#intelligence">Explore the intelligence <MoveRight size={18} /></a></section>
    <section className="our-story" id="about"><div><p className="section-kicker">Our story</p><h2>Built with curiosity, data, and a local point of view.</h2></div><div className="story-copy"><p>Haven is shaped by Luis Tengonciang, an Applied Mathematics and Data Science student at Ateneo de Manila University. The project brings together thoughtful design, practical data work, and a belief that property discovery should feel more transparent and personal.</p><p>Starting with Bataan, Haven turns scattered listing information into a clearer place to search, compare, and ask better questions before making a decision.</p></div></section><button className="filter-chip" type="button" onClick={() => document.querySelector('#top input')?.focus()}><SlidersHorizontal size={18} /> Refine your search</button><AgenticChatbot />
  </main>;
}
