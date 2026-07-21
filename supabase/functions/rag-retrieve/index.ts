import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maxQueryCharacters = 2_000;
const maxMatchCount = 10;
const maxDocumentCharacters = 1_200;

type RetrievedDocument = { title?: string; content?: string };
type Listing = {
  id: string;
  title?: string;
  price?: string;
  location?: string;
  bedrooms?: string;
  bathrooms?: string;
  floor_area?: string;
  source_url?: string;
  rank?: number;
};
type KnowledgeDocument = {
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  similarity?: number;
};

const compact = (value: unknown, limit: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

const formatPercentage = (val: number, maxVal: number) =>
  maxVal > 0 ? `${Math.round((val / maxVal) * 100)}%` : "0%";

function listingSearchText(query: string) {
  const ignored = new Set([
    "about", "before", "buying", "check", "find", "from", "have", "home",
    "listing", "listings", "property", "properties", "should", "that", "the",
    "what", "with",
  ]);
  const terms = (query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter(
    (term) => !ignored.has(term),
  ).slice(0, 4);
  
  // Uses uppercase "OR" for websearch_to_tsquery compatibility
  return terms.length ? terms.join(" OR ") : query;
}

function extractMaxPrice(query: string) {
  const match = query.toLowerCase().match(
    /(?:under|below|less than|up to|max(?:imum)?(?: budget)?)\s*(?:₱|php|p)?\s*([\d,.]+)\s*(million|m|k)?/i,
  );
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount)) return null;
  const unit = match[2]?.toLowerCase();
  return amount *
    (unit === "million" || unit === "m" ? 1_000_000 : unit === "k" ? 1_000 : 1);
}

function extractPropertyType(query: string) {
  const q = query.toLowerCase();
  if (/\b(home|house|houses|villa|townhouse)\b/i.test(q)) return "house";
  if (/\b(condo|condominium|apartment|unit)\b/i.test(q)) return "condo";
  if (/\b(lot|land|farm|rawland)\b/i.test(q)) return "lot";
  if (/\b(commercial|office|warehouse|space)\b/i.test(q)) return "commercial";
  return null;
}

function extractLocation(query: string) {
  // All 12 LGUs in Bataan
  const locations = [
    "abucay", "bagac", "balanga", "dinalupihan", "hermosa", "limay",
    "mariveles", "morong", "orani", "orion", "pilar", "samal",
  ];
  return locations.find((location) => query.toLowerCase().includes(location)) ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();
    const query = typeof body?.query === "string" ? body.query.trim() : "";
    const requestedMatchCount = Number(body?.matchCount);
    const matchCount = Number.isFinite(requestedMatchCount)
      ? Math.max(1, Math.min(Math.floor(requestedMatchCount), maxMatchCount))
      : 5;

    if (!query || query.length > maxQueryCharacters) {
      return Response.json({ error: "A valid query is required." }, {
        status: 400,
        headers: corsHeaders,
      });
    }

    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !key) throw new Error("Supabase configuration is unavailable");

    const supabase = createClient(url, key, {
      global: {
        headers: { Authorization: req.headers.get("authorization") ?? "" },
      },
    });

    const embeddingModel = new Supabase.ai.Session("gte-small");
    const embedding = await embeddingModel.run(query, {
      mean_pool: true,
      normalize: true,
    }) as number[];

    const [
      { data: listings, error: listingsError },
      { data: knowledge, error: knowledgeError },
    ] = await Promise.all([
      supabase.rpc("search_bataan_properties", {
        search_text: listingSearchText(query),
        match_count: matchCount,
        max_price: extractMaxPrice(query),
        property_type: extractPropertyType(query),
        location_filter: extractLocation(query),
      }),
      supabase.rpc("match_knowledge_documents", {
        query_embedding: Array.from(embedding),
        match_threshold: 0.35,
        match_count: matchCount, // Dynamic match count
        // Filter inside RPC via metadata filter if your SQL function supports it
      }),
    ]);

    if (listingsError) throw listingsError;
    if (knowledgeError) throw knowledgeError;

    const typedListings = (listings ?? []) as Listing[];
    const highestRank = Math.max(
      ...typedListings.map((listing) => Number(listing.rank) || 0),
      0,
    );

    const propertyDocuments: RetrievedDocument[] = typedListings.map((listing) => ({
      title: `${compact(listing.title, 90) || "Bataan property"}${
        listing.price ? ` — ${compact(listing.price, 40)}` : ""
      }`,
      content: [
        "Bataan listing record:",
        listing.price ? `price ${compact(listing.price, 40)}` : null,
        listing.bedrooms ? `${compact(listing.bedrooms, 20)} bedrooms` : null,
        listing.bathrooms ? `${compact(listing.bathrooms, 20)} bathrooms` : null,
        listing.floor_area ? `area ${compact(listing.floor_area, 30)}` : null,
        `location/details ${compact(listing.location, 360)}`,
        listing.source_url
          ? `original source ${compact(listing.source_url, 180)}`
          : null,
        highestRank > 0
          ? `relative lexical match ${formatPercentage(Number(listing.rank) || 0, highestRank)}`
          : null,
      ].filter(Boolean).join("; ").slice(0, maxDocumentCharacters),
    }));

    const knowledgeDocuments: RetrievedDocument[] = ((knowledge ?? []) as KnowledgeDocument[])
      .map((document) => ({
        title: document.title,
        content: document.content?.slice(0, maxDocumentCharacters),
      }));

    const maxPropertySlots = Math.max(1, matchCount - 2);
    const selectedListings = propertyDocuments.slice(0, maxPropertySlots);
    const selectedKnowledge = knowledgeDocuments.slice(
      0,
      matchCount - selectedListings.length,
    );

    const documents = [...selectedListings, ...selectedKnowledge];

    return Response.json({ documents }, { headers: corsHeaders });
  } catch (error) {
    console.error("RAG retrieval failed", error);
    return Response.json({ error: "RAG_RETRIEVAL_FAILED" }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});