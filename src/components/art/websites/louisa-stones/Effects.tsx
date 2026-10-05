"use client";
import { useEffect, useMemo, type Ref } from "react";
import { Bloom, DepthOfField, EffectComposer, SMAA, ToneMapping } from "@react-three/postprocessing";
import { SMAAPreset, ToneMappingMode, type EffectComposer as Composer } from "postprocessing";
import { FinishEffect } from "./finish";
import type { StonesPlan } from "./layout";

/**
 * The camera: a shallow depth of field (the far stones go soft), bloom only
 * on true highlights, Khronos Neutral tone mapping (made for product shots:
 * AgX washed the agate's honey and the amethyst's violet out), then the
 * finish. SMAA last, on the final image: crisp crystal edges without the cost
 * of MSAA. Off (`enabled`) until its shaders have been compiled ahead.
 */
export function Effects({ plan, dof, enabled, composer }: { plan: StonesPlan; dof: boolean; enabled: boolean; composer: Ref<Composer> }) {
  const finish = useMemo(() => new FinishEffect(), []);
  useEffect(() => () => finish.dispose(), [finish]);
  useEffect(() => finish.frame(plan.w, plan.h, plan.w < 640 ? 110 : 60), [finish, plan.w, plan.h]);

  return (
    <EffectComposer ref={composer} enabled={enabled} multisampling={0}>
      {dof ? <DepthOfField worldFocusDistance={plan.focus} worldFocusRange={plan.range} bokehScale={plan.bokeh} resolutionScale={0.4} /> : <></>}
      <Bloom mipmapBlur intensity={0.32} luminanceThreshold={1.1} luminanceSmoothing={0.3} radius={0.62} />
      <ToneMapping mode={ToneMappingMode.NEUTRAL} />
      <primitive object={finish} />
      <SMAA preset={SMAAPreset.HIGH} />
    </EffectComposer>
  );
}
