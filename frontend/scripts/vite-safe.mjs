#!/usr/bin/env node

process.env.WORKHUB_NO_ESBUILD = process.env.WORKHUB_NO_ESBUILD || "1";

if (!process.argv.includes("--configLoader")) {
  process.argv.push("--configLoader", "runner");
}

await import("./vite-safe-spawn.mjs");
await import("../node_modules/vite/bin/vite.js");
