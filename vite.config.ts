import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: resolve(root, "public"),
  publicDir: false,
  build: {
    outDir: resolve(root, "dist"),
    emptyOutDir: true,
  },
});