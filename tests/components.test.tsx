import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Section } from "@/components/journey/Section";
import { Nav } from "@/components/ui/Nav";

describe("Section", () => {
  it("renders children inside a data-section anchor", () => {
    const html = renderToStaticMarkup(
      <Section id="websites" label="Websites">
        <p>hi</p>
      </Section>,
    );
    expect(html).toContain('data-section="websites"');
    expect(html).toContain("hi");
  });
});

describe("Nav", () => {
  it("renders a control for every non-hero chapter", () => {
    const html = renderToStaticMarkup(<Nav />);
    for (const id of ["websites", "ai", "cyber", "about", "contact"]) {
      expect(html).toContain(`data-nav="${id}"`);
    }
  });
});
