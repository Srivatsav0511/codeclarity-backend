import { GoogleGenerativeAI } from "@google/generative-ai";

// ✅ Force Node.js runtime (important for Gemini SDK)
export const config = {
  runtime: "nodejs",
};

// 🔹 Prompt builder
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
  // ✅ Handle CORS preflight
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
    // 🔴 HARD FAIL if API key is missing (this avoids silent 500s)
    if (!process.env.GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is missing in Production environment",
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

    // ✅ Parse request
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid or missing 'code' field" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // ✅ Gemini setup
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // safest & stable
    });

    // ✅ Generate explanation
    const result = await model.generateContent(buildPrompt(code));
    const explanation = result.response.text();

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
    // 🔴 REAL error surfaced (no hiding)
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