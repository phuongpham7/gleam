import Database from "better-sqlite3";

const db = new Database(process.env.DB_PATH ?? "gleam.db");
db.exec(`CREATE TABLE IF NOT EXISTS comments(
  id INTEGER PRIMARY KEY AUTOINCREMENT, author TEXT NOT NULL, text TEXT NOT NULL, label TEXT NOT NULL,
  bucket TEXT NOT NULL, reframed TEXT, source TEXT, card TEXT, created_at INTEGER NOT NULL)`);

// Cards are stored in the table but never sent in lists (they're large): only a hasCard flag.
const COLS =
  "id,author,text,label,bucket,reframed,source,created_at,(card IS NOT NULL) AS hasCard";
export const get = (id: number) =>
  db.prepare(`SELECT ${COLS} FROM comments WHERE id=?`).get(id) as any;
export const list = () =>
  db.prepare(`SELECT ${COLS} FROM comments ORDER BY id DESC LIMIT 200`).all();
export const getCard = (id: number) =>
  (db.prepare("SELECT card FROM comments WHERE id=?").get(id) as any)?.card as
    | string
    | undefined;
export const setCard = (id: number, card: string) =>
  db.prepare("UPDATE comments SET card=? WHERE id=?").run(card, id);
export const clear = () => db.exec("DELETE FROM comments");
export function insert(r: {
  author: string;
  text: string;
  label: string;
  bucket: string;
  reframed: string | null;
  source: string;
}) {
  const info = db
    .prepare(
      "INSERT INTO comments(author,text,label,bucket,reframed,source,created_at) VALUES (?,?,?,?,?,?,?)",
    )
    .run(r.author, r.text, r.label, r.bucket, r.reframed, r.source, Date.now());
  return get(Number(info.lastInsertRowid));
}
