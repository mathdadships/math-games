// Supabase Edge Function: ai-feedback
// Proxies student performance data to Anthropic API for personalized feedback.
// The Anthropic API key is stored as a Supabase secret — never exposed to the client.

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ALLOWED_ORIGINS = [
  "https://mathdadships.github.io",
];

// In-memory rate limiting (resets on cold start — acceptable for this use case)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000; // 30 seconds per student

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get("Origin") || "";
  const allowed = ALLOWED_ORIGINS.some((o) => origin.startsWith(o));
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": allowed ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
  };
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }

  // Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders(req) }
    );
  }

  try {
    const body = await req.json();
    const { performanceSummary, studentId } = body;

    // --- Input validation ---
    if (!performanceSummary || typeof performanceSummary !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing performanceSummary" }),
        { status: 400, headers: corsHeaders(req) }
      );
    }

    if (performanceSummary.length > 2000) {
      return new Response(
        JSON.stringify({ error: "performanceSummary too long (max 2000 chars)" }),
        { status: 400, headers: corsHeaders(req) }
      );
    }

    if (!studentId || typeof studentId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing studentId" }),
        { status: 400, headers: corsHeaders(req) }
      );
    }

    // --- Rate limiting ---
    const lastCall = rateLimitMap.get(studentId);
    const now = Date.now();
    if (lastCall && now - lastCall < RATE_LIMIT_MS) {
      return new Response(
        JSON.stringify({ error: "Please wait before requesting feedback again" }),
        { status: 429, headers: corsHeaders(req) }
      );
    }
    rateLimitMap.set(studentId, now);

    // --- Check API key is configured ---
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI feedback not configured" }),
        { status: 503, headers: corsHeaders(req) }
      );
    }

    // --- Call Anthropic API ---
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 150,
        system: [
          "You are a warm, encouraging math tutor for a 3rd grade student (age 8-9).",
          "The student just completed a fractions practice session.",
          "Give them brief, specific feedback in 2-3 sentences.",
          "Rules:",
          "- Be encouraging and specific — mention what they did well",
          "- If they struggled somewhere, give ONE concrete tip they can remember",
          "- Use simple language a 3rd grader understands",
          "- Never be discouraging. Frame weaknesses as next steps not failures",
          "- Keep it under 50 words",
          "- Do NOT use bullet points or lists. Just natural sentences.",
        ].join("\n"),
        messages: [{ role: "user", content: performanceSummary }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 502, headers: corsHeaders(req) }
      );
    }

    const data = await anthropicRes.json();
    const feedback = data.content
      .filter((item: { type: string }) => item.type === "text")
      .map((item: { text: string }) => item.text)
      .join("");

    return new Response(
      JSON.stringify({ feedback }),
      { status: 200, headers: corsHeaders(req) }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: corsHeaders(req) }
    );
  }
});
