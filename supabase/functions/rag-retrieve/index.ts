import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const model = new Supabase.ai.Session("gte-small");
const maxQueryCharacters = 1_000;
const compact = (value: unknown, limit: number) =>
  String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
const asPercentage = (value: number) =>
  Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
const listingSearchText = (query: string) => {
  const ignored = new Set([
    "about",
    "before",
    "buying",
    "check",
    "find",
    "from",
    "have",
    "home",
    "listing",
    "listings",
    "property",
    "properties",
    "should",
    "that",
    "the",
    "what",
    "with",
  ]);
  const terms = (query.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).filter((
    term,
  ) => !ignored.has(term)).slice(0, 4);
  return terms.length ? terms.join(" or ") : query;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { query, matchCount = 2 } = await req.json();
    if (
      typeof query !== "string" || !query.trim() ||
      query.length > maxQueryCharacters
    ) {
      return Response.json({
        error: "A query of up to 1,000 characters is required.",
      }, { status: 400, headers: corsHeaders });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !publishableKey) {
      throw new Error("Supabase configuration is unavailable");
    }
    const authorization = req.headers.get("authorization");
    const supabase = createClient(supabaseUrl, publishableKey, {
      global: {
        headers: authorization ? { Authorization: authorization } : {},
      },
    });
    const knowledgeCount = Math.max(1, Math.min(Number(matchCount) || 2, 2));
    const embedding = await model.run(query.trim(), {
      mean_pool: true,
      normalize: true,
    }) as number[];
    const [
      { data: listings, error: listingsError },
      { data: knowledge, error: knowledgeError },
    ] = await Promise.all([
      supabase.rpc("search_bataan_properties", {
        search_text: listingSearchText(query),
        match_count: 3,
      }),
      supabase.rpc("match_knowledge_documents", {
        query_embedding: Array.from(embedding),
        match_threshold: 0.18,
        match_count: knowledgeCount,
      }),
    ]);
    if (listingsError) throw listingsError;
    if (knowledgeError) throw knowledgeError;
    const highestListingRank = Math.max(
      ...(listings ?? []).map((listing) => Number(listing.rank) || 0),
      0,
    );
    const propertyDocuments = (listings ?? []).map((listing) => ({
      id: `bataan-property:${listing.id}`,
      title: `${compact(listing.title, 90) || "Bataan property"}${
        listing.price ? ` — ${compact(listing.price, 40)}` : ""
      }`,
      category: "property-listing",
      content: [
        "Bataan listing:",
        listing.price ? `price ${compact(listing.price, 40)}` : null,
        listing.bedrooms ? `${compact(listing.bedrooms, 20)} bedrooms` : null,
        listing.bathrooms
          ? `${compact(listing.bathrooms, 20)} bathrooms`
          : null,
        listing.floor_area ? `area ${compact(listing.floor_area, 30)}` : null,
        `details ${compact(listing.location, 360)}`,
        listing.source_url
          ? `source ${compact(listing.source_url, 180)}`
          : null,
      ].filter(Boolean).join("; "),
      similarity: highestListingRank
        ? asPercentage(Number(listing.rank) / highestListingRank)
        : 0,
      metadata: {
        source_url: listing.source_url,
        source: "bataan_properties",
        match_type: "relative lexical rank",
      },
    }));
    const knowledgeDocuments = (knowledge ?? [])
      .filter((document) => document.metadata?.place === "Bataan, Philippines")
      .map((document) => ({
        ...document,
        similarity: asPercentage(Number(document.similarity) || 0),
        metadata: { ...document.metadata, match_type: "cosine similarity" },
      }));
    return Response.json({
      documents: [...propertyDocuments, ...knowledgeDocuments],
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("RAG retrieval failed", error);
    return Response.json({ error: "RAG_RETRIEVAL_FAILED" }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
