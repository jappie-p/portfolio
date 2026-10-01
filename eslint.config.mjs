import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // R3F scene code: useFrame callbacks run in the render loop, outside React
    // render, and mutate three.js objects (uniforms, materials, instance data)
    // that React never renders from. That is the intended R3F pattern.
    files: ["src/components/{cyber,scenes,canvas,ai,art}/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // the Zelda web build: pygbag output and vendored socket.io, not our source
    "public/play/**",
  ]),
]);

export default eslintConfig;
