// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// When deploying to Vercel, we must:
// 1. Disable the @cloudflare/vite-plugin (it overrides TanStack Start's preset)
// 2. Use TanStack Start's built-in 'vercel' preset
// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
const isVercel = !!process.env.VERCEL;

export default defineConfig({
  // Disable Cloudflare plugin on Vercel — it overrides the vercel preset
  cloudflare: isVercel ? false : undefined,
  tanstackStart: {
    server: {
      preset: isVercel ? "vercel" : undefined,
      entry: "server",
    },
  },
});
