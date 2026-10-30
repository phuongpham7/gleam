import { useEffect, useRef, useState, type FormEvent } from "react";
import { classify, type Bucket } from "../server/classify";

type Item = {
  id: number;
  author: string;
  text: string;
  label: string;
  bucket: Bucket;
  reframed?: string;
};
type Tab = "all" | Exclude<Bucket, "neutral">;
type View = "creator" | "raw" | "sorted";

const SAMPLES: [string, string][] = [
  ["maya", "Your audio is trash, I can’t hear anything"],
  ["leo", "Love this series, it helped me so much!"],
  ["sam", "you are worthless"],
  ["bot9", "free followers http://spam.example"],
  ["dan", "I will find where you live"],
  ["ivy", "The intro is too long, got me bored"],
  ["noor", "Amazing stream, best one yet!"],
  ["kai", "this is garbage"],
  ["rue", "The lighting is bad in the second half"],
  ["tess", "Thank you for explaining this so clearly"],
];
const TABS: [Tab, string, string][] = [
  ["all", "All", "💬"],
  ["praise", "Praise", "💚"],
  ["constructive", "Feedback", "💡"],
  ["held", "Held back", "🚫"],
  ["escalated", "Review", "⚠️"],
];
const HIDDEN: Bucket[] = ["held", "escalated"];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <span
      className="av"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `hsl(${hue} 50% 52%)`,
      }}
    >
      {(name[0] ?? "?").toUpperCase()}
    </span>
  );
}

function ThankCard({ name, quote }: { name: string; quote: string }) {
  return (
    <div className="card">
      <svg
        viewBox="0 0 400 200"
        role="img"
        aria-label={`Thank-you card for ${name}`}
      >
        <rect width="400" height="200" fill="#2F7D6B" />
        <text
          x="22"
          y="56"
          fontSize="26"
          fill="#fff"
          fontFamily="Georgia,serif"
        >
          Thank you, {name}
        </text>
        <foreignObject x="22" y="76" width="356" height="110">
          <div style={{ color: "#E6F2EE", font: "16px Georgia,serif" }}>
            “{quote.slice(0, 90)}”
          </div>
        </foreignObject>
      </svg>
    </div>
  );
}

function Comment({ i, raw }: { i: Item; raw: boolean }) {
  const [liked, setLiked] = useState(false);
  const [open, setOpen] = useState(false);
  const changed =
    !raw && (i.bucket === "constructive" || HIDDEN.includes(i.bucket));
  let shown = i.text;
  if (changed && !open) {
    shown =
      i.bucket === "constructive"
        ? (i.reframed ?? i.text)
        : i.bucket === "held"
          ? `Hidden by Glimmer (${i.label})`
          : "Possible threat. Review it and report it if needed.";
  }
  const toggle = open
    ? "Hide original"
    : i.bucket === "constructive"
      ? "See original"
      : "Show anyway";
  return (
    <li className={`cm ${i.bucket}`}>
      <Avatar name={i.author} />
      <div className="cb">
        <p>
          <b>{i.author}</b>{" "}
          <span className={changed && !open ? "mod" : ""}>{shown}</span>
        </p>
        <div className="act">
          <span>now</span>
          <button>Reply</button>
          {changed && <button onClick={() => setOpen(!open)}>{toggle}</button>}
          {raw && <span className="tag">{i.label}</span>}
        </div>
        {i.bucket === "praise" && <ThankCard name={i.author} quote={i.text} />}
      </div>
      <button
        className="heart"
        aria-pressed={liked}
        aria-label="Like"
        onClick={() => setLiked(!liked)}
      >
        {liked ? "♥" : "♡"}
      </button>
    </li>
  );
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<View>("creator");
  const [author, setAuthor] = useState("viewer42");
  const [text, setText] = useState("");
  const [live, setLive] = useState(false);
  const idRef = useRef(0);
  const sampleRef = useRef(0);

  async function add(a: string, t: string) {
    let r: { label: string; bucket: Bucket; reframed?: string };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t }),
      });
      if (!res.ok) throw new Error(String(res.status));
      r = await res.json();
    } catch {
      r = classify(t); // API server not running: sort in the browser instead
    }
    setItems((prev) => [
      {
        id: ++idRef.current,
        author: a,
        text: t,
        label: r.label,
        bucket: r.bucket,
        reframed: r.reframed,
      },
      ...prev,
    ]);
  }

  useEffect(() => {
    if (!live) return;
    const tick = () => {
      const [a, t] = SAMPLES[sampleRef.current++ % SAMPLES.length];
      add(a, t);
    };
    tick();
    const h = setInterval(tick, 2200);
    return () => clearInterval(h);
  }, [live]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    add(author.trim() || "anonymous", t);
    setText("");
  }

  const count = (k: Tab) =>
    k === "all" ? items.length : items.filter((i) => i.bucket === k).length;
  let list = items.filter((i) => tab === "all" || i.bucket === tab);
  let hidden = 0;
  if (view === "creator" && tab === "all") {
    hidden = list.filter((i) => HIDDEN.includes(i.bucket)).length;
    list = list.filter((i) => !HIDDEN.includes(i.bucket));
  }

  return (
    <>
      <header className="top">
        <div className="top-in">
          <span className="logo">Gleam</span>
        </div>
      </header>
      <main className={view === "sorted" ? "wide" : undefined}>
        <section className="profile">
          <span className="ring">
            <Avatar name="G" size={86} />
          </span>
          <div className="pinfo">
            <div className="prow">
              <h1>your_channel</h1>
              <button
                className={`btn live${live ? " on" : ""}`}
                aria-pressed={live}
                onClick={() => setLive(!live)}
              >
                {live ? "● Live now · End" : "Go live"}
              </button>
            </div>
            <ul className="stats2">
              <li>
                <b>{items.length}</b> comments
              </li>
              <li>
                <b>{count("held") + count("escalated")}</b> hidden
              </li>
              <li>
                <b>{count("praise")}</b> thank-yous
              </li>
            </ul>
            <p className="bio">
              <b>Gleam</b>
              <br />
              <span>
                Comments sorted before you see them. Abuse is held back,
                feedback is made usable.
              </span>
            </p>
          </div>
        </section>

        <nav
          className="hls"
          aria-label="Filter comments"
          hidden={view === "sorted"}
        >
          {TABS.map(([k, v, icon]) => (
            <button
              key={k}
              className="hl"
              aria-pressed={tab === k}
              onClick={() => setTab(k)}
            >
              <span className="hlc">
                <span>{icon}</span>
              </span>
              <small>
                {v} {count(k)}
              </small>
            </button>
          ))}
        </nav>

        <div className="tabs" role="group" aria-label="What you see">
          {(
            [
              ["creator", "Creator view"],
              ["raw", "Raw view"],
              ["sorted", "Sorted"],
            ] as [View, string][]
          ).map(([k, v]) => (
            <button
              key={k}
              aria-pressed={view === k}
              onClick={() => setView(k)}
            >
              {v}
            </button>
          ))}
        </div>

        {view === "sorted" ? (
          <section className="board" aria-live="polite">
            {TABS.slice(1).map(([k, v]) => (
              <div key={k} className="col">
                <h2>
                  {v} · {count(k as Tab)}
                </h2>
                {count(k as Tab) === 0 && <p className="mut">None yet</p>}
                <ul className="cl">
                  {items
                    .filter((i) => i.bucket === k)
                    .map((i) => (
                      <Comment key={i.id} i={i} raw={false} />
                    ))}
                </ul>
              </div>
            ))}
          </section>
        ) : (
          <section aria-live="polite">
            {hidden > 0 && (
              <p className="note">
                {hidden} comment{hidden > 1 ? "s" : ""} hidden by Glimmer. Open
                “Held back” or “Review” to look.
              </p>
            )}
            {list.length === 0 && hidden === 0 && (
              <p className="empty">
                No comments yet. Add one below or tap “Go live”.
              </p>
            )}
            <ul className="cl">
              {list.map((i) => (
                <Comment key={i.id} i={i} raw={view === "raw"} />
              ))}
            </ul>
          </section>
        )}

        <form className="composer" onSubmit={submit}>
          <input
            className="nm"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            aria-label="Viewer name"
          />
          <input
            className="tx"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            aria-label="Comment"
          />
          <button className="post" disabled={!text.trim()}>
            Post
          </button>
        </form>
        <p className="foot">
          Without META_API_KEY, sorting uses built-in rules.
        </p>
      </main>
    </>
  );
}
