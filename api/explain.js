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
  if (req.method !== "POST") {
    return new Response("POST only", { status: 405 });
  }

  if (!process.env.GROQ_API_KEY) {
    return new Response("Missing GROQ_API_KEY", { status: 500 });
  }

  const { code } = await req.json();
  if (!code) {
    return new Response("No code provided", { status: 400 });
  }

  // ⏱ HARD TIMEOUT (prevents hanging)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",   // ⚠️ USE THIS MODEL (MOST STABLE)
          messages: [
            { role: "user", content: buildPrompt(code) }
          ],
          temperature: 0.2,
          max_tokens: 400
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const data = await res.json();

    return new Response(
      JSON.stringify({
        explanation:
          data?.choices?.[0]?.message?.content || "No output"
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Groq request failed",
        message: err.name === "AbortError"
          ? "Groq timed out"
          : err.message,
      }),
      { status: 500 }
    );
  }
}