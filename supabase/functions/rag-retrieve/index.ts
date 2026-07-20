import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const model = new Supabase.ai.Session('gte-small')
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!,
)

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { query, matchCount = 5 } = await req.json()
    if (typeof query !== 'string' || !query.trim()) {
      return Response.json({ error: 'query is required' }, { status: 400, headers: corsHeaders })
    }

    const output = await model.run(query.trim(), { mean_pool: true, normalize: true })
    const { data, error } = await supabase.rpc('match_knowledge_documents', {
      query_embedding: Array.from(output),
      match_threshold: 0.25,
      match_count: Math.min(Math.max(Number(matchCount) || 5, 1), 10),
    })

    if (error) throw error
    return Response.json({ documents: data ?? [] }, { headers: corsHeaders })
  } catch (error) {
    console.error('RAG retrieval failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'RAG retrieval failed' }, { status: 500, headers: corsHeaders })
  }
})
