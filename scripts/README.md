# Haven Estates Data Ingestion Pipeline

This directory contains the data collection scripts for Haven Estates.

## `scrapedotproperty.js`

A Node.js web scraper that fetches property listings across all available pages for Bataan from Dot Property Philippines (`https://www.dotproperty.com.ph/properties-for-sale/bataan`).

### Features:
* Extracts titles, price, location, bedrooms, bathrooms, and floor area.
* Extracts multi-image CDN photo galleries (`pix.dotproperty.co.th`).
* Captures detailed listing description text.
* Upserts records into Supabase `bataan_properties` on conflict `source_url`.

### Prerequisites:
Ensure your `.env` or `.env.local` contains:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
VITE_SUPABASE_URL=https://your-project.supabase.co # or SUPABASE_URL
```

### Running the Scraper:
```bash
npm run scrape
```
