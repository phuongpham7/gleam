import "dotenv/config";
import express from "express";
import { analyze, analyzeRemote } from "./analyze";
import { classify } from "./classify";
import * as db from "./db";
import { makeCard, transcribe } from "./meta";
import { EVAL } from "./eval-set";

const app = express();
app.use(express.json());
const noKey = (res: express.Response) =>
  res.status(503).json({ error: "META_API_KEY is not set on the server" });
const fail = (res: express.Response, e: unknown) => {
  console.error(e);
  res.status(502).json({ error: (e as Error).message });
};

app.get("/api/comments", (_q, res) => res.json(db.list()));
app.delete("/api/comments", (_q, res) => {
  db.clear();
  res.json({ ok: true });
});

app.post("/api/analyze", async (req, res) => {
  const text = String(req.body?.text ?? "").slice(0, 1000);
  const author = String(req.body?.author ?? "anonymous").slice(0, 40);
  if (!text.trim()) return res.status(400).json({ error: "Empty comment" });
  const a = await analyze(text);
  res.json(
    db.insert({
      author,
      text,
      label: a.label,
      bucket: a.bucket,
      reframed: a.reframed ?? null,
      source: a.source,
    }),
  );
});

// Muse Image: thank-you card for one comment (costs about $0.01 per image, so it runs on demand)
app.post("/api/comments/:id/card", async (req, res) => {
  if (!process.env.META_API_KEY) return noKey(res);
  const row = db.get(Number(req.params.id));
  if (!row) return res.status(404).json({ error: "Comment not found" });
  try {
    db.setCard(row.id, await makeCard(row.author, row.text));
    res.json({ card: `/api/cards/${row.id}?v=${Date.now()}` });
  } catch (e) {
    fail(res, e);
  }
});
app.get("/api/cards/:id", (req, res) => {
  const card = db.getCard(Number(req.params.id));
  if (!card) return res.sendStatus(404);
  if (card.startsWith("http")) return res.redirect(card);
  const m = card.match(/^data:(.+?);base64,(.*)$/);
  if (!m) return res.sendStatus(404);
  res.type(m[1]).send(Buffer.from(m[2], "base64"));
});

// Muse Voice Transcribe: browser sends a mono 16 kHz WAV
app.post(
  "/api/transcribe",
  express.raw({ type: "*/*", limit: "35mb" }),
  async (req, res) => {
    if (!process.env.META_API_KEY) return noKey(res);
    try {
      res.json({ text: await transcribe(req.body as Buffer) });
    } catch (e) {
      fail(res, e);
    }
  },
);

// Accuracy test: built-in rules vs Muse Spark on the labeled set
app.post("/api/eval", async (_q, res) => {
  const useModel = Boolean(process.env.META_API_KEY);
  const cases: {
    text: string;
    expected: string;
    rules: string;
    model: string | null;
  }[] = [];
  for (let i = 0; i < EVAL.length; i += 6) {
    cases.push(
      ...(await Promise.all(
        EVAL.slice(i, i + 6).map(async ([text, expected]) => ({
          text,
          expected,
          rules: classify(text).bucket,
          model: useModel
            ? await analyzeRemote(text)
                .then((r) => r.bucket)
                .catch(() => null)
            : null,
        })),
      )),
    );
  }
  const n = (k: "rules" | "model") =>
    cases.filter((c) => c[k] === c.expected).length;
  res.json({
    total: cases.length,
    rules: { correct: n("rules") },
    model: useModel
      ? {
          correct: n("model"),
          failed: cases.filter((c) => c.model === null).length,
        }
      : null,
    cases,
  });
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
