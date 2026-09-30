import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// Next turns a static image import into { src, width, height, blurDataURL };
// Vite would give a bare URL string, which next/image rejects with a blur
// placeholder. Mirror Next's shape so components render in tests.
const staticImages: Plugin = {
  name: "next-static-images",
  enforce: "pre",
  load(id) {
    if (!/\.(webp|png|jpe?g|avif)$/.test(id)) return null;
    const src = `/${path.relative(__dirname, id)}`;
    return `export default ${JSON.stringify({ src, width: 800, height: 600, blurDataURL: "data:image/png;base64,iVBORw0KGgo=" })};`;
  },
};

export default defineConfig({
  plugins: [staticImages, react()],
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
