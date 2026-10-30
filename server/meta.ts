// Muse Image + Muse Voice Transcribe. Endpoints follow Meta's public docs; request fields marked
// "unverified" are best guesses: if a call fails, the error message is shown in the UI.
const BASE = process.env.META_BASE_URL ?? "https://api.meta.ai/v1";
const auth = () => ({ Authorization: `Bearer ${process.env.META_API_KEY}` });

export async function makeCard(name: string, quote: string): Promise<string> {
  const r = await fetch(`${BASE}/images/generations`, {
    method: "POST",
    headers: { ...auth(), "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "muse-image-1.0",
      n: 1,
      prompt: `A warm, uplifting thank-you card for a fan named ${name}, inspired by their message: "${quote.slice(0, 100)}". Soft colors, friendly illustration, the words "Thank you" as the only text.`,
    }),
  });
  if (!r.ok)
    throw new Error(`Image API ${r.status}: ${(await r.text()).slice(0, 160)}`);
  const item = ((await r.json()) as any).data?.[0];
  if (item?.b64_json) return `data:image/png;base64,${item.b64_json}`;
  if (item?.url) return item.url;
  throw new Error("No image in response");
}

export async function transcribe(wav: Buffer): Promise<string> {
  // Meta wants multipart/form-data with two parts: "request" (JSON) and "audio" (the WAV file).
  // The JSON part must have a JSON content type, so the body is framed by hand.
  const boundary = "----gleam" + Date.now().toString(16);
  const request = JSON.stringify({
    model: "muse-voice-transcribe-1.0",
    audioEncoding: "WAV",
    mode: "PUSH_TO_TALK",
  });
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="request"\r\nContent-Type: application/json\r\n\r\n${request}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const r = await fetch(`${BASE}/asr/transcribe`, {
    method: "POST",
    headers: {
      ...auth(),
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body: new Uint8Array(Buffer.concat([head, wav, tail])),
  });
  if (!r.ok)
    throw new Error(`Voice API ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const d: any = await r.json();
  // Response key names are unverified: try the likely ones, then fall back to joining the turns.
  const text = String(
    d.text ??
      d.transcript ??
      (d.turns ?? []).map((t: any) => t.text ?? t.transcript ?? "").join(" "),
  ).trim();
  if (!text)
    throw new Error(
      "No speech found. Response: " + JSON.stringify(d).slice(0, 200),
    );
  return text;
}
