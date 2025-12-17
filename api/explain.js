export const config = {
  runtime: "nodejs",
};

const buildPrompt = (input) => `
Your job is to analyze the following code and return the answer ONLY in this structure:

Summary:
(A single clean sentence describing what this code does.)

Breakdown:
- Step 1
- Step 2
- Step 3

Output:
(Actual output OR "No output")

Suggestions:
- Suggestion 1
- Suggestion 2

Code:
${input}
`;

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  try {
    if (!process.env.GEMINI_API_KEY) {
      return new Response("Missing GEMINI_API_KEY", { status: 500 });
    }

    const { code } = await req.json();
    if (!code) {
      return new Response("No code provided", { status: 400 });
    }

    // 🔥 HARD TIMEOUT (CRITICAL)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 seconds

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(code) }],
            },
          ],
          generationConfig: {
            maxOutputTokens: 300, // 🔥 force fast response
            temperature: 0.2,
          },
        }),
      }
    );

    clearTimeout(timeout);

    const data = await res.json();

    const explanation =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No explanation generated.";

    return new Response(
      JSON.stringify({ explanation }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Gemini request failed",
        message:
          err.name === "AbortError"
            ? "Gemini request timed out"
            : err.message,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}