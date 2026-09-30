import { contactSchema, invalidFields, MIN_FILL_MS } from "@/lib/contact";
import { deliverContact } from "@/lib/server/contact-delivery";

// POST /api/contact: validate, stop bots, rate-limit per visitor, deliver.

const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 3;
const recent = new Map<string, number[]>();

// Cloudflare's header first (the site sits behind it), then what nginx set;
// the first X-Forwarded-For entry is whatever the client sent, so use the last.
function visitor(req: Request): string {
  const h = req.headers;
  return h.get("cf-connecting-ip") ?? h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",").pop()?.trim() ?? "local";
}

function limited(key: string, now: number): boolean {
  if (recent.size > 5000) recent.clear();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) return true;
  recent.set(key, [...hits, now]);
  return false;
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  // bots fill the hidden field or submit instantly: say it worked, send nothing
  const trapped = (typeof body.company === "string" && body.company !== "") || !(Number(body.elapsedMs) >= MIN_FILL_MS);
  if (trapped) return Response.json({ ok: true });

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) return Response.json({ ok: false, error: "invalid", fields: invalidFields(parsed.error) }, { status: 422 });

  if (limited(visitor(req), Date.now())) return Response.json({ ok: false, error: "rate" }, { status: 429 });

  try {
    await deliverContact(parsed.data);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[contact] delivery failed:", err);
    return Response.json({ ok: false, error: "delivery" }, { status: 502 });
  }
}
