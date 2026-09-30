import { z } from "zod";

// The contact form's rules, shared by the form (instant feedback) and the API
// route (the real check). Error text lives in the dictionaries per field.

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[^\r\n]*$/),
  email: z.string().trim().max(160).pipe(z.email()),
  message: z.string().trim().min(10).max(4000),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;

/** Nobody types a real message this fast; bots do. */
export const MIN_FILL_MS = 2500;

/** The fields that failed, in form order. */
export function invalidFields(error: z.ZodError): ContactField[] {
  const bad = new Set(error.issues.map((i) => i.path[0]));
  return (["name", "email", "message"] as const).filter((f) => bad.has(f));
}
