import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TopicRow } from "@/components/journey/panels";
import { Nav } from "@/components/ui/Nav";

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

describe("Nav", () => {
  it("renders a control for every non-hero topic", () => {
    const html = renderToStaticMarkup(<Nav />);
    for (const id of ["websites", "ai", "cyber", "about", "contact"]) {
      expect(html).toContain(`data-nav="${id}"`);
    }
  });
});
