import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ViewingRequestArgs = {
  property_id: string;
  preferred_date: string;
  preferred_time?: string;
  notes?: string;
  confirmed: boolean;
};

export const viewingRequestTool = {
  type: "function",
  function: {
    name: "create_viewing_request",
    description:
      "Create a pending request for the signed-in user to view a Bataan property. Use only after the user explicitly confirms the request details. This does not book an appointment.",
    parameters: {
      type: "object",
      properties: {
        property_id: {
          type: "string",
          description:
            "The UUID of the Bataan property the user wants to view.",
        },
        preferred_date: {
          type: "string",
          description: "Preferred viewing date in YYYY-MM-DD format.",
        },
        preferred_time: {
          type: "string",
          description: "Optional preferred time, such as 2:00 PM.",
        },
        notes: {
          type: "string",
          description: "Optional details the property team should know.",
        },
        confirmed: {
          type: "boolean",
          description:
            "Must be true only when the user explicitly confirmed these request details.",
        },
      },
      required: ["property_id", "preferred_date", "confirmed"],
      additionalProperties: false,
    },
  },
} as const;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function validateArgs(value: unknown): ViewingRequestArgs {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid viewing request arguments");
  }
  const args = value as Record<string, unknown>;
  const propertyId = typeof args.property_id === "string"
    ? args.property_id.trim()
    : "";
  const preferredDate = typeof args.preferred_date === "string"
    ? args.preferred_date.trim()
    : "";
  const preferredTime = typeof args.preferred_time === "string"
    ? args.preferred_time.trim()
    : undefined;
  const notes = typeof args.notes === "string" ? args.notes.trim() : undefined;

  if (!isUuid(propertyId)) throw new Error("A valid property ID is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
    throw new Error("The preferred date must use YYYY-MM-DD format");
  }
  const parsedDate = new Date(`${preferredDate}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== preferredDate
  ) {
    throw new Error("The preferred date is invalid");
  }
  if (preferredDate < new Date().toISOString().slice(0, 10)) {
    throw new Error("The preferred date must be today or a future date");
  }
  if (preferredTime && preferredTime.length > 80) {
    throw new Error("The preferred time is too long");
  }
  if (notes && notes.length > 1_000) throw new Error("The notes are too long");
  if (args.confirmed !== true) {
    throw new Error(
      "The user must explicitly confirm the viewing request first",
    );
  }

  return {
    property_id: propertyId,
    preferred_date: preferredDate,
    ...(preferredTime ? { preferred_time: preferredTime } : {}),
    ...(notes ? { notes } : {}),
    confirmed: true,
  };
}

export async function executeViewingRequest(
  supabase: SupabaseClient,
  userId: string,
  rawArgs: unknown,
) {
  const args = validateArgs(rawArgs);
  const { data: property, error: propertyError } = await supabase
    .from("bataan_properties")
    .select("id, title, location")
    .eq("id", args.property_id)
    .maybeSingle();

  if (propertyError) throw propertyError;
  if (!property) throw new Error("That property could not be found");

  const { data: existingRequest, error: existingError } = await supabase
    .from("viewing_requests")
    .select("id, status")
    .eq("user_id", userId)
    .eq("property_id", args.property_id)
    .eq("preferred_date", args.preferred_date)
    .eq("status", "pending")
    .maybeSingle();

  if (existingError) throw existingError;
  if (existingRequest) {
    return {
      success: true,
      already_exists: true,
      request_id: existingRequest.id,
      status: existingRequest.status,
      property_title: property.title,
    };
  }

  const { data: request, error: requestError } = await supabase
    .from("viewing_requests")
    .insert({
      user_id: userId,
      property_id: args.property_id,
      preferred_date: args.preferred_date,
      preferred_time: args.preferred_time ?? null,
      notes: args.notes ?? null,
    })
    .select("id, status, preferred_date, preferred_time")
    .single();

  if (requestError) throw requestError;

  return {
    success: true,
    already_exists: false,
    request_id: request.id,
    status: request.status,
    property_title: property.title,
    property_location: property.location,
    preferred_date: request.preferred_date,
    preferred_time: request.preferred_time,
  };
}
