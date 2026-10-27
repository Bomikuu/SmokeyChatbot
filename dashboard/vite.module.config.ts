import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/smokey-assets/dev/" : "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    allowedHosts: ["localhost", ".pixelcore.localhost", "smokey-ui", "nginx"],
    hmr: { clientPort: 80, path: "/smokey-assets/dev/hmr" },
  },
  build: {
    target: "es2022",
    outDir: "dist-module",
    emptyOutDir: true,
    manifest: true,
    cssCodeSplit: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      preserveEntrySignatures: "strict",
      input: {
        smokey: fileURLToPath(new URL("./src/sdk/index.ts", import.meta.url)),
        styles: fileURLToPath(new URL("./src/sdk/releaseStyles.ts", import.meta.url)),
      },
      output: {
        format: "es",
        entryFileNames: "[name].[hash].mjs",
        chunkFileNames: "chunks/[name].[hash].mjs",
        assetFileNames: "assets/[name].[hash][extname]",
      },
    },
  },
}));
