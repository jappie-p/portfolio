"use client";
import { ProjectPanel } from "@/components/journey/panels";
import { SITE, BASE_PATH } from "@/data/site";
import { jumpTo } from "@/lib/scene";
import { useLocale, useT } from "@/i18n/useT";
import a from "./about.module.css";
import c from "./closing.module.css";

/**
 * The invitation: one big line to build something together, the way to
 * contact, my cv and GitHub; references on request; and my name signed at
 * the foot of the page.
 */
export function ClosingPanel() {
  const t = useT();
  const locale = useLocale((s) => s.locale);
  const ab = t.about;
  const cl = ab.closing;
  return (
    <ProjectPanel label={`${cl.title} ${cl.titleEm} ${cl.titleEnd}`} className={c.panel}>
      <div className={c.wrap}>
        <div data-reveal className={c.top}>
          <p className={a.kicker}>{cl.kicker}</p>
          <h2 className={`${a.display} ${c.title}`}>
            {cl.title} <span className={a.em}>{cl.titleEm}</span> {cl.titleEnd}
          </h2>
          <p className={c.lead}>{cl.lead}</p>
          <div className={c.actions}>
            <button type="button" onClick={() => jumpTo("contact")} className="btn btn-primary">
              {cl.contact}
              <span aria-hidden className="btn-arrow">
                →
              </span>
            </button>
            <a href={`${BASE_PATH}${SITE.cv[locale]}`} target="_blank" rel="noopener" className="btn btn-ghost">
              {ab.cv}
              <span className={c.pdf}>pdf</span>
            </a>
            <a href={SITE.github} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
              {t.contact.github}
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>

        <section data-reveal className={c.refs} aria-labelledby="about-refs">
          <div>
            <h3 id="about-refs" className={c.refsTitle}>
              {ab.refsTitle}
            </h3>
            <p className={c.refsText}>{ab.refsText}</p>
          </div>
          <button type="button" onClick={() => jumpTo("contact")} className={c.refsCta}>
            {ab.refsCta}
            <span aria-hidden>→</span>
          </button>
        </section>

        <p className={c.sign}>
          <span className={c.mark} aria-hidden>
            JP.
          </span>
          <span>{SITE.name}</span>
          <span className={c.role}>{cl.role}</span>
        </p>
      </div>
    </ProjectPanel>
  );
}
