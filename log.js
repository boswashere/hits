import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  // GET: fetch logs
  if (req.method === "GET") {
    const logs = await kv.lrange("visits", 0, 499);
    return res.status(200).json(logs.map(l => JSON.parse(l)));
  }

  // POST or pixel hit: log a visit
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  const entry = {
    ts: new Date().toISOString(),
    ip,
    ua: req.headers["user-agent"] || "unknown",
    ref: req.headers["referer"] || req.headers["referrer"] || null,
    lang: req.headers["accept-language"]?.split(",")[0] || null,
    path: req.query.path || req.body?.path || null,
    title: req.body?.title || null,
    screen: req.body?.screen || null,
    tz: req.body?.tz || null,
    extra: req.body?.extra || null,
  };

  await kv.lpush("visits", JSON.stringify(entry));
  await kv.ltrim("visits", 0, 9999); // cap at 10k

  // transparent 1x1 gif so it works as an img pixel too
  const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
  res.setHeader("Content-Type", "image/gif");
  res.setHeader("Cache-Control", "no-store");
  res.status(200).send(gif);
}
