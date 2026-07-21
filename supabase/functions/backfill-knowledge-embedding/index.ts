import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // 1. Check process environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const backfillToken = Deno.env.get("BACKFILL_ADMIN_TOKEN");
    if (!supabaseUrl || !serviceRoleKey || !backfillToken) {
      return Response.json(
        { error: "BACKFILL_NOT_CONFIGURED" },
        { status: 500 },
      );
    }
    if (req.headers.get("x-backfill-token") !== backfillToken) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Initialize admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 3. Fetch missing embeddings
    const { data: docs, error: fetchError } = await adminClient
      .from("knowledge_documents")
      .select("id, title, content")
      .is("embedding", null);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      return Response.json({ error: "KNOWLEDGE_FETCH_FAILED" }, {
        status: 500,
      });
    }

    if (!docs || docs.length === 0) {
      return Response.json({ message: "No documents need embedding updates." });
    }

    // 4. Instantiate model INSIDE the request handler
    const model = new Supabase.ai.Session("gte-small");
    let updatedCount = 0;

    // 5. Loop and generate embeddings
    for (const doc of docs) {
      const textToEmbed = `${doc.title || ""}\n${doc.content || ""}`.trim();
      if (!textToEmbed) continue;

      try {
        const output = await model.run(textToEmbed, {
          mean_pool: true,
          normalize: true,
        }) as number[];
        const embedding = Array.from(output);

        const { error: updateError } = await adminClient
          .from("knowledge_documents")
          .update({ embedding })
          .eq("id", doc.id);

        if (updateError) {
          console.error(
            `Failed to update doc ID ${doc.id}:`,
            updateError.message,
          );
        } else {
          updatedCount++;
        }
      } catch (embedErr) {
        console.error(
          `Embedding generation failed for doc ID ${doc.id}:`,
          embedErr,
        );
      }
    }

    return Response.json(
      { success: true, processed: docs.length, updated: updatedCount },
      {},
    );
  } catch (error) {
    // Detailed error logging in Supabase Logs
    console.error("Backfill fatal error:", error);

    return Response.json({ error: "BACKFILL_FAILED" }, { status: 500 });
  }
});
