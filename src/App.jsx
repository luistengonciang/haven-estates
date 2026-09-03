import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bath, BedDouble, Building2, CalendarCheck, ChevronDown, Clock, ExternalLink, Heart, MapPin, Menu, MoveRight, Search, SlidersHorizontal, Sparkles, Square, TreePine, X } from 'lucide-react';
import AgenticChatbot from './AgenticChatbot';
import RagShowcase from './RagShowcase';
import { AuthControls, useAuth } from './AuthGate';
import {
  BATAAN_MUNICIPALITIES,
  fetchUserViewingRequests,
  filterAndSortProperties,
  getBataanProperties,
  mergeLocalSavedWithCloud,
  removePropertyFromCloud,
  savePropertyToCloud,
} from './lib/properties';

const PAGE_SIZE = 9;
const SAVED_LISTINGS_KEY = 'haven-saved-bataan-listings';
const NAV_LINKS = [['#properties', 'Buy'], ['#intelligence', 'Intelligence'], ['#about', 'Our story']];

function PropertyCard({ property, onSelect, isSaved, onToggleSaved }) {
  return <article className="property-card">
    <div className="property-image"><img src={property.image} alt={property.hasRealPhoto ? property.title : ''} loading="lazy" /><span>{property.type}</span><button className={isSaved ? 'is-saved' : ''} type="button" aria-label={`${isSaved ? 'Remove' : 'Save'} ${property.title}`} aria-pressed={isSaved} onClick={() => onToggleSaved(property.id)}><Heart size={18} fill={isSaved ? 'currentColor' : 'none'} /></button></div>
    <div className="property-info"><p className="property-price">{property.price}</p><h3>{property.title}</h3><p className="property-place"><MapPin size={14} /> {property.location}</p><div className="property-specs"><span><BedDouble size={16} /> {property.bedrooms} beds</span><span><Bath size={16} /> {property.bathrooms} baths</span><span><Square size={15} /> {property.floorArea}</span></div><button className="detail-button" type="button" onClick={() => onSelect(property)}>View details <MoveRight size={17} /></button></div>
  </article>;
}

function PropertyDialog({ property, onClose, onScheduleViewing }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const photos = property.photos.length ? property.photos : [property.image];

  useEffect(() => {
    restoreRef.current = document.activeElement;
    closeRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      restoreRef.current?.focus?.();
    };
  }, [onClose]);

  return <div className="property-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="property-dialog" role="dialog" aria-modal="true" aria-labelledby="property-detail-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Close property details">×</button>
      {property.hasRealPhoto && <div className="dialog-gallery">
        <img src={photos[photoIndex]} alt={`${property.title} — photo ${photoIndex + 1} of ${photos.length}`} />
        {photos.length > 1 && <div className="dialog-thumbs">
          {photos.map((photo, index) => (
            <button key={photo} type="button" className={index === photoIndex ? 'is-current' : ''} aria-label={`Show photo ${index + 1}`} aria-current={index === photoIndex} onClick={() => setPhotoIndex(index)}>
              <img src={photo} alt="" loading="lazy" />
            </button>
          ))}
        </div>}
      </div>}
      <p className="section-kicker">{property.type}</p>
      <h2 id="property-detail-title">{property.title}</h2>
      <p className="property-price">{property.price}</p>
      <p className="property-place"><MapPin size={15} /> {property.fullLocation || property.location}</p>
      <div className="property-specs"><span><BedDouble size={16} /> {property.bedrooms} beds</span><span><Bath size={16} /> {property.bathrooms} baths</span><span><Square size={15} /> {property.floorArea}</span></div>
      {property.description && <p className="dialog-description">{property.description}</p>}
      <div className="dialog-actions" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginTop: 20 }}>
        <button type="button" className="schedule-viewing-btn" onClick={() => onScheduleViewing(property)}>
          <CalendarCheck size={16} /> Schedule viewing with Melissa Barlin
        </button>
        <a className="source-link" href={property.sourceUrl} target="_blank" rel="noreferrer" style={{ marginTop: 0 }}>
          View original listing <ExternalLink size={16} />
        </a>
      </div>
    </section>
  </div>;
}

function ViewingRequestsModal({ requests, properties, onClose, onSelectProperty }) {
  const closeRef = useRef(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="property-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="property-dialog viewing-dialog" role="dialog" aria-modal="true" aria-labelledby="viewings-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Close viewing appointments">×</button>
      <div className="eyebrow" style={{ color: '#496252', marginBottom: 8 }}><CalendarCheck size={16} /> Private Appointments</div>
      <h2 id="viewings-dialog-title" style={{ marginBottom: 18 }}>My Viewing Requests</h2>
      {requests.length === 0 ? (
        <div className="property-state" style={{ minHeight: 140 }}>
          <p>No viewing requests scheduled yet.</p>
          <small style={{ color: '#738077', marginTop: 6 }}>While browsing any Bataan home, click "Schedule viewing" or ask Vanguard to arrange a walkthrough.</small>
        </div>
      ) : (
        <div className="viewing-list">
          {requests.map((req) => {
            const prop = properties.find((p) => p.id === req.property_id);
            const statusClass = `status-${req.status}`;
            const statusLabel = req.status === 'confirmed' ? 'Confirmed Appointment' : req.status === 'pending' ? 'Pending Advisor Review' : req.status === 'cancelled' ? 'Cancelled' : 'Declined';

            return (
              <article key={req.id} className="viewing-card">
                {prop && prop.image && (
                  <img src={prop.image} alt="" className="viewing-thumb" loading="lazy" />
                )}
                <div className="viewing-details">
                  <div className="viewing-header">
                    <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
                    <span className="viewing-time"><Clock size={13} /> {req.preferred_date}{req.preferred_time ? ` · ${req.preferred_time}` : ''}</span>
                  </div>
                  <h4>{prop ? prop.title : 'Bataan Property'}</h4>
                  {prop && <p className="viewing-location"><MapPin size={13} /> {prop.location} · <strong>{prop.price}</strong></p>}
                  {req.notes && <p className="viewing-notes">"{req.notes}"</p>}
                  {prop && (
                    <button type="button" className="detail-button" style={{ padding: '8px 0 0' }} onClick={() => { onClose(); onSelectProperty(prop); }}>
                      View property details <MoveRight size={14} />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  </div>;
}

export default function App() {
  const auth = useAuth();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ query: '', municipality: '', bedrooms: '', priceBand: '', propertyType: '', sort: 'newest' });
  const [draftQuery, setDraftQuery] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [activeListing, setActiveListing] = useState(null);
  const [savedIds, setSavedIds] = useState(() => new Set());
  const [showSaved, setShowSaved] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewingDrawerOpen, setViewingDrawerOpen] = useState(false);
  const [viewingRequests, setViewingRequests] = useState([]);

  const loadProperties = async () => {
    setLoading(true); setError(null);
    try { setProperties(await getBataanProperties()); }
    catch (loadError) { setError(loadError.message === 'SUPABASE_NOT_CONFIGURED' ? 'Property listings are not configured yet.' : 'We could not load property listings. Please try again.'); }
    finally { setLoading(false); }
  };

  const loadViewingRequests = useCallback(async (userId) => {
    if (!userId) { setViewingRequests([]); return; }
    const data = await fetchUserViewingRequests(userId);
    setViewingRequests(data);
  }, []);

  useEffect(() => { void loadProperties(); }, []);

  useEffect(() => {
    let localSaved = [];
    try { localSaved = JSON.parse(window.localStorage.getItem(SAVED_LISTINGS_KEY) || '[]'); }
    catch { localSaved = []; }

    if (auth?.user?.id) {
      void mergeLocalSavedWithCloud(auth.user.id, localSaved).then((mergedSet) => {
        setSavedIds(mergedSet);
        window.localStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify([...mergedSet]));
      });
      void loadViewingRequests(auth.user.id);
    } else {
      setSavedIds(new Set(localSaved));
      setViewingRequests([]);
    }
  }, [auth?.user?.id, loadViewingRequests]);

  // The mobile nav is the only navigation under 850px, so it must close on
  // Escape and on any link tap.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const { items: searchedProperties, hiddenUnpriced } = useMemo(() => filterAndSortProperties(properties, filters), [properties, filters]);
  const filteredProperties = useMemo(() => showSaved ? searchedProperties.filter((property) => savedIds.has(property.id)) : searchedProperties, [searchedProperties, savedIds, showSaved]);
  const pageCount = Math.max(1, Math.ceil(filteredProperties.length / PAGE_SIZE));
  const visibleProperties = filteredProperties.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasActiveFilters = Boolean(filters.query || filters.municipality || filters.bedrooms || filters.priceBand || filters.propertyType);
  const updateFilter = (key, value) => { setFilters((current) => ({ ...current, [key]: value })); setPage(1); };
  const submitSearch = (event) => { event.preventDefault(); updateFilter('query', draftQuery); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); };
  const clearSearch = () => { setDraftQuery(''); setFilters({ query: '', municipality: '', bedrooms: '', priceBand: '', propertyType: '', sort: 'newest' }); setPage(1); };

  const toggleSaved = (id) => {
    if (!auth?.requireAuth('Sign in to save listings and pick your search back up on any device.')) return;
    const userId = auth?.user?.id;
    setSavedIds((current) => {
      const next = new Set(current);
      const isSaving = !next.has(id);
      if (isSaving) {
        next.add(id);
        if (userId) void savePropertyToCloud(userId, id);
      } else {
        next.delete(id);
        if (userId) void removePropertyFromCloud(userId, id);
      }
      window.localStorage.setItem(SAVED_LISTINGS_KEY, JSON.stringify([...next]));
      return next;
    });
  };
  const toggleSavedView = () => { setShowSaved((current) => !current); setPage(1); };

  const selectProperty = (property) => { setSelected(property); setActiveListing(property); };
  const closeDialog = useCallback(() => setSelected(null), []);

  const handleScheduleViewing = (property) => {
    setActiveListing(property);
    closeDialog();
    // Open Vanguard chatbot so user can converse with Melissa Barlin / Vanguard
    const chatFab = document.querySelector('.chat-fab');
    if (chatFab && !document.querySelector('.chat-window-open')) {
      chatFab.click();
    }
  };

  return <main>
    <section className="hero">
      <nav>
        <a className="brand" href="#top"><span>H</span> HAVEN</a>
        <div className="nav-links">{NAV_LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</div>
        <AuthControls />
        {auth?.user && (
          <button type="button" className="nav-viewings-btn" onClick={() => setViewingDrawerOpen(true)} title="My Viewing Requests">
            <CalendarCheck size={16} />
            <span>Viewings</span>
            {viewingRequests.length > 0 && <span className="nav-viewings-badge">{viewingRequests.length}</span>}
          </button>
        )}
        <a className="nav-cta" href="#intelligence">Speak with Melissa Barlin <MoveRight size={17} /></a>
        <button className="mobile-menu" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </nav>
      {menuOpen && <div className="mobile-nav" id="mobile-nav">
        {NAV_LINKS.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        {auth?.user && (
          <button type="button" className="mobile-nav-link-btn" onClick={() => { setMenuOpen(false); setViewingDrawerOpen(true); }}>
            <CalendarCheck size={16} /> My Viewing Requests ({viewingRequests.length})
          </button>
        )}
        <a className="mobile-nav-cta" href="#intelligence" onClick={() => setMenuOpen(false)}>Speak with Melissa Barlin <MoveRight size={17} /></a>
      </div>}
      <div className="hero-content" id="top"><div className="eyebrow"><Sparkles size={15} /> Curated homes. Human guidance.</div><h1>Find your next <em>sanctuary.</em></h1><p>Discover exceptional homes, thoughtfully matched to the life you want to live.</p><form className="search-panel" onSubmit={submitSearch}><label><Search size={19} /><span>Search<input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Subdivision, beach, or keyword" aria-label="Search Bataan listings" /></span></label><label className="search-filter"><MapPin size={19} /><span>Town<small>{filters.municipality || 'All Bataan'}</small></span><ChevronDown className="select-chevron" size={18} /><select className="filter-select" value={filters.municipality} onChange={(event) => updateFilter('municipality', event.target.value)} aria-label="Town or municipality"><option value="">All Bataan</option>{BATAAN_MUNICIPALITIES.map((town) => <option key={town} value={town}>{town}</option>)}</select></label><label className="search-filter"><span className="search-label-icon">$</span><span>Price range<small>{filters.priceBand === 'under1m' ? 'Under ₱1M' : filters.priceBand === '1m-5m' ? '₱1M–₱5M' : filters.priceBand === '5m-10m' ? '₱5M–₱10M' : filters.priceBand === 'over10m' ? 'Over ₱10M' : 'Any price'}</small></span><ChevronDown className="select-chevron" size={18} /><select className="filter-select" value={filters.priceBand} onChange={(event) => updateFilter('priceBand', event.target.value)} aria-label="Price range"><option value="">Any price</option><option value="under1m">Under ₱1M</option><option value="1m-5m">₱1M–₱5M</option><option value="5m-10m">₱5M–₱10M</option><option value="over10m">Over ₱10M</option></select></label><label className="search-filter"><Building2 size={19} /><span>Property type<small>{filters.propertyType || 'All properties'}</small></span><ChevronDown className="select-chevron" size={18} /><select className="filter-select" value={filters.propertyType} onChange={(event) => updateFilter('propertyType', event.target.value)} aria-label="Property type"><option value="">All properties</option><option>House</option><option>Condo</option><option>Land</option><option>Commercial</option></select></label><button type="submit"><Search size={19} /> Search</button></form></div>
      <div className="hero-foot"><span><i /> New homes matched daily</span><span>Browse freely — an account is only needed to save or ask Vanguard</span></div>
    </section>
    <section className="properties" id="properties">
      <div className="section-heading">
        <div><p className="section-kicker">Bataan listings</p><h2>{showSaved ? 'Your saved listings.' : 'Homes worth coming home to.'}</h2></div>
        <label className="sort-control">Sort by<select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="title">Listing title</option></select></label>
      </div>
      <div className="catalog-filter-bar">
        <div className="bedroom-pills" role="radiogroup" aria-label="Filter by bedrooms">
          <span className="pill-label"><BedDouble size={16} /> Bedrooms:</span>
          {[{ id: '', label: 'Any' }, { id: '1', label: '1 Bed' }, { id: '2', label: '2 Beds' }, { id: '3', label: '3 Beds' }, { id: '4+', label: '4+ Beds' }].map(({ id, label }) => (
            <button key={id || 'any'} type="button" className={`bedroom-pill ${filters.bedrooms === id ? 'bedroom-pill-active' : ''}`} aria-pressed={filters.bedrooms === id} onClick={() => updateFilter('bedrooms', id)}>{label}</button>
          ))}
        </div>
        {hasActiveFilters && <div className="active-chips">
          {filters.query && <span className="filter-chip-tag">"{filters.query}"<button type="button" aria-label="Remove search keyword filter" onClick={() => { setDraftQuery(''); updateFilter('query', ''); }}>×</button></span>}
          {filters.municipality && <span className="filter-chip-tag">📍 {filters.municipality}<button type="button" aria-label="Remove town filter" onClick={() => updateFilter('municipality', '')}>×</button></span>}
          {filters.bedrooms && <span className="filter-chip-tag">🛏️ {filters.bedrooms === '4+' ? '4+ Beds' : `${filters.bedrooms} Bed${filters.bedrooms === '1' ? '' : 's'}`}<button type="button" aria-label="Remove bedroom filter" onClick={() => updateFilter('bedrooms', '')}>×</button></span>}
          {filters.priceBand && <span className="filter-chip-tag">₱ {filters.priceBand === 'under1m' ? 'Under ₱1M' : filters.priceBand === '1m-5m' ? '₱1M–₱5M' : filters.priceBand === '5m-10m' ? '₱5M–₱10M' : 'Over ₱10M'}<button type="button" aria-label="Remove price filter" onClick={() => updateFilter('priceBand', '')}>×</button></span>}
          {filters.propertyType && <span className="filter-chip-tag">🏡 {filters.propertyType}<button type="button" aria-label="Remove type filter" onClick={() => updateFilter('propertyType', '')}>×</button></span>}
        </div>}
      </div>
      {!loading && !error && <div className="results-toolbar"><p className="result-count">{filteredProperties.length} listing{filteredProperties.length === 1 ? '' : 's'} found{hiddenUnpriced > 0 && <span className="result-note"> · {hiddenUnpriced} hidden with no listed price</span>}</p><div className="results-actions"><button className={`saved-toggle ${showSaved ? 'saved-toggle-active' : ''}`} type="button" onClick={toggleSavedView} aria-pressed={showSaved}><Heart size={15} fill={showSaved ? 'currentColor' : 'none'} /> Saved ({savedIds.size})</button>{hasActiveFilters && <button className="clear-search" type="button" onClick={clearSearch}>Clear all filters</button>}</div></div>}
      {loading && <div className="property-state">Loading Bataan property listings…</div>}
      {error && <div className="property-state error-state"><p>{error}</p><button type="button" onClick={() => void loadProperties()}>Try again</button></div>}
      {!loading && !error && visibleProperties.length === 0 && <div className="property-state">{showSaved ? 'You have no saved listings yet. Use the heart on a listing to save it.' : 'No listings match those filters.'} {!showSaved && <button className="clear-search" type="button" onClick={clearSearch}>Clear all filters</button>}</div>}
      {!loading && !error && visibleProperties.length > 0 && <><div className="property-grid">{visibleProperties.map((property) => <PropertyCard property={property} key={property.id} onSelect={selectProperty} isSaved={savedIds.has(property.id)} onToggleSaved={toggleSaved} />)}</div><nav className="pagination" aria-label="Property listing pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav></>}
    </section>
    {selected && <PropertyDialog property={selected} onClose={closeDialog} onScheduleViewing={handleScheduleViewing} />}
    {viewingDrawerOpen && <ViewingRequestsModal requests={viewingRequests} properties={properties} onClose={() => setViewingDrawerOpen(false)} onSelectProperty={selectProperty} />}
    <RagShowcase />
    <section className="advisor-banner" id="advisors"><div className="banner-mark"><TreePine size={34} /></div><div><p className="section-kicker">A better way home</p><h2>Expert advice, on your terms.</h2><p>From the first search to the final signature, our local advisors pair intelligence with an exceptionally personal experience.</p></div><a href="#intelligence">Explore the intelligence <MoveRight size={18} /></a></section>
    <section className="our-story" id="about"><div><p className="section-kicker">Our story</p><h2>Built with curiosity, data, and a local point of view.</h2></div><div className="story-copy"><p>Haven is shaped by Luis Tengonciang, an Applied Mathematics and Data Science student at Ateneo de Manila University. The project brings together thoughtful design, practical data work, and a belief that property discovery should feel more transparent and personal.</p><p>Starting with Bataan, Haven turns scattered listing information into a clearer place to search, compare, and ask better questions before making a decision.</p></div></section><button className="filter-chip" type="button" onClick={() => document.querySelector('#top input')?.focus()}><SlidersHorizontal size={18} /> Refine your search</button><AgenticChatbot activeListing={activeListing} />
  </main>;
}
