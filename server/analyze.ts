import { classify, bucketOf, type Result } from "./classify";

export async function analyzeRemote(text: string): Promise<Result> {
  const r = await fetch(
    process.env.META_API_URL ?? "https://api.meta.ai/v1/responses",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.META_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.META_MODEL ?? "muse-spark-1.3",
        reasoning: { effort: "low" },
        input:
          "Classify this comment as praise, constructive, abuse, spam, threat or neutral. " +
          'If constructive, rewrite it as a kind, actionable suggestion. Reply with JSON only: {"label":"","reframed":""}\nComment: ' +
          text,
      }),
    },
  );
  if (!r.ok) throw new Error(`Spark API ${r.status}`);
  const data: any = await r.json();
  // Meta returns a "reasoning" item first, then the "message" item that holds the answer.
  const msg = (data.output ?? []).find((o: any) => o.type === "message");
  const raw: string =
    data.output_text ??
    (msg?.content ?? []).map((c: any) => c.text ?? "").join("");
  const json = raw.match(/\{[\s\S]*\}/);
  if (!json) throw new Error("No JSON in model reply: " + raw.slice(0, 200));
  const p = JSON.parse(json[0]);
  return {
    label: p.label,
    bucket: bucketOf(p.label),
    reframed: p.reframed || undefined,
  };
}

/** Muse Spark when a key is set, local rules otherwise (or if the call fails). */
export async function analyze(
  text: string,
): Promise<Result & { source: string }> {
  if (process.env.META_API_KEY) {
    try {
      return { ...(await analyzeRemote(text)), source: "muse-spark" };
    } catch (e) {
      console.error("Meta call failed, using local rules:", e);
    }
  }
  return { ...classify(text), source: "rules" };
}
