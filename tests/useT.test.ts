import { describe, it, expect, beforeEach } from "vitest";
import { useLocale } from "@/i18n/useT";
import { nl } from "@/i18n/nl";
import { en } from "@/i18n/en";

describe("locale store", () => {
  beforeEach(() => {
    localStorage.clear();
    useLocale.setState({ locale: "nl" });
  });

  it("defaults to Dutch", () => {
    expect(useLocale.getState().locale).toBe("nl");
    expect(nl.hero.role).toMatch(/Game-artist/);
  });

  it("swaps to English and persists", () => {
    useLocale.getState().set("en");
    expect(useLocale.getState().locale).toBe("en");
    expect(localStorage.getItem("lang")).toBe("en");
    expect(en.hero.role).toMatch(/Game artist turned/);
  });
});
