import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Check process environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.' },
        { status: 500, headers: corsHeaders }
      )
    }

    // 2. Initialize admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // 3. Fetch missing embeddings
    const { data: docs, error: fetchError } = await adminClient
      .from('knowledge_documents')
      .select('id, title, content')
      .is('embedding', null)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return Response.json({ error: fetchError.message }, { status: 500, headers: corsHeaders })
    }

    if (!docs || docs.length === 0) {
      return Response.json({ message: 'No documents need embedding updates.' }, { headers: corsHeaders })
    }

    // 4. Instantiate model INSIDE the request handler
    const model = new Supabase.ai.Session('gte-small')
    let updatedCount = 0

    // 5. Loop and generate embeddings
    for (const doc of docs) {
      const textToEmbed = `${doc.title || ''}\n${doc.content || ''}`.trim()
      if (!textToEmbed) continue

      try {
        const output = await model.run(textToEmbed, { mean_pool: true, normalize: true }) as number[]
        const embedding = Array.from(output)

        const { error: updateError } = await adminClient
          .from('knowledge_documents')
          .update({ embedding })
          .eq('id', doc.id)

        if (updateError) {
          console.error(`Failed to update doc ID ${doc.id}:`, updateError.message)
        } else {
          updatedCount++
        }
      } catch (embedErr) {
        console.error(`Embedding generation failed for doc ID ${doc.id}:`, embedErr)
      }
    }

    return Response.json(
      { success: true, processed: docs.length, updated: updatedCount },
      { headers: corsHeaders }
    )

  } catch (error) {
    // Detailed error logging in Supabase Logs
    console.error('Backfill fatal error:', error)
    
    return Response.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null 
      },
      { status: 500, headers: corsHeaders }
    )
  }
})