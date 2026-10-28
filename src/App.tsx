import { useEffect, useRef, useState } from "react";
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
const TABS: [Tab, string][] = [
  ["all", "All comments"],
  ["praise", "Praise"],
  ["constructive", "Feedback"],
  ["held", "Held back"],
  ["escalated", "Needs review"],
];

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

function Reveal({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="link" onClick={() => setOpen(!open)}>
        {open ? "Hide" : label}
      </button>
      {open && <div className="meta">{text}</div>}
    </>
  );
}

function CreatorBody({ i }: { i: Item }) {
  if (i.bucket === "constructive")
    return (
      <>
        <div className="sug">{i.reframed}</div>
        <Reveal text={i.text} label="Show original" />
      </>
    );
  if (i.bucket === "held")
    return (
      <>
        <div className="meta">Hidden from your view ({i.label}).</div>
        <Reveal text={i.text} label="Show anyway" />
      </>
    );
  if (i.bucket === "escalated")
    return (
      <>
        <div className="sug">
          Possible threat. Review it and report it if needed.
        </div>
        <Reveal text={i.text} label="Show original" />
      </>
    );
  return (
    <>
      <div>{i.text}</div>
      {i.bucket === "praise" && <ThankCard name={i.author} quote={i.text} />}
    </>
  );
}

export default function App() {
  const [items, setItems] = useState<Item[]>([]);
  const [tab, setTab] = useState<Tab>("all");
  const [view, setView] = useState<"creator" | "raw" | "sorted">("creator");
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

  const count = (k: Tab) =>
    k === "all" ? items.length : items.filter((i) => i.bucket === k).length;
  let list = items.filter((i) => tab === "all" || i.bucket === tab);
  let hidden = 0;
  if (view === "creator" && tab === "all") {
    hidden = list.filter(
      (i) => i.bucket === "held" || i.bucket === "escalated",
    ).length;
    list = list.filter((i) => i.bucket !== "held" && i.bucket !== "escalated");
  }

  return (
    <main className={view === "sorted" ? "wide" : undefined}>
      <h1>Gleam</h1>
      <p className="sub">
        Your comments, sorted before you see them. Abuse is held back, harsh
        feedback becomes something you can use, and fans who cheer you on get a
        thank-you card.
      </p>

      <section className="panel" aria-label="Add a comment">
        <div className="grid">
          <div>
            <label htmlFor="au">Viewer name</label>
            <input
              id="au"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tx">Comment</label>
            <input
              id="tx"
              value={text}
              placeholder="Try: Your audio is trash"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && text.trim()) {
                  add(author || "anonymous", text.trim());
                  setText("");
                }
              }}
            />
          </div>
        </div>
        <div className="row">
          <button
            onClick={() => {
              if (text.trim()) {
                add(author || "anonymous", text.trim());
                setText("");
              }
            }}
          >
            Post comment
          </button>
          <button
            className={live ? "on" : "ghost"}
            aria-pressed={live}
            onClick={() => setLive(!live)}
          >
            {live ? "Stop live stream" : "Start live stream"}
          </button>
          <div className="seg" role="group" aria-label="What you see">
            <button
              aria-pressed={view === "creator"}
              onClick={() => setView("creator")}
            >
              Creator view
            </button>
            <button
              aria-pressed={view === "raw"}
              onClick={() => setView("raw")}
            >
              Raw view
            </button>
            <button
              aria-pressed={view === "sorted"}
              onClick={() => setView("sorted")}
            >
              Sorted
            </button>
          </div>
        </div>
      </section>

      <div className="stats" hidden={view === "sorted"}>
        {TABS.map(([k, v]) => (
          <button
            key={k}
            className="stat"
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            <b>{count(k)}</b>
            <span>{v}</span>
          </button>
        ))}
      </div>

      {view === "sorted" ? (
        <section className="board" aria-live="polite">
          {TABS.slice(1).map(([k, v]) => (
            <div key={k} className="col">
              <h2>
                {v} <span className="tag">{count(k)}</span>
              </h2>
              {count(k) === 0 && <p className="empty">None yet</p>}
              {items
                .filter((i) => i.bucket === k)
                .map((i) => (
                  <article key={i.id} className={`item ${i.bucket}`}>
                    <div className="meta">{i.author}</div>
                    <CreatorBody i={i} />
                  </article>
                ))}
            </div>
          ))}
        </section>
      ) : (
        <section aria-live="polite">
          {hidden > 0 && (
            <p className="note">
              {hidden} comment{hidden > 1 ? "s" : ""} hidden by Glimmer. Open
              Held back or Needs review to look.
            </p>
          )}
          {list.length === 0 && (
            <p className="empty">
              Nothing here yet. Post a comment or start the live stream.
            </p>
          )}
          {list.map((i) => (
            <article key={i.id} className={`item ${i.bucket}`}>
              <div className="meta">
                {i.author}
                {view === "raw" && <span className="tag">{i.label}</span>}
              </div>
              {view === "raw" ? (
                <>
                  <div>{i.text}</div>
                  {i.bucket === "praise" && (
                    <ThankCard name={i.author} quote={i.text} />
                  )}
                </>
              ) : (
                <CreatorBody i={i} />
              )}
            </article>
          ))}
        </section>
      )}
      <p className="foot">
        Without META_API_KEY, sorting uses built-in rules on the server.
      </p>
    </main>
  );
}
