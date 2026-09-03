import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bath, BedDouble, Building2, CalendarCheck, Camera, Check, ChevronDown, Clock, ExternalLink, Heart, MapPin, Menu, MoveRight, Pencil, RotateCcw, Search, SlidersHorizontal, Sparkles, Square, Trash2, TreePine, UserCheck, X, XCircle } from 'lucide-react';
import AgenticChatbot from './AgenticChatbot';
import RagShowcase from './RagShowcase';
import { AuthControls, useAuth } from './AuthGate';
import {
  BATAAN_MUNICIPALITIES,
  cancelViewingRequest,
  deleteViewingRequest,
  fetchUserViewingRequests,
  filterAndSortProperties,
  getBataanProperties,
  mergeLocalSavedWithCloud,
  removePropertyFromCloud,
  savePropertyToCloud,
  updateViewingRequest,
} from './lib/properties';

const PAGE_SIZE = 9;
const SAVED_LISTINGS_KEY = 'haven-saved-bataan-listings';
const NAV_LINKS = [['#properties', 'Buy'], ['#intelligence', 'Intelligence'], ['#about', 'Our story']];

function PropertyCard({ property, onSelect, isSaved, onToggleSaved, onScheduleViewing }) {
  const photoCount = property.photos?.length || (property.hasRealPhoto ? 1 : 0);

  return <article className="property-card">
    <div className="property-image" onClick={() => onSelect(property)}>
      <img src={property.image} alt={property.hasRealPhoto ? property.title : ''} loading="lazy" />
      <span className="property-type-tag">{property.type}</span>
      {photoCount > 1 && (
        <span className="photo-count-badge">
          <Camera size={12} /> {photoCount} photos
        </span>
      )}
      <button
        className={`card-heart-btn ${isSaved ? 'is-saved' : ''}`}
        type="button"
        aria-label={`${isSaved ? 'Remove' : 'Save'} ${property.title}`}
        aria-pressed={isSaved}
        onClick={(e) => {
          e.stopPropagation();
          onToggleSaved(property.id);
        }}
      >
        <Heart size={17} fill={isSaved ? 'currentColor' : 'none'} />
      </button>
    </div>
    <div className="property-info">
      <div className="property-price-row">
        <p className="property-price">{property.price}</p>
        <span className="municipality-tag">{property.municipality || 'Bataan'}</span>
      </div>
      <h3 onClick={() => onSelect(property)} title={property.title}>{property.title}</h3>
      <p className="property-place"><MapPin size={13} /> {property.location}</p>
      <div className="property-specs">
        <span><BedDouble size={15} /> {property.bedrooms} beds</span>
        <span className="spec-dot" />
        <span><Bath size={15} /> {property.bathrooms} baths</span>
        <span className="spec-dot" />
        <span><Square size={14} /> {property.floorArea}</span>
      </div>
      <div className="card-footer-actions">
        <button className="detail-button" type="button" onClick={() => onSelect(property)}>
          View details <MoveRight size={15} />
        </button>
        <button
          className="quick-viewing-btn"
          type="button"
          title="Schedule viewing"
          onClick={(e) => {
            e.stopPropagation();
            onScheduleViewing(property);
          }}
        >
          <CalendarCheck size={13} /> Schedule
        </button>
      </div>
    </div>
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
    <section className="property-dialog luxury-property-dialog" role="dialog" aria-modal="true" aria-labelledby="property-detail-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Close property details">×</button>
      <div className="dialog-split">
        {/* Left Column: Media Gallery & Advisor Card */}
        <div className="dialog-media-column">
          <div className="dialog-hero-photo-wrap">
            <img
              src={photos[photoIndex]}
              alt={`${property.title} — photo ${photoIndex + 1} of ${photos.length}`}
              className="dialog-hero-photo"
            />
            <div className="dialog-photo-badge">
              <Camera size={13} /> {photoIndex + 1} of {photos.length}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="dialog-thumbs-strip">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  className={`dialog-thumb-btn ${index === photoIndex ? 'is-current' : ''}`}
                  aria-label={`Show photo ${index + 1}`}
                  aria-current={index === photoIndex}
                  onClick={() => setPhotoIndex(index)}
                >
                  <img src={photo} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}

          <div className="advisor-trust-card">
            <div className="advisor-avatar"><TreePine size={20} /></div>
            <div>
              <strong>Melissa Barlin</strong>
              <span>Senior Advisor · Bataan Specialist</span>
              <p>Curated walkthroughs, title checking, and local neighborhood insights.</p>
            </div>
          </div>
        </div>

        {/* Right Column: Information & Actions */}
        <div className="dialog-content-column">
          <div className="dialog-type-tag">{property.type}</div>
          <h2 id="property-detail-title">{property.title}</h2>
          <p className="property-price">{property.price}</p>
          <p className="dialog-place"><MapPin size={15} /> {property.fullLocation || property.location}</p>

          <div className="highlights-grid">
            <div className="highlight-item">
              <span className="hl-label">Bedrooms</span>
              <strong><BedDouble size={16} /> {property.bedrooms}</strong>
            </div>
            <div className="highlight-item">
              <span className="hl-label">Bathrooms</span>
              <strong><Bath size={16} /> {property.bathrooms}</strong>
            </div>
            <div className="highlight-item">
              <span className="hl-label">Floor Area</span>
              <strong><Square size={15} /> {property.floorArea}</strong>
            </div>
            <div className="highlight-item">
              <span className="hl-label">Municipality</span>
              <strong><MapPin size={15} /> {property.municipality || 'Bataan'}</strong>
            </div>
          </div>

          {property.description && (
            <div className="dialog-description-box">
              <h4>About this Sanctuary</h4>
              <p>{property.description}</p>
            </div>
          )}

          <div className="dialog-cta-stack">
            <button type="button" className="schedule-viewing-btn" onClick={() => onScheduleViewing(property)}>
              <CalendarCheck size={16} /> Schedule viewing with Melissa Barlin
            </button>
            <a className="source-link" href={property.sourceUrl} target="_blank" rel="noreferrer">
              View original listing <ExternalLink size={15} />
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>;
}

function ViewingRequestsModal({ requests, properties, onClose, onSelectProperty, onRefresh }) {
  const closeRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    closeRef.current?.focus();
    const onKeyDown = (event) => { if (event.key === 'Escape' && !editingId) onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, editingId]);

  const startEditing = (req) => {
    setEditingId(req.id);
    setEditDate(req.preferred_date || '');
    setEditTime(req.preferred_time || 'Morning (9:00 AM - 11:30 AM)');
    setEditNotes(req.notes || '');
    setActionMessage('');
  };

  const handleSaveEdit = async (requestId) => {
    if (!editDate) {
      setActionMessage('Please select a preferred viewing date.');
      return;
    }
    setBusyId(requestId);
    try {
      await updateViewingRequest(requestId, {
        preferred_date: editDate,
        preferred_time: editTime,
        notes: editNotes,
        status: 'pending',
      });
      setEditingId(null);
      setActionMessage('Viewing schedule updated successfully!');
      await onRefresh?.();
    } catch (err) {
      setActionMessage(err.message || 'Could not update viewing schedule.');
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this viewing request?')) return;
    setBusyId(requestId);
    try {
      await cancelViewingRequest(requestId);
      setActionMessage('Viewing request cancelled.');
      await onRefresh?.();
    } catch (err) {
      setActionMessage(err.message || 'Could not cancel viewing request.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if (!window.confirm('Remove this viewing record permanently?')) return;
    setBusyId(requestId);
    try {
      await deleteViewingRequest(requestId);
      setActionMessage('Viewing record removed.');
      await onRefresh?.();
    } catch (err) {
      setActionMessage(err.message || 'Could not remove viewing record.');
    } finally {
      setBusyId(null);
    }
  };

  return <div className="property-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="property-dialog viewing-dialog" role="dialog" aria-modal="true" aria-labelledby="viewings-dialog-title" onMouseDown={(event) => event.stopPropagation()}>
      <button ref={closeRef} className="dialog-close" type="button" onClick={onClose} aria-label="Close viewing appointments">×</button>
      <div className="eyebrow" style={{ color: '#496252', marginBottom: 8 }}><CalendarCheck size={16} /> Private Appointments</div>
      <h2 id="viewings-dialog-title" style={{ marginBottom: 6 }}>My Viewing Requests</h2>
      <p style={{ margin: '0 0 18px', color: '#687b70', fontSize: 13 }}>Manage or adjust your scheduled property walkthroughs with Melissa Barlin and local advisors.</p>

      {actionMessage && <div className="viewing-alert-banner">{actionMessage}</div>}

      {requests.length === 0 ? (
        <div className="property-state" style={{ minHeight: 140 }}>
          <p>No viewing requests scheduled yet.</p>
          <small style={{ color: '#738077', marginTop: 6 }}>While browsing any Bataan home, click "Schedule viewing" or ask Vanguard to arrange a walkthrough.</small>
        </div>
      ) : (
        <div className="viewing-list">
          {requests.map((req) => {
            const prop = properties.find((p) => p.id === req.property_id);
            const isEditing = editingId === req.id;
            const isBusy = busyId === req.id;
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

                  {isEditing ? (
                    <form className="viewing-edit-form" onSubmit={(e) => { e.preventDefault(); handleSaveEdit(req.id); }}>
                      <div className="edit-form-grid">
                        <label>
                          <span>Preferred Date:</span>
                          <input
                            type="date"
                            required
                            min={new Date().toISOString().split('T')[0]}
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                          />
                        </label>
                        <label>
                          <span>Preferred Time:</span>
                          <select value={editTime} onChange={(e) => setEditTime(e.target.value)}>
                            <option value="Morning (9:00 AM - 11:30 AM)">Morning (9:00 AM - 11:30 AM)</option>
                            <option value="Early Afternoon (1:00 PM - 3:00 PM)">Early Afternoon (1:00 PM - 3:00 PM)</option>
                            <option value="Late Afternoon (3:30 PM - 5:30 PM)">Late Afternoon (3:30 PM - 5:30 PM)</option>
                            <option value="Sunset / Golden Hour (5:30 PM)">Sunset / Golden Hour (5:30 PM)</option>
                            <option value="Flexible / Any Time">Flexible / Any Time</option>
                          </select>
                        </label>
                      </div>
                      <label style={{ display: 'grid', gap: 4, marginTop: 8 }}>
                        <span>Notes or Special Requests:</span>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="e.g., questions about title, wanting to inspect beachfront, preferred companions"
                        />
                      </label>
                      <div className="edit-form-actions">
                        <button type="submit" className="save-schedule-btn" disabled={isBusy}>
                          <Check size={14} /> {isBusy ? 'Saving...' : 'Save Schedule'}
                        </button>
                        <button type="button" className="cancel-edit-btn" disabled={isBusy} onClick={() => setEditingId(null)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {req.notes && <p className="viewing-notes">"{req.notes}"</p>}
                      <div className="viewing-card-toolbar">
                        {req.status !== 'cancelled' ? (
                          <>
                            <button
                              type="button"
                              className="viewing-action-btn edit-action"
                              disabled={isBusy}
                              onClick={() => startEditing(req)}
                              title="Edit viewing schedule"
                            >
                              <Pencil size={13} /> Edit schedule
                            </button>
                            <button
                              type="button"
                              className="viewing-action-btn cancel-action"
                              disabled={isBusy}
                              onClick={() => handleCancelRequest(req.id)}
                              title="Cancel this viewing"
                            >
                              <XCircle size={13} /> Cancel request
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="viewing-action-btn edit-action"
                              disabled={isBusy}
                              onClick={() => startEditing(req)}
                              title="Reschedule this viewing"
                            >
                              <RotateCcw size={13} /> Reschedule
                            </button>
                            <button
                              type="button"
                              className="viewing-action-btn delete-action"
                              disabled={isBusy}
                              onClick={() => handleDeleteRequest(req.id)}
                              title="Delete record"
                            >
                              <Trash2 size={13} /> Remove
                            </button>
                          </>
                        )}
                        {prop && (
                          <button
                            type="button"
                            className="detail-button"
                            style={{ padding: '0', marginLeft: 'auto' }}
                            onClick={() => { onClose(); onSelectProperty(prop); }}
                          >
                            View listing <MoveRight size={14} />
                          </button>
                        )}
                      </div>
                    </>
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
  const [chatDraft, setChatDraft] = useState('');
  const [chatOpen, setChatOpen] = useState(false);

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
    if (!auth?.requireAuth('Sign in to schedule an in-person viewing with our advisors.')) return;
    setActiveListing(property);
    closeDialog();
    const prompt = `Hi Vanguard, I would like to schedule an in-person viewing with Melissa Barlin for "${property.title}" in ${property.location} (listed at ${property.price}). What dates and times are available?`;
    setChatDraft(prompt);
    setChatOpen(true);
  };

  return <main>
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="#top"><span>H</span> HAVEN</a>
        <div className="nav-links">{NAV_LINKS.map(([href, label]) => <a key={href} href={href}>{label}</a>)}</div>
        <div className="header-actions">
          <AuthControls />
          {auth?.user && (
            <button type="button" className="nav-viewings-btn" onClick={() => setViewingDrawerOpen(true)} title="My Viewing Requests">
              <CalendarCheck size={16} />
              <span>Viewings</span>
              {viewingRequests.length > 0 && <span className="nav-viewings-badge">{viewingRequests.length}</span>}
            </button>
          )}
          <a className="nav-cta" href="#intelligence">Speak with Melissa Barlin <MoveRight size={16} /></a>
        </div>
        <button className="mobile-menu" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={23} /> : <Menu size={23} />}</button>
      </div>
      {menuOpen && <div className="mobile-nav" id="mobile-nav">
        {NAV_LINKS.map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)}>{label}</a>)}
        {auth?.user && (
          <button type="button" className="mobile-nav-link-btn" onClick={() => { setMenuOpen(false); setViewingDrawerOpen(true); }}>
            <CalendarCheck size={16} /> My Viewing Requests ({viewingRequests.length})
          </button>
        )}
        <a className="mobile-nav-cta" href="#intelligence" onClick={() => setMenuOpen(false)}>Speak with Melissa Barlin <MoveRight size={17} /></a>
      </div>}
    </header>

    <section className="hero" id="top">
      <div className="hero-content">
        <div className="eyebrow"><Sparkles size={15} /> Curated homes. Human guidance.</div>
        <h1>Find your next <em>sanctuary.</em></h1>
        <p>Discover exceptional properties across Bataan, thoughtfully matched to the life you want to live.</p>

        <form className="search-panel" onSubmit={submitSearch}>
          <label className="search-input-field">
            <Search size={18} />
            <span>
              <small>Search Keyword</small>
              <input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder="Subdivision, beach, or landmark" aria-label="Search Bataan listings" />
            </span>
          </label>
          <label className="search-filter">
            <MapPin size={18} />
            <span>
              <small>Town / Municipality</small>
              <strong>{filters.municipality || 'All Bataan'}</strong>
            </span>
            <ChevronDown className="select-chevron" size={17} />
            <select className="filter-select" value={filters.municipality} onChange={(event) => updateFilter('municipality', event.target.value)} aria-label="Town or municipality">
              <option value="">All Bataan</option>
              {BATAAN_MUNICIPALITIES.map((town) => <option key={town} value={town}>{town}</option>)}
            </select>
          </label>
          <label className="search-filter">
            <span className="search-label-icon">₱</span>
            <span>
              <small>Price Range</small>
              <strong>{filters.priceBand === 'under1m' ? 'Under ₱1M' : filters.priceBand === '1m-5m' ? '₱1M–₱5M' : filters.priceBand === '5m-10m' ? '₱5M–₱10M' : filters.priceBand === 'over10m' ? 'Over ₱10M' : 'Any price'}</strong>
            </span>
            <ChevronDown className="select-chevron" size={17} />
            <select className="filter-select" value={filters.priceBand} onChange={(event) => updateFilter('priceBand', event.target.value)} aria-label="Price range">
              <option value="">Any price</option>
              <option value="under1m">Under ₱1M</option>
              <option value="1m-5m">₱1M–₱5M</option>
              <option value="5m-10m">₱5M–₱10M</option>
              <option value="over10m">Over ₱10M</option>
            </select>
          </label>
          <label className="search-filter">
            <Building2 size={18} />
            <span>
              <small>Property Type</small>
              <strong>{filters.propertyType || 'All properties'}</strong>
            </span>
            <ChevronDown className="select-chevron" size={17} />
            <select className="filter-select" value={filters.propertyType} onChange={(event) => updateFilter('propertyType', event.target.value)} aria-label="Property type">
              <option value="">All properties</option>
              <option>House</option>
              <option>Condo</option>
              <option>Land</option>
              <option>Commercial</option>
            </select>
          </label>
          <button type="submit" className="search-submit-btn"><Search size={18} /> Find homes</button>
        </form>

        <div className="quick-inspiration-tags">
          <span className="inspiration-label">Popular searches:</span>
          <button type="button" onClick={() => { updateFilter('municipality', 'Morong'); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); }}>Beachfront Morong</button>
          <button type="button" onClick={() => { updateFilter('municipality', 'Balanga'); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); }}>Balanga Center</button>
          <button type="button" onClick={() => { updateFilter('priceBand', '1m-5m'); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); }}>₱1M–₱5M Starter</button>
          <button type="button" onClick={() => { updateFilter('bedrooms', '3'); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); }}>3-Bed Homes</button>
          <button type="button" onClick={() => { updateFilter('propertyType', 'Land'); document.querySelector('#properties')?.scrollIntoView({ behavior: 'smooth' }); }}>Investment Lots</button>
        </div>
      </div>

      <div className="hero-trust-bar">
        <span><i /> 780+ Curated Listings</span>
        <span><MapPin size={13} /> 12 Bataan Municipalities</span>
        <span><UserCheck size={14} /> Vanguard AI + Melissa Barlin Advisory</span>
      </div>
    </section>

    <section className="properties" id="properties">
      <div className="catalog-header-deck">
        <div className="deck-title-row">
          <div>
            <p className="section-kicker">Bataan Collection</p>
            <h2>{showSaved ? 'Your Saved Sanctuaries' : 'Homes Worth Coming Home To'}</h2>
          </div>

          <div className="catalog-view-switcher" role="tablist">
            <button
              type="button"
              className={`switcher-pill ${!showSaved ? 'is-active' : ''}`}
              role="tab"
              aria-selected={!showSaved}
              onClick={() => { if (showSaved) toggleSavedView(); }}
            >
              All Properties <span className="pill-count">{searchedProperties.length}</span>
            </button>
            <button
              type="button"
              className={`switcher-pill ${showSaved ? 'is-active' : ''}`}
              role="tab"
              aria-selected={showSaved}
              onClick={() => { if (!showSaved) toggleSavedView(); }}
            >
              <Heart size={14} fill={showSaved ? 'currentColor' : 'none'} /> Saved <span className="pill-count">{savedIds.size}</span>
            </button>
          </div>
        </div>

        <div className="catalog-filter-bar">
          <div className="bedroom-pills" role="radiogroup" aria-label="Filter by bedrooms">
            <span className="pill-label"><BedDouble size={15} /> Bedrooms:</span>
            {[{ id: '', label: 'Any' }, { id: '1', label: '1 Bed' }, { id: '2', label: '2 Beds' }, { id: '3', label: '3 Beds' }, { id: '4+', label: '4+ Beds' }].map(({ id, label }) => (
              <button key={id || 'any'} type="button" className={`bedroom-pill ${filters.bedrooms === id ? 'bedroom-pill-active' : ''}`} aria-pressed={filters.bedrooms === id} onClick={() => updateFilter('bedrooms', id)}>{label}</button>
            ))}
          </div>

          <div className="deck-sort-row">
            <label className="sort-control">
              <span>Sort by:</span>
              <select value={filters.sort} onChange={(event) => updateFilter('sort', event.target.value)}>
                <option value="newest">Newest First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="title">Listing Title</option>
              </select>
            </label>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="active-chips-strip">
            <span className="active-chips-label">Active:</span>
            {filters.query && <span className="filter-chip-tag">"{filters.query}"<button type="button" aria-label="Remove search keyword filter" onClick={() => { setDraftQuery(''); updateFilter('query', ''); }}>×</button></span>}
            {filters.municipality && <span className="filter-chip-tag">📍 {filters.municipality}<button type="button" aria-label="Remove town filter" onClick={() => updateFilter('municipality', '')}>×</button></span>}
            {filters.bedrooms && <span className="filter-chip-tag">🛏️ {filters.bedrooms === '4+' ? '4+ Beds' : `${filters.bedrooms} Bed${filters.bedrooms === '1' ? '' : 's'}`}<button type="button" aria-label="Remove bedroom filter" onClick={() => updateFilter('bedrooms', '')}>×</button></span>}
            {filters.priceBand && <span className="filter-chip-tag">₱ {filters.priceBand === 'under1m' ? 'Under ₱1M' : filters.priceBand === '1m-5m' ? '₱1M–₱5M' : filters.priceBand === '5m-10m' ? '₱5M–₱10M' : 'Over ₱10M'}<button type="button" aria-label="Remove price filter" onClick={() => updateFilter('priceBand', '')}>×</button></span>}
            {filters.propertyType && <span className="filter-chip-tag">🏡 {filters.propertyType}<button type="button" aria-label="Remove type filter" onClick={() => updateFilter('propertyType', '')}>×</button></span>}
            <button className="clear-all-tag" type="button" onClick={clearSearch}>Reset filters</button>
          </div>
        )}
      </div>

      {!loading && !error && <div className="results-toolbar"><p className="result-count">{filteredProperties.length} listing{filteredProperties.length === 1 ? '' : 's'} found{hiddenUnpriced > 0 && <span className="result-note"> · {hiddenUnpriced} hidden with no listed price</span>}</p></div>}
      {loading && <div className="property-state">Loading Bataan property listings…</div>}
      {error && <div className="property-state error-state"><p>{error}</p><button type="button" onClick={() => void loadProperties()}>Try again</button></div>}
      {!loading && !error && visibleProperties.length === 0 && (
        <div className="property-empty-card">
          {showSaved ? (
            <div className="empty-state-content">
              <div className="empty-icon-circle"><Heart size={26} /></div>
              <h3>Your sanctuary collection is empty</h3>
              <p>Curate your private shortlist by tapping the heart on any property listing. Your selections automatically sync across devices.</p>
              <button type="button" className="empty-action-btn" onClick={toggleSavedView}>
                Explore 780+ Bataan Homes <MoveRight size={15} />
              </button>
            </div>
          ) : (
            <div className="empty-state-content">
              <div className="empty-icon-circle"><Search size={26} /></div>
              <h3>No sanctuaries match your criteria</h3>
              <p>Try clearing filters or broadening your search parameters across Bataan municipalities.</p>
              <button type="button" className="empty-action-btn" onClick={clearSearch}>
                <RotateCcw size={14} /> Reset All Filters
              </button>
            </div>
          )}
        </div>
      )}
      {!loading && !error && visibleProperties.length > 0 && <><div className="property-grid">{visibleProperties.map((property) => <PropertyCard property={property} key={property.id} onSelect={selectProperty} isSaved={savedIds.has(property.id)} onToggleSaved={toggleSaved} onScheduleViewing={handleScheduleViewing} />)}</div><nav className="pagination" aria-label="Property listing pages"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>Next</button></nav></>}
    </section>

    {selected && <PropertyDialog property={selected} onClose={closeDialog} onScheduleViewing={handleScheduleViewing} />}
    {viewingDrawerOpen && (
      <ViewingRequestsModal
        requests={viewingRequests}
        properties={properties}
        onClose={() => setViewingDrawerOpen(false)}
        onSelectProperty={selectProperty}
        onRefresh={() => loadViewingRequests(auth?.user?.id)}
      />
    )}

    <RagShowcase />

    <section className="our-story" id="about">
      <div className="our-story-inner">
        {/* Left Column: High-Res Visual / Product Sanctuary Container */}
        <div className="story-media-column h-full">
          <div className="story-image-container h-full">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=85"
              alt="Haven Estates — Architectural sanctuary discovery across the Bataan peninsula"
              className="story-image h-full object-cover"
              loading="lazy"
            />
            <div className="story-image-caption">
              <span className="caption-tag">Bataan Peninsula</span>
              <span className="caption-text">Curated Sanctuary Discovery</span>
            </div>
          </div>
        </div>

        {/* Right Column: Narrative & Regional Scope */}
        <div className="story-text-column">
          <div className="story-header-group">
            <p className="section-kicker">Our Story</p>
            <h2>
              Built with <span className="title-kw">curiosity</span>, <span className="title-kw">data</span>, and a <em className="title-highlight">local point of view.</em>
            </h2>
          </div>

          <div className="story-paragraphs">
            <p className="story-lead">
              Haven is shaped by <strong>Luis Tengonciang</strong>, an Applied Mathematics and Data Science student at Ateneo de Manila University.
            </p>
            <p>
              The project brings together thoughtful design, practical data work, and a belief that property discovery should feel more transparent and personal.
            </p>
          </div>

          {/* Emphasized Regional Scope Highlight Card */}
          <div className="story-region-card">
            <div className="region-card-badge">
              <MapPin size={13} />
              <span>Starting with Bataan</span>
            </div>
            <p className="region-card-text">
              Transforming scattered listing information across <strong>12 peninsula municipalities</strong> into a clearer place to search, compare, and ask better questions before making a decision.
            </p>
            <div className="region-card-metrics">
              <span className="region-metric-pill">780+ Curated Homes</span>
              <span className="region-metric-pill">Registry Grounded</span>
              <span className="region-metric-pill">Zero Hidden Data</span>
            </div>
          </div>

          {/* Creator Tag as Inline Chip with Muted Background & Small Rounded Corners */}
          <div className="creator-attribution-wrap mt-6">
            <span className="creator-chip">
              <span className="creator-chip-dot" />
              <span className="creator-name">Luis Tengonciang</span>
              <span className="creator-divider">·</span>
              <span className="creator-role">Developer & Creator</span>
            </span>
          </div>
        </div>
      </div>
    </section>

    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand-col">
          <a className="brand" href="#top"><span>H</span> HAVEN</a>
          <p>Curated property discovery across the Bataan peninsula. Paired with intelligent AI retrieval and licensed broker advisory.</p>
        </div>
        <div className="footer-links-col">
          <h4>Explore</h4>
          <a href="#properties">Browse Listings</a>
          <a href="#intelligence">Vanguard Intelligence</a>
          <a href="#about">Our Story</a>
          {auth?.user && <button type="button" className="footer-link-btn" onClick={() => setViewingDrawerOpen(true)}>My Viewings ({viewingRequests.length})</button>}
        </div>
        <div className="footer-links-col">
          <h4>Advisors</h4>
          <p className="advisor-name">Melissa Barlin</p>
          <small>Senior Real Estate Specialist</small>
          <small className="advisor-loc">Bataan, Philippines</small>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© 2026 Haven Estates · Built by Luis Tengonciang (Ateneo de Manila University).</p>
      </div>
    </footer>

    <button className="filter-chip" type="button" onClick={() => document.querySelector('#top input')?.focus()}><SlidersHorizontal size={18} /> Refine your search</button>
    <AgenticChatbot
      activeListing={activeListing}
      initialDraft={chatDraft}
      isOpen={chatOpen}
      onOpenChange={(openState) => {
        setChatOpen(openState);
        if (!openState) setChatDraft('');
      }}
    />
  </main>;
}
