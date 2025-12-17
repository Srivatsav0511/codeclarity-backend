import express from "express";

const app = express();
app.use(express.json());

// 🔹 Prompt (unchanged)
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

// 🔹 API endpoint
app.post("/api/explain", async (req, res) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "Missing GROQ_API_KEY" });
    }

    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "No code provided" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: buildPrompt(code) }],
          temperature: 0.2,
          max_tokens: 400,
        }),
      }
    );

    const data = await response.json();

    res.json({
      explanation:
        data?.choices?.[0]?.message?.content || "No output generated",
    });
  } catch (err) {
    res.status(500).json({
      error: "Backend error",
      message: err.message,
    });
  }
});

// 🔹 START SERVER (THIS IS THE IMPORTANT PART)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend running on port ${PORT}`);
});