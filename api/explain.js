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
  // CORS
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

  // GET fallback
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ message: "POST { code } to this endpoint" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: buildPrompt(code) }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

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
        error: "Backend error",
        message: err.message,
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