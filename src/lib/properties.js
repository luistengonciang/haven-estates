import { supabase, supabaseConfigReady } from './supabase';

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

export function mapBataanProperty(row) {
  return {
    id: row.id,
    title: compactText(row.title, 'Property listing'),
    price: row.price || 'Price on request',
    priceValue: numberFromText(row.price),
    location: compactText(row.location),
    fullLocation: String(row.location ?? '').replace(/\s+/g, ' ').trim(),
    bedrooms: row.bedrooms || '—',
    bathrooms: row.bathrooms || '—',
    floorArea: row.floor_area || '—',
    type: propertyTypeFrom(row),
    sourceUrl: row.source_url,
    scrapedAt: row.scraped_at,
  };
}

/** Retrieves every current Bataan listing from Supabase; no local fallback data is used. */
export async function getBataanProperties() {
  if (!supabase || !supabaseConfigReady) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await supabase
    .from(LISTINGS_TABLE)
    .select('id, title, price, location, bedrooms, bathrooms, floor_area, source_url, scraped_at')
    .order('scraped_at', { ascending: false, nullsFirst: false })
    .range(0, 999);
  if (error) throw error;
  return (data ?? []).map(mapBataanProperty);
}

export function filterAndSortProperties(properties, { query, priceBand, propertyType, sort }) {
  const normalizedQuery = query.trim().toLowerCase();
  const priceBands = { under1m: [0, 1_000_000], '1m-5m': [1_000_000, 5_000_000], '5m-10m': [5_000_000, 10_000_000], over10m: [10_000_000, Infinity] };
  const range = priceBands[priceBand];
  const filtered = properties.filter((property) => {
    const matchesQuery = !normalizedQuery || `${property.title} ${property.location}`.toLowerCase().includes(normalizedQuery);
    const matchesType = !propertyType || property.type === propertyType;
    const matchesPrice = !range || (property.priceValue !== null && property.priceValue >= range[0] && property.priceValue < range[1]);
    return matchesQuery && matchesType && matchesPrice;
  });
  return [...filtered].sort((a, b) => {
    if (sort === 'price-asc') return (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity);
    if (sort === 'price-desc') return (b.priceValue ?? -Infinity) - (a.priceValue ?? -Infinity);
    if (sort === 'title') return a.title.localeCompare(b.title);
    return new Date(b.scrapedAt ?? 0) - new Date(a.scrapedAt ?? 0);
  });
}
