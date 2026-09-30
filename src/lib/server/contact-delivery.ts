import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import { SITE } from "@/data/site";
import type { ContactInput } from "@/lib/contact";

/**
 * Where a contact message goes. It is always appended to a JSONL inbox on the
 * server first, so nothing is lost; when SMTP is configured (the same
 * EMAIL_* variables HypHosting's mailer uses) it is also mailed to me, with
 * Reply-To set to the sender. Only what the sender typed is stored.
 */
export async function deliverContact(msg: ContactInput): Promise<"mail" | "inbox"> {
  const env = process.env;
  const at = new Date().toISOString();

  const inbox = env.CONTACT_INBOX || path.join(process.cwd(), ".data", "contact-inbox.jsonl");
  await mkdir(path.dirname(inbox), { recursive: true });
  await appendFile(inbox, JSON.stringify({ at, ...msg }) + "\n", { mode: 0o600 });

  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) return "inbox";

  // the message is already safe in the inbox, so a mail failure is only logged
  try {
    const port = Number(env.EMAIL_PORT) || 587;
    const transport = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port,
      secure: port === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
    await transport.sendMail({
      from: env.EMAIL_FROM || env.EMAIL_USER,
      to: env.CONTACT_TO || SITE.email,
      replyTo: { name: msg.name, address: msg.email },
      subject: `Portfolio: bericht van ${msg.name}`,
      text: `${msg.message}\n\n${msg.name} <${msg.email}>\n${at}`,
    });
    return "mail";
  } catch (err) {
    console.error("[contact] mail failed, kept in inbox:", err);
    return "inbox";
  }
}
