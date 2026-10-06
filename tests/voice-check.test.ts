import { describe, it, expect } from "vitest";
import { misses, plain, syllables } from "../scripts/voice/check.mts";

// The recording script keeps a take only when speech-to-text hears every
// word of its line; these are the differences that are, and are not, a word.
const off = (line: string, heard: string) => misses(plain(line), plain(heard));

describe("holding a take up against its line", () => {
  it("catches a word said wrong", () => {
    expect(off("What a jump!", "What a job.")).toBe(1);
    expect(off("Klik op een van de werken", "Klik op de werken")).toBe(2);
  });

  it("lets punctuation, spelling variants and words run together pass", () => {
    expect(off("Tijd voor je eerste sprong: scroll naar beneden!", "Tijd voor je eerste sprong. Scrol naar beneden")).toBe(0);
    expect(off("Everything comes in to me", "Everything comes into me")).toBe(0);
    expect(off("At Go to Guy, Jasper", "At Go2Guy, Jasper")).toBe(0);
  });

  it("treats a laugh as performance, not a word", () => {
    expect(off("Ha, jij bent een natuurtalent!", "Haha, jij bent een natuurtalent.")).toBe(0);
    expect(off("Ha, jij bent een natuurtalent!", "Jij bent een natuurtalent.")).toBe(0);
  });

  it("counts pace in syllables, so short words weigh less", () => {
    expect(syllables(plain("met me mee"), "nl")).toBe(syllables(plain("agenda"), "nl"));
    expect(syllables(plain("time"), "en")).toBe(1);
  });
});
