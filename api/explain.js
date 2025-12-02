import { GoogleGenerativeAI } from "@google/generative-ai";

// -----------------------------
//  PROMPT BUILDER (MERGED FROM YOUR utils/promptBuilder.js)
// -----------------------------
const buildPrompt = (input) => `
Your job is to analyze the following code and return the answer ONLY in this structure:

Summary:
(A single clean sentence describing what this code does.)

Breakdown:
- Step 1
- Step 2
- Step 3

Output:
(Actual output OR “No output”)

Suggestions:
- Suggestion 1
- Suggestion 2

Do NOT add anything extra.
Do NOT add explanations outside these sections.

Code:
${input}
`;



export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  try {
    const { code } = req.body;

    if (!code || code.trim() === "") {
      return res.status(400).json({ error: "Code is required" });
    }

    // Build prompt
    const prompt = buildPrompt(code);

    // Gemini call
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash"
    });

    const result = await model.generateContent(prompt);

    const explanation = result.response.text();

    return res.status(200).json({
      explanation: explanation || "Summary:\nNo response"
    });

  } catch (error) {
    console.error("Gemini Error:", error);

    return res.status(500).json({
      error: "Failed to explain input",
      details: error.message
    });
  }
}