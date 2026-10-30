import "dotenv/config";
import express from "express";
import { classify, bucketOf } from "./classify";

const app = express();
app.use(express.json());

// Meta returns several output items (a "reasoning" item first, then the "message"), so find the message.
function extractText(data: any): string {
  if (typeof data.output_text === "string") return data.output_text;
  const msg = (data.output ?? []).find((o: any) => o.type === "message");
  return (msg?.content ?? []).map((c: any) => c.text ?? "").join("");
}

// The API key is read here, on the server only. It never reaches the browser.
app.post("/api/analyze", async (req, res) => {
  const text: string = String(req.body?.text ?? "");
  const key = process.env.META_API_KEY;

  if (key) {
    try {
      const r = await fetch(
        process.env.META_API_URL ?? "https://api.meta.ai/v1/responses",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: process.env.META_MODEL ?? "muse-spark-1.3",
            reasoning: { effort: "low" }, // far fewer hidden tokens, so replies are faster
            input:
              "Classify this comment as praise, constructive, abuse, spam, threat or neutral. " +
              'If constructive, rewrite it as a kind, actionable suggestion. Reply with JSON only: {"label":"","reframed":""}\nComment: ' +
              text,
          }),
        },
      );
      if (!r.ok) throw new Error(String(r.status));
      const data: any = await r.json();
      const raw = extractText(data);
      const json = raw.match(/\{[\s\S]*\}/); // pull the JSON object out, even if wrapped in text
      if (!json)
        throw new Error("No JSON in model reply: " + raw.slice(0, 200));
      const parsed = JSON.parse(json[0]);
      return res.json({
        label: parsed.label,
        bucket: bucketOf(parsed.label),
        reframed: parsed.reframed || undefined,
        source: "muse-spark",
      });
    } catch (e) {
      console.error("Meta call failed, using local rules:", e);
    }
  }
  res.json({ ...classify(text), source: "rules" });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`);
  console.log(
    process.env.META_API_KEY
      ? "META_API_KEY: loaded"
      : "META_API_KEY: NOT found (using local rules). Is it in .env, not .env.example?",
  );
});
