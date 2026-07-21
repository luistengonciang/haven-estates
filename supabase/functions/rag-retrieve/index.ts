import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!)
const compact = (value: unknown, limit: number) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, limit)

function relevance(text: string, query: string) {
  const terms = query.toLowerCase().match(/[a-z]{3,}/g) ?? []
  const haystack = text.toLowerCase()
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0)
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { query } = await req.json()
    if (typeof query !== 'string' || !query.trim()) return Response.json({ error: 'query is required' }, { status: 400, headers: corsHeaders })
    const [{ data: listings, error: listingsError }, { data: knowledge, error: knowledgeError }] = await Promise.all([
      supabase.rpc('search_bataan_properties', { search_text: query, match_count: 3 }),
      supabase.from('knowledge_documents').select('id, title, content, metadata').eq('metadata->>place', 'Bataan, Philippines').limit(6),
    ])
    if (listingsError) throw listingsError
    if (knowledgeError) throw knowledgeError
    const propertyDocuments = (listings ?? []).map((listing) => ({
      id: `bataan-property:${listing.id}`,
      title: `${compact(listing.title, 90) || 'Bataan property'}${listing.price ? ` — ${compact(listing.price, 40)}` : ''}`,
      content: ['Bataan listing:', listing.price ? `price ${compact(listing.price, 40)}` : null, listing.bedrooms ? `${compact(listing.bedrooms, 20)} bedrooms` : null, listing.bathrooms ? `${compact(listing.bathrooms, 20)} bathrooms` : null, listing.floor_area ? `area ${compact(listing.floor_area, 30)}` : null, `details ${compact(listing.location, 360)}`, listing.source_url ? `source ${compact(listing.source_url, 180)}` : null].filter(Boolean).join('; '),
      similarity: listing.rank,
      metadata: { source_url: listing.source_url, source: 'bataan_properties' },
    }))
    const knowledgeDocuments = (knowledge ?? [])
      .map((document) => ({ ...document, score: relevance(`${document.title} ${document.content}`, query) }))
      .filter((document) => document.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((document) => ({ id: document.id, title: document.title, content: compact(document.content, 700), metadata: document.metadata }))
    return Response.json({ documents: [...propertyDocuments, ...knowledgeDocuments] }, { headers: corsHeaders })
  } catch (error) {
    console.error('RAG retrieval failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'RAG retrieval failed' }, { status: 500, headers: corsHeaders })
  }
})
