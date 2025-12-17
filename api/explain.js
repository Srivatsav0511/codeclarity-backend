import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Force Node.js runtime (Gemini SDK requires this)
export const config = {
  runtime: "nodejs",
};

// ✅ Prompt builder
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
  // ✅ CORS preflight
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

  // ❌ Only POST allowed
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Only POST requests are allowed" }),
      {
        status: 405,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  try {
    // 🔴 HARD CHECK: API key must exist
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY missing in Production environment",
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

    // ✅ Parse body safely
    const body = await req.json();
    const { code } = body || {};

    if (!code || typeof code !== "string" || code.trim() === "") {
      return new Response(
        JSON.stringify({ error: "Invalid or empty code input" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // ✅ Gemini init
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // ✅ stable on Vercel
    });

    // ✅ Generate content
    const result = await model.generateContent(buildPrompt(code));

    // ✅ SAFE extraction (no silent empty response)
    const explanation =
      result?.response?.text?.() ||
      "No explanation generated. Please try again.";

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
  } catch (error) {
    // 🔴 Surface REAL error
    return new Response(
      JSON.stringify({
        error: "Runtime error",
        message: error.message,
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