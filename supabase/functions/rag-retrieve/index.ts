import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const model = new Supabase.ai.Session('gte-small')
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!)
const compact = (value: unknown, limit: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { query, matchCount = 3 } = await req.json()
    if (typeof query !== 'string' || !query.trim()) return Response.json({ error: 'query is required' }, { status: 400, headers: corsHeaders })
    const requestedMatches = Math.max(1, Math.min(Number(matchCount) || 3, 3))
    const embedding = await model.run(query, { mean_pool: true, normalize: true }) as number[]
    const [{ data: knowledge, error: knowledgeError }, { data: listings, error: listingsError }] = await Promise.all([
      supabase.rpc('match_knowledge_documents', { query_embedding: Array.from(embedding), match_threshold: 0.25, match_count: requestedMatches }),
      supabase.rpc('search_bataan_properties', { search_text: query, match_count: 3 }),
    ])
    if (knowledgeError) throw knowledgeError
    if (listingsError) throw listingsError
    const propertyDocuments = (listings ?? []).map((listing) => ({
      id: `bataan-property:${listing.id}`,
      title: `${compact(listing.title, 90) || 'Bataan property'}${listing.price ? ` — ${compact(listing.price, 40)}` : ''}`,
      content: ['Bataan listing:', listing.price ? `price ${compact(listing.price, 40)}` : null, listing.bedrooms ? `${compact(listing.bedrooms, 20)} bedrooms` : null, listing.bathrooms ? `${compact(listing.bathrooms, 20)} bathrooms` : null, listing.floor_area ? `area ${compact(listing.floor_area, 30)}` : null, `details ${compact(listing.location, 360)}`, listing.source_url ? `source ${compact(listing.source_url, 180)}` : null].filter(Boolean).join('; '),
      similarity: listing.rank,
      metadata: { source_url: listing.source_url, source: 'bataan_properties' },
    }))
    return Response.json({ documents: [...propertyDocuments, ...(knowledge ?? []).slice(0, requestedMatches)] }, { headers: corsHeaders })
  } catch (error) {
    console.error('RAG retrieval failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'RAG retrieval failed' }, { status: 500, headers: corsHeaders })
  }
})
