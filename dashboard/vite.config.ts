import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    server: {
      host: "127.0.0.1",
      port: 5173,
      strictPort: true,
      proxy: {
        "/business-api": {
          target: env.SMOKEY_PIXELCORE_API_ORIGIN || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/business-api/, "/api"),
          // Keep the standalone refresh session separate from PixelCore's own cookie.
          cookiePathRewrite: "/business-api/auth/",
          cookieDomainRewrite: "",
        },
        "/api": {
          target: env.SMOKEY_WEBSITE_API_ORIGIN || "http://127.0.0.1:8001",
          changeOrigin: true,
        },
      },
    },
  };
});
