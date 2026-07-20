import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const model = 'gpt-4o-mini'
const maxHistoryMessages = 12
const maxDocuments = 5
const maxDocumentCharacters = 1200

const systemPrompt = `You are Vanguard, an elite AI real estate advisor. Help users analyze property markets, calculate budgets, and find homes. Be data-driven, strategic, polished, and concise. For budget questions, explain hypothetical PITI. Highlight appreciation, neighborhood dynamics, and investment considerations. Never claim access to live MLS data unless the user provides it. Format your responses in clean Markdown when structure helps: concise paragraphs, lists, tables, blockquotes, and fenced code blocks.`

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type RetrievedDocument = {
  title?: string
  content?: string
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') return false
  const message = value as Record<string, unknown>
  return (
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    message.content.trim().length > 0
  )
}

function buildRetrievedContext(documents: RetrievedDocument[]) {
  const sources = documents
    .slice(0, maxDocuments)
    .map((document, index) => {
      const title = document.title?.trim() || `Source ${index + 1}`
      const content = document.content?.trim().slice(0, maxDocumentCharacters) || ''
      return content ? `[Source ${index + 1}: ${title}]\n${content}` : ''
    })
    .filter(Boolean)
    .join('\n\n')

  if (!sources) return ''

  return `\n\nRetrieved knowledge from Supabase. Use it as grounding, do not invent facts beyond it, and mention uncertainty when the sources do not answer the question.\n<retrieved_context>\n${sources}\n</retrieved_context>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return Response.json({ error: 'MISSING_OPENAI_KEY' }, { status: 500, headers: corsHeaders })
    }

    const { messages = [], documents = [] } = await req.json()
    if (!Array.isArray(messages) || !messages.some((message) => isChatMessage(message) && message.role === 'user')) {
      return Response.json({ error: 'messages are required' }, { status: 400, headers: corsHeaders })
    }

    const safeMessages = messages
      .filter(isChatMessage)
      .slice(-maxHistoryMessages)
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))

    const retrievedContext = Array.isArray(documents) ? buildRetrievedContext(documents) : ''

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 700,
        messages: [
          { role: 'system', content: `${systemPrompt}${retrievedContext}` },
          ...safeMessages,
        ],
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      console.error('OpenAI request failed', payload)
      return Response.json(
        { error: payload.error?.message || 'OPENAI_REQUEST_FAILED' },
        { status: response.status, headers: corsHeaders },
      )
    }

    return Response.json(
      {
        content: payload.choices?.[0]?.message?.content || 'I could not generate a response just now. Please try again.',
        model,
      },
      { headers: corsHeaders },
    )
  } catch (error) {
    console.error('Vanguard chat failed', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Vanguard chat failed' },
      { status: 500, headers: corsHeaders },
    )
  }
})
