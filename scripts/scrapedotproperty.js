import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Verify variables exist before client creation
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in environment!');
}

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    realtime: {
      transport: ws,
    },
  }
);

const BASE_URL = 'https://www.dotproperty.com.ph/properties-for-sale/bataan';

// Helper function to pause briefly between requests (avoids IP blocks)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

// Last-resort title when the markup changes again: "/ads/3-bedroom-house-xyz" -> "3 Bedroom House".
function titleFromUrl(sourceUrl) {
  if (!sourceUrl) return '';
  const slug = sourceUrl.split('/').filter(Boolean).pop() || '';
  return clean(slug.replace(/[-_]+/g, ' ')).replace(/\b\w/g, (letter) => letter.toUpperCase());
}

// Spec values sit two levels above their icon (icon wrapper -> row -> "3", "485 m2").
function specFromIcon(card, iconName) {
  const icon = card.find(`img[src*="${iconName}-"]`).first();
  return icon.length ? clean(icon.parent().parent().text()) || null : null;
}

async function scrapeAllBataanListings() {
  let page = 1;
  let totalSaved = 0;
  let hasNextPage = true;

  console.log('🕷️ Starting full Bataan scrape across all pages...');

  while (hasNextPage) {
    // DotProperty page URL structure
    const targetUrl = `${BASE_URL}?page=${page}&exact_bed=false`;
    console.log(`\n📄 Scraping Page ${page}: ${targetUrl}`);

    try {
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      const $ = cheerio.load(response.data);
      const properties = [];

      // Extract cards from the page
      $('article.listing-snippet').each((_, element) => {
        const card = $(element);
        const linkEl = card.find('a[href*="/ads/"], a[href*="/property/"]').first();
        const relativeLink = linkEl.attr('href');
        const sourceUrl = relativeLink ? new URL(relativeLink, BASE_URL).href : null;

        const cardText = card.text();

        // The card heading and location live in their own blocks; the anchor itself
        // wraps the photo carousel and has no text, so read them directly.
        const title = clean(card.find('div.text-2xl.font-semibold').first().text())
          || clean(card.find('h2, h3').text())
          || titleFromUrl(sourceUrl);

        const price = clean(card.find('div.text-secondary-base').first().text())
          || (cardText.match(/₱\s?[\d,]+/) || [])[0]
          || 'Price on Ask';

        const location = clean(card.find('div.text-neutral-2').first().text()) || 'Bataan';
        const description = clean(card.find('div.line-clamp-4, div.line-clamp-3').first().text()) || null;

        // Spec icons are served as hashed SVG assets: bed-*.svg, bathtub-*.svg,
        // resize-*.svg. The floor-area icon is "resize", not "area".
        const bedrooms = specFromIcon(card, 'bed');
        const bathrooms = specFromIcon(card, 'bathtub');
        const floorArea = specFromIcon(card, 'resize');

        // Each card ships its full gallery inline; keep a handful for the detail view.
        const imageUrls = [...new Set(
          card.find('img[src*="pix.dotproperty"]').map((_index, image) => $(image).attr('src')).get(),
        )].slice(0, 10);

        if (sourceUrl) {
          properties.push({
            title: title || 'Property Listing',
            price,
            location,
            description,
            bedrooms,
            bathrooms,
            floor_area: floorArea,
            image_urls: imageUrls.length ? imageUrls : null,
            source_url: sourceUrl,
          });
        }
      });

      console.log(`🔍 Page ${page}: Extracted ${properties.length} listings.`);

      // Stop if no properties are found on this page
      if (properties.length === 0) {
        console.log(`🏁 Reached end of listings or empty page at Page ${page}. Stopping.`);
        hasNextPage = false;
        break;
      }

      // Upsert current batch into Supabase
      const { data, error } = await supabase
        .from('bataan_properties')
        .upsert(properties, { onConflict: 'source_url' })
        .select();

      if (error) {
        console.error(`❌ Supabase Error on Page ${page}:`, error.message);
        break;
      } else {
        totalSaved += data.length;
        console.log(`✅ Stored ${data.length} listings from Page ${page}. (Total so far: ${totalSaved})`);
      }

      page++;
      // Polite 2-second delay between page requests
      await sleep(2000);

    } catch (err) {
      console.error(`❌ Pipeline failed on Page ${page}:`, err.message);
      hasNextPage = false;
    }
  }

  console.log(`\n🎉 Scrape Complete! Total properties processed & saved in Supabase: ${totalSaved}`);
}

scrapeAllBataanListings();