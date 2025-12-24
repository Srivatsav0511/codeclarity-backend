import express from "express";

const app = express();
app.use(express.json());

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

app.post("/api/explain", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: buildPrompt(code),
                },
              ],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    res.json({
      explanation:
        data?.candidates?.[0]?.content?.parts?.[0]?.text || "No output generated",
    });
  } catch (err) {
    res.status(500).json({
      error: "Backend error",
      message: err.message,
    });
  }
});

export default app;
