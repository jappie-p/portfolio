import { test as base, expect, type BrowserContext } from "@playwright/test";

/** Runs in every page before the site: all Web Audio goes through a gain of
 *  zero on its way out, so the narrator and the chimes play (and can be
 *  measured) without a sound from the speakers while the tests run. */
function silence() {
  const real = Object.getOwnPropertyDescriptor(BaseAudioContext.prototype, "destination")!.get!;
  const muted = new WeakMap<BaseAudioContext, GainNode>();
  Object.defineProperty(BaseAudioContext.prototype, "destination", {
    configurable: true,
    get(this: BaseAudioContext) {
      let gain = muted.get(this);
      if (!gain) {
        gain = this.createGain();
        gain.gain.value = 0;
        gain.connect(real.call(this));
        muted.set(this, gain);
      }
      return gain;
    },
  });
}

/** A context made outside the fixtures (its own options) is silenced here. */
export const mute = (context: BrowserContext) => context.addInitScript(silence);

export const test = base.extend({
  context: async ({ context }, run) => {
    await mute(context);
    await run(context);
  },
});

export { expect };
export type { Locator, Page } from "@playwright/test";
