"use client";
// Ported from jarvis/web/src/components/orb/OrbParticles.tsx — only the state
// source changed (Jarvis appStore -> portfolio journeyStore orbState). The
// particle math is unchanged. Colors kept as the original (cyan); retint TBD.
import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useJourney } from "@/lib/store";

// Deterministic PRNG (codebase convention) so particle seeding stays pure for
// React's purity lint and stable across renders.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(0x9e3779b9);

export function OrbParticles() {
  const orbState = useJourney((s) => s.orbState);
  const stateRef = useRef<string>(orbState);
  useEffect(() => {
    stateRef.current = orbState;
  }, [orbState]);

  const surfaceRef = useRef<THREE.Points>(null!);
  const innerRef = useRef<THREE.Points>(null!);
  const nucleusRef = useRef<THREE.Points>(null!);
  const atmosphereRef = useRef<THREE.Points>(null!);
  const voiceWaveRef = useRef<THREE.LineSegments>(null!);
  const surgeTimerRef = useRef(0);
  const nextSurgeRef = useRef(300);
  const waveLevelsRef = useRef<Float32Array>(null!);
  const waveTargetsRef = useRef<Float32Array>(null!);
  const frameSkipRef = useRef(0);
  const errorFlashRef = useRef(0);

  const N_BODY = 3000;
  const N_MESH = 1000;
  const N_NUC = 300;
  const N_ATM = 200;
  const N_WAVE = 64;

  const surfaceData = useMemo(() => {
    const pos = new Float32Array(N_BODY * 3);
    const base = new Float32Array(N_BODY * 3);
    const col = new Float32Array(N_BODY * 3);
    const speeds = new Float32Array(N_BODY);
    const phases = new Float32Array(N_BODY);
    for (let i = 0; i < N_BODY; i++) {
      const phi = Math.acos(1 - 2 * (i / N_BODY));
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.sin(phi) * Math.sin(theta);
      const dz = Math.cos(phi);
      const r = 2.35 + rng() * 0.25;
      base[i * 3] = pos[i * 3] = dx * r;
      base[i * 3 + 1] = pos[i * 3 + 1] = dy * r;
      base[i * 3 + 2] = pos[i * 3 + 2] = dz * r;
      speeds[i] = 0.8 + rng() * 1.8;
      phases[i] = rng() * Math.PI * 2;
      const tint = rng();
      col[i * 3] = 0.1 + tint * 0.3;
      col[i * 3 + 1] = 0.7 + tint * 0.3;
      col[i * 3 + 2] = 1.0;
    }
    return { pos, base, col, speeds, phases };
  }, []);

  const surfaceGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(surfaceData.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(surfaceData.col, 3));
    return geo;
  }, [surfaceData]);

  const innerData = useMemo(() => {
    const pos = new Float32Array(N_MESH * 3);
    const base = new Float32Array(N_MESH * 3);
    const col = new Float32Array(N_MESH * 3);
    const phases = new Float32Array(N_MESH);
    const speeds = new Float32Array(N_MESH);
    for (let i = 0; i < N_MESH; i++) {
      const r = 0.5 + rng() * 1.8;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      base[i * 3] = pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      base[i * 3 + 1] = pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      base[i * 3 + 2] = pos[i * 3 + 2] = r * Math.cos(ph);
      phases[i] = rng() * Math.PI * 2;
      speeds[i] = 0.3 + rng() * 0.8;
      col[i * 3] = 0.05;
      col[i * 3 + 1] = 0.35 + rng() * 0.25;
      col[i * 3 + 2] = 0.6 + rng() * 0.3;
    }
    return { pos, base, col, phases, speeds };
  }, []);

  const innerGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(innerData.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(innerData.col, 3));
    return geo;
  }, [innerData]);

  const nucleusData = useMemo(() => {
    const pos = new Float32Array(N_NUC * 3);
    const base = new Float32Array(N_NUC * 3);
    const col = new Float32Array(N_NUC * 3);
    const phases = new Float32Array(N_NUC);
    for (let i = 0; i < N_NUC; i++) {
      const r = Math.pow(rng(), 1.3) * 0.5;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      base[i * 3] = pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      base[i * 3 + 1] = pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      base[i * 3 + 2] = pos[i * 3 + 2] = r * Math.cos(ph);
      phases[i] = rng() * Math.PI * 2;
      const tt = rng();
      col[i * 3] = 0.85 * (1 - tt) + 0.4 * tt;
      col[i * 3 + 1] = 1.0;
      col[i * 3 + 2] = 1.0;
    }
    return { pos, base, col, phases };
  }, []);

  const nucleusGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(nucleusData.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(nucleusData.col, 3));
    return geo;
  }, [nucleusData]);

  const atmosphereData = useMemo(() => {
    const pos = new Float32Array(N_ATM * 3);
    const col = new Float32Array(N_ATM * 3);
    const phases = new Float32Array(N_ATM * 3);
    for (let i = 0; i < N_ATM; i++) {
      const r = 2.7 + rng() * 0.6;
      const th = rng() * Math.PI * 2;
      const ph = Math.acos(2 * rng() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      pos[i * 3 + 2] = r * Math.cos(ph);
      phases[i * 3] = rng() * Math.PI * 2;
      phases[i * 3 + 1] = rng() * Math.PI * 2;
      phases[i * 3 + 2] = rng() * Math.PI * 2;
      if (rng() < 0.12) {
        col[i * 3] = 0.9;
        col[i * 3 + 1] = 1;
        col[i * 3 + 2] = 1;
      } else {
        col[i * 3] = 0.0;
        col[i * 3 + 1] = 0.3 + rng() * 0.2;
        col[i * 3 + 2] = 0.55 + rng() * 0.2;
      }
    }
    return { pos, col, phases };
  }, []);

  const atmosphereGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(atmosphereData.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(atmosphereData.col, 3));
    return geo;
  }, [atmosphereData]);

  const waveData = useMemo(() => {
    const pos = new Float32Array(N_WAVE * 2 * 3);
    const col = new Float32Array(N_WAVE * 2 * 3);
    for (let i = 0; i < N_WAVE; i++) {
      const a = (i / N_WAVE) * Math.PI * 2;
      const r0 = 2.85,
        r1 = 2.95;
      pos[i * 6] = Math.cos(a) * r0;
      pos[i * 6 + 1] = Math.sin(a) * r0;
      pos[i * 6 + 2] = 0;
      pos[i * 6 + 3] = Math.cos(a) * r1;
      pos[i * 6 + 4] = Math.sin(a) * r1;
      pos[i * 6 + 5] = 0;
      col[i * 6] = 0;
      col[i * 6 + 1] = 0.8;
      col[i * 6 + 2] = 1;
      col[i * 6 + 3] = 0;
      col[i * 6 + 4] = 0.8;
      col[i * 6 + 5] = 1;
    }
    return { pos, col };
  }, []);

  useEffect(() => {
    waveLevelsRef.current = new Float32Array(N_WAVE);
    waveTargetsRef.current = new Float32Array(N_WAVE);
  }, []);

  const waveGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(waveData.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(waveData.col, 3));
    return geo;
  }, [waveData]);

  const seedAtm = useCallback((i: number, pos: Float32Array, phases: Float32Array) => {
    const r = 2.7 + rng() * 0.6;
    const th = rng() * Math.PI * 2;
    const ph = Math.acos(2 * rng() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
    pos[i * 3 + 2] = r * Math.cos(ph);
    phases[i * 3] = rng() * Math.PI * 2;
    phases[i * 3 + 1] = rng() * Math.PI * 2;
    phases[i * 3 + 2] = rng() * Math.PI * 2;
  }, []);

  useFrame(() => {
    const state: string = stateRef.current;
    const skip = frameSkipRef.current++ % 2 !== 0;
    const t = Date.now() * 0.001;

    const isThinking = state === "thinking";
    const isResponding = state === "responding";
    const isError = state === "error";
    const isListening = state === "listening";

    const speedMul = isThinking ? 2 : 1;
    const surfaceRotY = isThinking ? 0.003 : isResponding ? 0.002 : isError ? 0.0004 : 0.0008;
    const surgeInterval = isThinking ? 60 : 240;
    const radiusMul = isListening ? 1.05 : 1;

    if (surfaceRef.current) {
      const posAttr = surfaceRef.current.geometry.attributes.position;
      const arr = posAttr.array as Float32Array;
      for (let i = 0; i < N_BODY; i++) {
        const drift = Math.sin(t * surfaceData.speeds[i] * speedMul + surfaceData.phases[i]) * 0.06;
        const bx = surfaceData.base[i * 3] * radiusMul;
        const by = surfaceData.base[i * 3 + 1] * radiusMul;
        const bz = surfaceData.base[i * 3 + 2] * radiusMul;
        const len = Math.sqrt(bx * bx + by * by + bz * bz);
        const scale = (len + drift) / len;
        arr[i * 3] = bx * scale;
        arr[i * 3 + 1] = by * scale;
        arr[i * 3 + 2] = bz * scale;
      }
      posAttr.needsUpdate = true;
      surfaceRef.current.rotation.y += surfaceRotY;
      surfaceRef.current.rotation.x += 0.0002;

      surgeTimerRef.current++;
      if (surgeTimerRef.current > nextSurgeRef.current) {
        surgeTimerRef.current = 0;
        nextSurgeRef.current = surgeInterval + rng() * surgeInterval;
        const colAttr = surfaceRef.current.geometry.attributes.color;
        const colArr = colAttr.array as Float32Array;
        const saved: [number, number, number, number][] = [];
        const surgeCount = isError ? 100 : 60;
        for (let k = 0; k < surgeCount; k++) {
          const idx = Math.floor(rng() * N_BODY);
          saved.push([idx, colArr[idx * 3], colArr[idx * 3 + 1], colArr[idx * 3 + 2]]);
          if (isError) {
            colArr[idx * 3] = 1.5;
            colArr[idx * 3 + 1] = 0.2;
            colArr[idx * 3 + 2] = 0.1;
          } else {
            colArr[idx * 3] = 1.5;
            colArr[idx * 3 + 1] = 1.5;
            colArr[idx * 3 + 2] = 1.5;
          }
        }
        colAttr.needsUpdate = true;
        setTimeout(() => {
          saved.forEach(([idx, r, g, b]) => {
            colArr[idx * 3] = r;
            colArr[idx * 3 + 1] = g;
            colArr[idx * 3 + 2] = b;
          });
          colAttr.needsUpdate = true;
        }, 400);
      }

      if (isError) {
        errorFlashRef.current++;
        if (errorFlashRef.current >= 120) {
          errorFlashRef.current = 0;
          surgeTimerRef.current = nextSurgeRef.current + 1;
        }
      } else {
        errorFlashRef.current = 0;
      }

      if (isResponding) {
        const colAttr = surfaceRef.current.geometry.attributes.color;
        const colArr = colAttr.array as Float32Array;
        for (let i = 0; i < N_BODY; i++) {
          colArr[i * 3] *= 0.998;
          colArr[i * 3 + 1] = Math.min(colArr[i * 3 + 1] * 1.0005, 1.0);
          colArr[i * 3 + 2] = Math.min(colArr[i * 3 + 2] * 1.0003, 1.0);
        }
        colAttr.needsUpdate = true;
      }
    }

    if (!skip) {
      if (innerRef.current) {
        const posAttr = innerRef.current.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        for (let i = 0; i < N_MESH; i++) {
          const ph = innerData.phases[i];
          const sp = innerData.speeds[i] * speedMul;
          arr[i * 3] = innerData.base[i * 3] + Math.sin(t * sp + ph) * 0.05;
          arr[i * 3 + 1] = innerData.base[i * 3 + 1] + Math.cos(t * sp + ph * 1.2) * 0.05;
          arr[i * 3 + 2] = innerData.base[i * 3 + 2] + Math.sin(t * sp * 0.8 + ph * 0.7) * 0.05;
        }
        posAttr.needsUpdate = true;
        innerRef.current.rotation.y -= 0.0006;
        innerRef.current.rotation.x += 0.0002;
      }

      if (nucleusRef.current) {
        const arr = nucleusRef.current.geometry.attributes.position.array as Float32Array;
        const nucCol = nucleusRef.current.geometry.attributes.color;
        const nucColArr = nucCol.array as Float32Array;
        for (let i = 0; i < N_NUC; i++) {
          const ph = nucleusData.phases[i];
          arr[i * 3] = nucleusData.base[i * 3] + Math.sin(t * 0.6 + ph) * 0.04;
          arr[i * 3 + 1] = nucleusData.base[i * 3 + 1] + Math.sin(t * 0.5 + ph * 1.3) * 0.04;
          arr[i * 3 + 2] = nucleusData.base[i * 3 + 2] + Math.sin(t * 0.55 + ph * 0.7) * 0.04;
          const d2 = arr[i * 3] ** 2 + arr[i * 3 + 1] ** 2 + arr[i * 3 + 2] ** 2;
          if (d2 > 0.64) {
            const s = 0.8 / Math.sqrt(d2);
            arr[i * 3] *= s;
            arr[i * 3 + 1] *= s;
            arr[i * 3 + 2] *= s;
          }
          if (isResponding) {
            nucColArr[i * 3] = Math.max(nucColArr[i * 3] * 0.99, 0.2);
            nucColArr[i * 3 + 1] = Math.min(nucColArr[i * 3 + 1] * 1.002, 1.0);
            nucColArr[i * 3 + 2] = Math.max(nucColArr[i * 3 + 2] * 0.995, 0.4);
          }
        }
        nucleusRef.current.geometry.attributes.position.needsUpdate = true;
        if (isResponding) nucCol.needsUpdate = true;
        nucleusRef.current.rotation.y -= 0.001;
      }

      if (atmosphereRef.current) {
        const posAttr = atmosphereRef.current.geometry.attributes.position;
        const arr = posAttr.array as Float32Array;
        const aPhases = atmosphereData.phases;
        for (let i = 0; i < N_ATM; i++) {
          arr[i * 3] += Math.sin(t * 0.4 + aPhases[i * 3]) * 0.0015;
          arr[i * 3 + 1] += Math.cos(t * 0.3 + aPhases[i * 3 + 1]) * 0.0015;
          arr[i * 3 + 2] += Math.sin(t * 0.5 + aPhases[i * 3 + 2]) * 0.001;
          const r2 = arr[i * 3] ** 2 + arr[i * 3 + 1] ** 2 + arr[i * 3 + 2] ** 2;
          if (r2 > 12.96 || r2 < 6.76) {
            seedAtm(i, arr, aPhases);
          }
        }
        posAttr.needsUpdate = true;
      }
    }

    if (voiceWaveRef.current && waveLevelsRef.current && waveTargetsRef.current) {
      const waveUpdateChance = isResponding ? 1.0 : isListening ? 0.33 : isThinking ? 0.017 : 0.05;
      const waveAmplitude = isResponding ? 0.5 : isThinking ? 0.4 : isListening ? 0.6 : 0.25;

      if (rng() < waveUpdateChance) {
        for (let i = 0; i < N_WAVE; i++) {
          if (isListening) {
            waveTargetsRef.current[i] = rng() * waveAmplitude + 0.1;
          } else {
            waveTargetsRef.current[i] = rng() * waveAmplitude + 0.05;
          }
        }
      }

      const wp = voiceWaveRef.current.geometry.attributes.position;
      const wc = voiceWaveRef.current.geometry.attributes.color;
      const arr = wp.array as Float32Array;
      const wcArr = wc.array as Float32Array;
      for (let i = 0; i < N_WAVE; i++) {
        waveLevelsRef.current[i] += (waveTargetsRef.current[i] - waveLevelsRef.current[i]) * 0.08;
        const a = (i / N_WAVE) * Math.PI * 2 + t * 0.05;
        const r0 = 2.82;
        const r1 = 2.92 + waveLevelsRef.current[i];
        arr[i * 6] = Math.cos(a) * r0;
        arr[i * 6 + 1] = Math.sin(a) * r0;
        arr[i * 6 + 2] = 0;
        arr[i * 6 + 3] = Math.cos(a) * r1;
        arr[i * 6 + 4] = Math.sin(a) * r1;
        arr[i * 6 + 5] = 0;

        if (isError) {
          wcArr[i * 6] = 1;
          wcArr[i * 6 + 1] = 0.3;
          wcArr[i * 6 + 2] = 0.1;
          wcArr[i * 6 + 3] = 1;
          wcArr[i * 6 + 4] = 0.4;
          wcArr[i * 6 + 5] = 0.1;
        } else if (isListening) {
          wcArr[i * 6] = 0.3;
          wcArr[i * 6 + 1] = 0.9;
          wcArr[i * 6 + 2] = 1;
          wcArr[i * 6 + 3] = 0.5;
          wcArr[i * 6 + 4] = 1;
          wcArr[i * 6 + 5] = 1;
        } else {
          wcArr[i * 6] = 0;
          wcArr[i * 6 + 1] = 0.8;
          wcArr[i * 6 + 2] = 1;
          wcArr[i * 6 + 3] = 0;
          wcArr[i * 6 + 4] = 0.8;
          wcArr[i * 6 + 5] = 1;
        }
      }
      wp.needsUpdate = true;
      wc.needsUpdate = true;
    }
  });

  const orbGroupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (orbGroupRef.current) {
      const t = Date.now() * 0.001;
      const pulseAmp = stateRef.current === "responding" ? 0.04 : 0.02;
      const pulse = 1 + Math.sin(t * 1.5) * pulseAmp;
      orbGroupRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <group ref={orbGroupRef}>
      <points ref={surfaceRef} geometry={surfaceGeo}>
        <pointsMaterial size={0.08} vertexColors transparent opacity={1.0} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <points ref={innerRef} geometry={innerGeo}>
        <pointsMaterial size={0.045} vertexColors transparent opacity={0.55} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <points ref={nucleusRef} geometry={nucleusGeo}>
        <pointsMaterial size={0.08} vertexColors transparent opacity={1.0} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <points ref={atmosphereRef} geometry={atmosphereGeo}>
        <pointsMaterial size={0.035} vertexColors transparent opacity={0.6} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
      </points>
      <lineSegments ref={voiceWaveRef} geometry={waveGeo}>
        <lineBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </lineSegments>
      <ambientLight color={0x001133} intensity={0.5} />
      <pointLight color={0x00c8ff} intensity={2} distance={10} />
    </group>
  );
}
