import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const isVercel = !!process.env.VERCEL;

export default defineConfig({
  cloudflare: false,
  tanstackStart: {
    server: {
      preset: isVercel ? "vercel-edge" : undefined,
      entry: "server",
    },
  },
});
