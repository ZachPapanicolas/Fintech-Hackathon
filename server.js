import Groq from "groq-sdk";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/chat", async (req, res) => {
  const { systemPrompt, messages } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
      max_tokens: 512,
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get response" });
  }
});

app.post("/summarize", async (req, res) => {
  const { conversation } = req.body;

  const prompt = `You are David, a magical mouse scribe. You just watched a group of financial advisors (a red panda, a raccoon, and a capybara) have a lively discussion. Summarize what they talked about in 3-5 short bullet points. Be warm, a little whimsical, and make it easy to digest. No jargon. Write as David — you're delighted to be helpful. Start with a one-liner reaction to the convo, then the bullets.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Here's the conversation:\n\n${conversation}` },
      ],
      max_tokens: 400,
    });

    res.json({ summary: completion.choices[0].message.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to summarize" });
  }
});

app.post("/extract-profile", async (req, res) => {
  const { conversation } = req.body;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Extract personal financial details from this conversation. Return ONLY a flat JSON object with keys like "name", "income", "monthly_expenses", "debt", "savings", "financial_goals", "job", "age", or any relevant facts the user shared. Only include keys where the user actually provided info. If nothing was shared, return {}.`,
        },
        { role: "user", content: conversation },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });

    const data = JSON.parse(completion.choices[0].message.content);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.json({});
  }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
