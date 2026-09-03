import { supabase, supabaseConfigReady } from './supabase.js';

const LISTINGS_TABLE = 'bataan_properties';

function numberFromText(value) {
  const digits = String(value ?? '').replace(/[^0-9.]/g, '');
  return digits ? Number(digits) : null;
}

function compactText(value, fallback = 'Bataan, Philippines') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 110 ? `${text.slice(0, 107).trimEnd()}…` : text;
}

function propertyTypeFrom(row) {
  const text = `${row.title ?? ''} ${row.location ?? ''}`.toLowerCase();
  if (/condo|condominium|apartment/.test(text)) return 'Condo';
  if (/house|villa|townhouse|home/.test(text)) return 'House';
  if (/commercial|warehouse|office/.test(text)) return 'Commercial';
  if (/land|lot|farm/.test(text)) return 'Land';
  return 'Property';
}

function fallbackImageFrom(row) {
  const images = {
    Condo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1100&q=85',
    House: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1100&q=85',
    Land: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1100&q=85',
    Commercial: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1100&q=85',
    Property: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1100&q=85',
  };
  return images[propertyTypeFrom(row)];
}

export const BATAAN_MUNICIPALITIES = [
  'Morong',
  'Bagac',
  'Mariveles',
  'Balanga',
  'Abucay',
  'Hermosa',
  'Limay',
  'Orani',
  'Samal',
  'Orion',
  'Dinalupihan',
  'Pilar',
];

export function detectMunicipality(row) {
  const text = `${row.location ?? ''} ${row.title ?? ''}`.toLowerCase();
  return BATAAN_MUNICIPALITIES.find((m) => text.includes(m.toLowerCase())) || null;
}

export function mapBataanProperty(row) {
  // Real listing photos when the scrape captured them; the type-keyed stock image
  // is only a placeholder for rows scraped before image_urls existed.
  const photos = Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [];
  const bedroomsNum = row.bedrooms ? parseInt(row.bedrooms, 10) : null;
  const municipality = detectMunicipality(row);

  return {
    id: row.id,
    title: compactText(row.title, 'Property listing'),
    price: row.price || 'Price on request',
    priceValue: numberFromText(row.price),
    location: compactText(row.location),
    fullLocation: String(row.location ?? '').replace(/\s+/g, ' ').trim(),
    description: String(row.description ?? '').replace(/\s+/g, ' ').trim() || null,
    bedrooms: row.bedrooms || '—',
    bedroomCount: Number.isFinite(bedroomsNum) ? bedroomsNum : null,
    bathrooms: row.bathrooms || '—',
    floorArea: row.floor_area || '—',
    type: propertyTypeFrom(row),
    municipality,
    photos,
    image: photos[0] || fallbackImageFrom(row),
    hasRealPhoto: photos.length > 0,
    sourceUrl: row.source_url,
    scrapedAt: row.scraped_at,
    // source_url is deliberately excluded: every row shares the same host, so
    // including it made queries like "com" or "dotproperty" match everything.
    searchableText: `${row.title ?? ''} ${row.location ?? ''}`.toLowerCase(),
  };
}

/** Retrieves every current Bataan listing from Supabase; no local fallback data is used. */
export async function getBataanProperties() {
  if (!supabase || !supabaseConfigReady) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .select('id, title, price, location, description, bedrooms, bathrooms, floor_area, image_urls, source_url, scraped_at')
    .order('scraped_at', { ascending: false, nullsFirst: false })
    .range(0, 999);
  if (error) throw error;
  return (data ?? []).map(mapBataanProperty);
}

/**
 * Applies the search filters and sort.
 * Returns the matches plus how many listings a price band excluded purely for
 * having no parseable price, so the UI can explain their absence instead of
 * dropping them silently.
 */
export function filterAndSortProperties(properties, { query = '', priceBand = '', propertyType = '', municipality = '', bedrooms = '', sort = 'newest' }) {
  const normalizedQuery = query.trim().toLowerCase();
  const priceBands = { under1m: [0, 1_000_000], '1m-5m': [1_000_000, 5_000_000], '5m-10m': [5_000_000, 10_000_000], over10m: [10_000_000, Infinity] };
  const range = priceBands[priceBand];
  let hiddenUnpriced = 0;
  const filtered = properties.filter((property) => {
    const matchesQuery = !normalizedQuery || property.searchableText.includes(normalizedQuery);
    const matchesType = !propertyType || property.type === propertyType;
    const matchesMuni = !municipality || property.municipality === municipality;

    let matchesBeds = true;
    if (bedrooms === '1') matchesBeds = property.bedroomCount === 1;
    else if (bedrooms === '2') matchesBeds = property.bedroomCount === 2;
    else if (bedrooms === '3') matchesBeds = property.bedroomCount === 3;
    else if (bedrooms === '4+') matchesBeds = property.bedroomCount !== null && property.bedroomCount >= 4;

    if (!matchesQuery || !matchesType || !matchesMuni || !matchesBeds) return false;
    if (!range) return true;
    if (property.priceValue === null) {
      hiddenUnpriced += 1;
      return false;
    }
    return property.priceValue >= range[0] && property.priceValue < range[1];
  });
  const items = [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity);
    if (sort === 'price-desc') return (b.priceValue ?? -Infinity) - (a.priceValue ?? -Infinity);
    if (sort === 'title') return a.title.localeCompare(b.title);
    return new Date(b.scrapedAt ?? 0) - new Date(a.scrapedAt ?? 0);
  });
  return { items, hiddenUnpriced };
}

export async function fetchUserSavedProperties(userId) {
  if (!supabase || !supabaseConfigReady || !userId) return [];
  const { data, error } = await supabase
    .from('saved_properties')
    .select('property_id')
    .eq('user_id', userId);
  if (error) {
    console.warn('Could not load saved properties:', error.message);
    return [];
  }
  return (data ?? []).map((row) => row.property_id);
}

export async function savePropertyToCloud(userId, propertyId) {
  if (!supabase || !supabaseConfigReady || !userId || !propertyId) return;
  const { error } = await supabase
    .from('saved_properties')
    .upsert({ user_id: userId, property_id: propertyId }, { onConflict: 'user_id,property_id' });
  if (error) console.warn('Could not save property to cloud:', error.message);
}

export async function removePropertyFromCloud(userId, propertyId) {
  if (!supabase || !supabaseConfigReady || !userId || !propertyId) return;
  const { error } = await supabase
    .from('saved_properties')
    .delete()
    .eq('user_id', userId)
    .eq('property_id', propertyId);
  if (error) console.warn('Could not remove property from cloud:', error.message);
}

export async function mergeLocalSavedWithCloud(userId, localIds = []) {
  if (!supabase || !supabaseConfigReady || !userId) return new Set(localIds);
  const cloudIds = await fetchUserSavedProperties(userId);
  const combined = new Set([...cloudIds, ...localIds]);

  const toBackfill = localIds.filter((id) => !cloudIds.includes(id));
  if (toBackfill.length > 0) {
    const rows = toBackfill.map((property_id) => ({ user_id: userId, property_id }));
    const { error } = await supabase
      .from('saved_properties')
      .upsert(rows, { onConflict: 'user_id,property_id' });
    if (error) console.warn('Could not backfill local saved properties:', error.message);
  }

  return combined;
}

export async function fetchUserViewingRequests(userId) {
  if (!supabase || !supabaseConfigReady || !userId) return [];
  const { data, error } = await supabase
    .from('viewing_requests')
    .select('id, property_id, preferred_date, preferred_time, notes, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) {
    console.warn('Could not load viewing requests:', error.message);
    return [];
  }
  return data ?? [];
}

