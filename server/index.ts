import "dotenv/config";
import express from "express";
import { classify, bucketOf } from "./classify";

const app = express();
app.use(express.json());

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
            input:
              "Classify this comment as praise, constructive, abuse, spam, threat or neutral. " +
              'If constructive, rewrite it as a kind, actionable suggestion. Reply with JSON only: {"label":"","reframed":""}\nComment: ' +
              text,
          }),
        },
      );
      if (!r.ok) throw new Error(String(r.status));
      const data: any = await r.json();
      // Response shape is unverified: adjust to the real format in Meta's docs.
      const raw: string =
        data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
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
app.listen(port, () => console.log(`API on http://localhost:${port}`));
