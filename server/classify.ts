export type Bucket =
  | "praise"
  | "constructive"
  | "held"
  | "escalated"
  | "neutral";
export type Result = { label: string; bucket: Bucket; reframed?: string };

const TOPICS: Record<string, string> = {
  audio:
    "Consider adjusting your microphone gain or adding a pop filter for clearer audio.",
  sound:
    "Consider adjusting your microphone gain or adding a pop filter for clearer audio.",
  mic: "Consider adjusting your microphone gain or adding a pop filter for clearer audio.",
  light:
    "Try a brighter key light or a softer angle to improve how the video looks.",
  video: "Try a steadier shot or higher export quality to sharpen the video.",
  edit: "Tighter cuts could keep the pacing moving.",
  long: "A shorter cut, or chapter markers, could help viewers follow along.",
  intro: "A shorter intro could get viewers to the main point faster.",
};
const THREAT =
  /\b(kill|hurt you|find where you live|doxx?|your address|end yourself|kys)\b/i;
const SPAM = /(https?:\/\/|free followers|dm me|crypto|giveaway|promo code)/i;
const INSULT =
  /\b(trash|garbage|sucks?|awful|terrible|stupid|idiot|worthless|cringe|boring|hate)\b/i;
const PRAISE =
  /\b(love|great|amazing|awesome|thank|inspir|best|beautiful|helped|favorite)\b/i;

/** Local fallback used when no Meta key is set (or the remote call fails). */
export function classify(text: string): Result {
  const low = text.toLowerCase();
  if (THREAT.test(text)) return { label: "threat", bucket: "escalated" };
  if (SPAM.test(text)) return { label: "spam", bucket: "held" };
  const topic = Object.keys(TOPICS).find((k) => low.includes(k));
  if (
    topic &&
    (INSULT.test(text) ||
      /\b(could|should|needs?|too|bad|poor|slow)\b/.test(low))
  )
    return {
      label: "feedback",
      bucket: "constructive",
      reframed: TOPICS[topic],
    };
  if (INSULT.test(text)) return { label: "abuse", bucket: "held" };
  if (PRAISE.test(text)) return { label: "praise", bucket: "praise" };
  return { label: "neutral", bucket: "neutral" };
}

export const bucketOf = (label: string): Bucket =>
  (
    ({
      praise: "praise",
      constructive: "constructive",
      feedback: "constructive",
      threat: "escalated",
      abuse: "held",
      spam: "held",
    }) as Record<string, Bucket>
  )[label] ?? "neutral";
