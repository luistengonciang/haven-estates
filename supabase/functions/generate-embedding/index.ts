import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const model = new Supabase.ai.Session('gte-small')

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { input } = await req.json()
    if (typeof input !== 'string' || !input.trim()) {
      return Response.json({ error: 'input is required' }, { status: 400, headers: corsHeaders })
    }

    const output = await model.run(input.trim(), { mean_pool: true, normalize: true }) as number[];
    return Response.json({ embedding: Array.from(output) }, { headers: corsHeaders })
  } catch (error) {
    console.error('Embedding generation failed', error)
    return Response.json({ error: error instanceof Error ? error.message : 'Embedding generation failed' }, { status: 500, headers: corsHeaders })
  }
})
