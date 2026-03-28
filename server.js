import Groq from "groq-sdk";
import OpenAI from "openai";
import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// provider → { client, model }
const providers = {
  groq:  { client: groq, model: "llama-3.3-70b-versatile" },
  xai:   { client: xai,  model: "grok-2-latest" },
};

async function chat(provider = "groq", systemPrompt, messages, maxTokens = 512) {
  const { client, model } = providers[provider] || providers.groq;
  const completion = await client.chat.completions.create({
    model,
    messages: [{ role: "system", content: systemPrompt }, ...messages],
    max_tokens: maxTokens,
  });
  return completion.choices[0].message.content;
}

app.post("/chat", async (req, res) => {
  const { systemPrompt, messages, provider } = req.body;
  try {
    const reply = await chat(provider, systemPrompt, messages);
    res.json({ reply });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post("/summarize", async (req, res) => {
  const { conversation } = req.body;
  const prompt = `You are David, a magical mouse scribe. You just watched a group of financial advisors have a lively discussion. Summarize what they talked about in 3-5 short bullet points. Be warm, a little whimsical, and make it easy to digest. No jargon. Write as David — you're delighted to be helpful. Start with a one-liner reaction to the convo, then the bullets.`;
  try {
    const summary = await chat("groq", prompt, [{ role: "user", content: `Here's the conversation:\n\n${conversation}` }], 400);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/extract-profile", async (req, res) => {
  const { conversation } = req.body;
  try {
    const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groqClient.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Extract personal financial details from this conversation. Return ONLY a flat JSON object with keys like "name", "income", "monthly_expenses", "debt", "savings", "financial_goals", "job", "age". Only include keys where the user actually provided info. If nothing was shared, return {}.`,
        },
        { role: "user", content: conversation },
      ],
      max_tokens: 300,
      response_format: { type: "json_object" },
    });
    res.json(JSON.parse(completion.choices[0].message.content));
  } catch {
    res.json({});
  }
});

app.listen(3001, () => console.log("Server running on http://localhost:3001"));
