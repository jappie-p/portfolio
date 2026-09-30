import { readFileSync } from "node:fs";
import path from "node:path";
import { createHighlighterCoreSync, type HighlighterCore, type ThemeRegistrationRaw } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import typescript from "shiki/langs/typescript.mjs";
import javascript from "shiki/langs/javascript.mjs";
import python from "shiki/langs/python.mjs";
import yaml from "shiki/langs/yaml.mjs";
import type { ProjectSlug } from "@/lib/chapters";
import { SNIPPETS, type SnippetLang, type SnippetSlug } from "@/data/snippets";
import type { CaseSnippet } from "@/components/work/CaseOverlay";

// Server-only: highlights the code samples once, when the page is built, so no
// highlighter ships to the browser. The theme uses the site's own palette.

const THEME: ThemeRegistrationRaw = {
  name: "portfolio",
  type: "dark",
  colors: { "editor.background": "#00000000", "editor.foreground": "#c9d4dc" },
  settings: [
    { settings: { foreground: "#c9d4dc", background: "#00000000" } },
    { scope: ["comment", "punctuation.definition.comment", "string.quoted.docstring"], settings: { foreground: "#6e7d89", fontStyle: "italic" } },
    { scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.control", "keyword.operator.new"], settings: { foreground: "#86efac" } },
    { scope: ["string", "string.quoted", "string.template", "punctuation.definition.string"], settings: { foreground: "#5eead4" } },
    { scope: ["constant.numeric", "constant.language", "constant.character", "constant.other"], settings: { foreground: "#93c5fd" } },
    { scope: ["entity.name.function", "support.function", "meta.function-call.generic"], settings: { foreground: "#f1f5f9" } },
    { scope: ["entity.name.type", "entity.name.class", "support.type", "support.class", "entity.name.tag"], settings: { foreground: "#a5f3fc" } },
    { scope: ["variable.parameter"], settings: { foreground: "#e2e8f0", fontStyle: "italic" } },
    { scope: ["punctuation", "meta.brace", "keyword.operator"], settings: { foreground: "#8b9aa6" } },
    { scope: ["variable.other.property", "support.variable.property", "meta.object-literal.key"], settings: { foreground: "#d6e1e8" } },
  ],
};

const LANG: Record<SnippetLang, string> = { ts: "typescript", js: "javascript", python: "python", yaml: "yaml" };

let highlighter: HighlighterCore | null = null;

export function highlight(code: string, lang: SnippetLang): string {
  highlighter ??= createHighlighterCoreSync({
    themes: [THEME],
    langs: [typescript, javascript, python, yaml],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter.codeToHtml(code, { lang: LANG[lang], theme: "portfolio" });
}

/** The source of a project's code sample. */
export function snippetCode(slug: SnippetSlug): string {
  return readFileSync(path.join(process.cwd(), "src", "data", "snippets", `${slug}.txt`), "utf8");
}

/** Every project's code sample, ready for the case panel. */
export function highlightedSnippets(): Partial<Record<ProjectSlug, CaseSnippet>> {
  return Object.fromEntries(
    (Object.keys(SNIPPETS) as SnippetSlug[]).map((slug) => {
      const s = SNIPPETS[slug];
      return [slug, { file: s.file, html: highlight(snippetCode(slug), s.lang) }];
    }),
  );
}
