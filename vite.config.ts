import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// The export is analyzed in the browser and must never leave it.
// connect-src 'self' makes the browser itself refuse any fetch/XHR/beacon to
// another site, so that promise holds even if a dependency tried to phone
// home. The site's own origin is allowed only for Vercel Web Analytics, which
// posts page views to /_vercel/insights/ (its script is served from there too).
// Only added to production builds: the dev server needs inline scripts and
// a websocket for hot reload.
const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self'",
  // MUI (emotion) injects <style> tags at runtime
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src https://fonts.gstatic.com",
  // The footer avatar redirects from github.com to avatars.githubusercontent.com
  "img-src 'self' data: https://github.com https://avatars.githubusercontent.com",
  "manifest-src 'self'",
  "connect-src 'self'",
  "form-action 'none'",
  "base-uri 'none'",
].join("; ");

const contentSecurityPolicy = (): Plugin => ({
  name: "content-security-policy",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: { "http-equiv": "Content-Security-Policy", content: CONTENT_SECURITY_POLICY },
      injectTo: "head-prepend",
    },
  ],
});

export default defineConfig({
  plugins: [react(), contentSecurityPolicy()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    // Modern browsers preload modules natively, so the fetch()-based polyfill isn't needed
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          mui: ["@mui/material", "@mui/icons-material"],
        },
      },
    },
  },
  server: {
    port: 3000,
  },
});
