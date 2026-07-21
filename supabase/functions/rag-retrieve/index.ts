import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const maxQueryCharacters = 2_000;
const maxMatchCount = 5;

type KnowledgeDocument = {
  id: string;
  title: string;
  content: string;
  category: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

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
      : 3;

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
    const { data, error } = await supabase.rpc("match_knowledge_documents", {
      query_embedding: Array.from(embedding),
      match_threshold: 0.28,
      match_count: matchCount,
    });
    if (error) throw error;

    const documents = ((data ?? []) as KnowledgeDocument[])
      .filter((document) => document.metadata?.place === "Bataan, Philippines")
      .slice(0, matchCount);
    return Response.json({ documents }, { headers: corsHeaders });
  } catch (error) {
    console.error("RAG retrieval failed", error);
    return Response.json({ error: "RAG_RETRIEVAL_FAILED" }, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
