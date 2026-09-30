"use client";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { contactSchema, invalidFields, type ContactField } from "@/lib/contact";
import { BASE_PATH } from "@/data/site";
import { useT } from "@/i18n/useT";

type Status = "idle" | "sending" | "sent" | "error" | "rate";

/** Name, email and message, checked as you send, posted to /api/contact. A
 *  hidden field and a minimum fill time keep most bots out without a captcha. */
export function ContactForm() {
  const t = useT();
  const f = t.contact.form;
  const [status, setStatus] = useState<Status>("idle");
  const [invalid, setInvalid] = useState<ContactField[]>([]);
  const shownAt = useRef(0);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    shownAt.current = performance.now();
  }, []);

  const errorText: Record<ContactField, string> = { name: f.errName, email: f.errEmail, message: f.errMessage };

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    const data = Object.fromEntries(new FormData(el)) as Record<string, string>;
    const parsed = contactSchema.safeParse(data);
    if (!parsed.success) {
      const bad = invalidFields(parsed.error);
      setInvalid(bad);
      el.querySelector<HTMLElement>(`[name="${bad[0]}"]`)?.focus();
      return;
    }
    setInvalid([]);
    setStatus("sending");
    try {
      const res = await fetch(`${BASE_PATH}/api/contact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...parsed.data, company: data.company ?? "", elapsedMs: Math.round(performance.now() - shownAt.current) }),
      });
      if (res.ok) {
        el.reset();
        setStatus("sent");
      } else setStatus(res.status === 429 ? "rate" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent")
    return (
      <div role="status" className="glass flex flex-col items-start p-7 sm:p-8">
        <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-leaf/15 text-xl text-leaf ring-1 ring-leaf/40">
          ✓
        </span>
        <h3 className="headline mt-5 text-3xl text-ink">{f.sentTitle}</h3>
        <p className="mt-2 text-ink-dim">{f.sentText}</p>
        <button type="button" onClick={() => setStatus("idle")} className="btn btn-ghost mt-6">
          {f.again}
        </button>
      </div>
    );

  const field = (name: ContactField) => ({
    id: `contact-${name}`,
    name,
    "aria-invalid": invalid.includes(name) || undefined,
    "aria-describedby": invalid.includes(name) ? `contact-${name}-error` : undefined,
    onInput: () => invalid.includes(name) && setInvalid(invalid.filter((x) => x !== name)),
  });
  const error = (name: ContactField) =>
    invalid.includes(name) && (
      <p id={`contact-${name}-error`} className="mt-1.5 text-sm text-rose-300">
        {errorText[name]}
      </p>
    );

  return (
    <form ref={form} onSubmit={onSubmit} noValidate className="glass relative flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="contact-form-title">
      <h3 id="contact-form-title" className="headline text-3xl text-ink">
        {f.title}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="mb-1.5 block text-sm text-ink-dim">
            {f.name}
          </label>
          <input {...field("name")} type="text" autoComplete="name" maxLength={80} required className="field" />
          {error("name")}
        </div>
        <div>
          <label htmlFor="contact-email" className="mb-1.5 block text-sm text-ink-dim">
            {f.email}
          </label>
          <input {...field("email")} type="email" autoComplete="email" inputMode="email" maxLength={160} required className="field" />
          {error("email")}
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="mb-1.5 block text-sm text-ink-dim">
          {f.message}
        </label>
        <textarea {...field("message")} rows={5} maxLength={4000} required className="field resize-y" />
        {error("message")}
      </div>
      {/* honeypot: invisible to people, tempting to bots */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-company">Company</label>
        <input id="contact-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <div className="mt-1 flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-ink-faint">{f.privacy}</p>
        <button type="submit" disabled={status === "sending"} className="btn btn-primary disabled:opacity-60">
          {status === "sending" ? f.sending : f.send}
          <span aria-hidden className={status === "sending" ? "" : "btn-arrow"}>
            →
          </span>
        </button>
      </div>
      <p role="alert" className="text-sm text-rose-300 empty:hidden">
        {status === "error" ? f.error : status === "rate" ? f.errRate : ""}
      </p>
    </form>
  );
}
