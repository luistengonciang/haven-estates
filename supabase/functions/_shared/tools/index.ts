import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  executeViewingRequest,
  viewingRequestTool,
} from "./viewing-request.ts";

export const agentTools = [viewingRequestTool];

export async function executeAgentTool(
  name: string,
  args: unknown,
  context: { supabase: SupabaseClient; userId: string },
) {
  if (name === "create_viewing_request") {
    return executeViewingRequest(context.supabase, context.userId, args);
  }
  throw new Error(`Unknown agent tool: ${name}`);
}
