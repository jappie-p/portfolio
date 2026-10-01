import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TopicRow } from "@/components/journey/panels";
import { Nav } from "@/components/ui/Nav";
import { CyberSection } from "@/components/cyber/CyberSection";
import { AiSection } from "@/components/ai/AiSection";
import { About } from "@/components/sections/About";
import { School } from "@/components/sections/School";
import { Contact } from "@/components/sections/Contact";
import { SystemDiagram } from "@/components/work/SystemDiagram";
import { SITE } from "@/data/site";

describe("TopicRow", () => {
  it("renders children inside a data-section anchor", () => {
    const html = renderToStaticMarkup(
      <TopicRow id="websites" label="Websites">
        <p>hi</p>
      </TopicRow>,
    );
    expect(html).toContain('data-section="websites"');
    expect(html).toContain("hi");
  });
});

describe("CyberSection", () => {
  const html = renderToStaticMarkup(<CyberSection />);
  it("server-renders as a one-screen topic with the poster floor, never a canvas or video", () => {
    expect(html).toContain('data-section="cyber"');
    expect(html).toContain("topic-row");
    expect(html).toContain("firewall-poster.webp");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<video");
  });
  it("lays the story out as four sideways chapters, ending on the Homelab card", () => {
    expect(html.match(/class="project-panel/g)).toHaveLength(4);
    for (const text of ["Verdediging die zichtbaar aan het werk is.", "DDoS-aanval", "De muur houdt stand", "Homelab"]) {
      expect(html).toContain(text);
    }
    expect(html.indexOf("DDoS-aanval")).toBeLessThan(html.indexOf("De muur houdt stand"));
    expect(html.indexOf("De muur houdt stand")).toBeLessThan(html.indexOf("Homelab"));
  });
});

describe("AiSection", () => {
  const html = renderToStaticMarkup(<AiSection />);
  it("server-renders the poster, never a canvas", () => {
    expect(html).toContain('data-section="ai"');
    expect(html).toContain("ai-poster.webp");
    expect(html).not.toContain("<canvas");
  });
  it("plays three chapters sideways: the cover, Jarvis, Go to Guy", () => {
    expect(html.match(/class="project-panel/g)).toHaveLength(3);
    expect(html.indexOf("Leest mee, plant mee")).toBeLessThan(html.indexOf("Eén brein voor het team"));
    for (const name of ["Jarvis", "Go to Guy"]) expect(html).toContain(name);
  });
});

describe("Nav", () => {
  it("renders a control for every non-hero topic", () => {
    const html = renderToStaticMarkup(<Nav />);
    for (const id of ["about", "websites", "ai", "cyber", "school", "contact"]) {
      expect(html).toContain(`data-nav="${id}"`);
    }
  });
});

// The school's portfolio form (GLU) asks for these on the about page.
describe("About", () => {
  const html = renderToStaticMarkup(<About />);
  it("shows a real photo, the story and why I do this", () => {
    expect(html).toMatch(/<img[^>]+alt="Portretfoto van Jasper Pathuis"/);
    expect(html).toContain("Waarom ik dit doe");
  });
  it("keeps hard and soft skills visibly apart", () => {
    expect(html).toContain('id="hard-skills"');
    expect(html).toContain('id="soft-skills"');
    expect(html.indexOf("Hard skills")).toBeLessThan(html.indexOf("Soft skills"));
  });
  it("links the cv as a pdf, says what I want to learn and offers references", () => {
    expect(html).toMatch(/href="[^"]*\/cv\/jasper-pathuis-cv-nl\.pdf"/);
    expect(html).toContain("Wat ik nog wil leren");
    expect(html).toContain("Referenties");
  });
  it("walks sideways through four panels", () => {
    expect(html.match(/class="project-panel/g)).toHaveLength(4);
  });
});

describe("School", () => {
  const html = renderToStaticMarkup(<School />);
  it("labels the school projects and marks each as solo or team", () => {
    expect(html).toContain("Schoolprojecten");
    expect(html).toContain(">Team<");
    expect(html).toContain(">Solo<");
  });
  it("has a cover and one panel per project, with the game playable in the browser", () => {
    expect(html.match(/class="project-panel/g)).toHaveLength(4);
    expect(html).toContain('href="/play/zelda/index.html"');
  });
});

describe("Contact", () => {
  const html = renderToStaticMarkup(<Contact />);
  it("has a form with labelled fields", () => {
    for (const id of ["contact-name", "contact-email", "contact-message"]) expect(html).toContain(`for="${id}"`);
    expect(html).toMatch(/<button[^>]+type="submit"/);
  });
  it("shows where I am on a world map, as a region", () => {
    expect(html).toMatch(/role="img"[^>]+aria-label="Wereldkaart/);
    expect(html).toContain("Regio Utrecht, Nederland");
  });
  it("never writes the email address into the server HTML", () => {
    expect(html).not.toContain(SITE.email);
    expect(html).toContain("pathuisjasper [at] gmail.com");
  });
});

describe("SystemDiagram", () => {
  it("describes the whole flow for screen readers", () => {
    const html = renderToStaticMarkup(<SystemDiagram id="homelab" />);
    expect(html).toMatch(/aria-label="Zo zit het in elkaar: Tailscale, Cloudflare → Proxmox → Mediaserver, VPN-downloads, Kluis, Honeypot"/);
  });
});
