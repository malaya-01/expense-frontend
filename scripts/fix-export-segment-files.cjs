/**
 * Works around a Next.js 16 static-export bug on Windows.
 *
 * `next build` with `output: "export"` writes per-segment RSC prefetch files as
 * `<route>/__next.<segment path with "/" replaced by ".">.txt`, and the client
 * router requests exactly that flat name. On Windows the segment path is built
 * with `path.relative()`, so it contains backslashes, which are not replaced
 * and become directories:
 *
 *   expected: out/signup/__next.!KGF1dGgp.signup.__PAGE__.txt
 *   written:  out/signup/__next.!KGF1dGgp/signup/__PAGE__.txt
 *
 * Every client navigation then 404s on its segment data and falls back to a
 * full page load, which inside the Capacitor app always serves the root
 * index.html. This script flattens those nested files to the expected names.
 * It is a no-op for exports built on macOS/Linux.
 *
 * Usage: node scripts/fix-export-segment-files.cjs [outDir=out]
 */
const fs = require("fs");
const path = require("path");

const outDir = path.resolve(process.argv[2] || "out");

function listFiles(dir, prefix = "") {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(abs, rel));
    else files.push({ abs, rel });
  }
  return files;
}

let flattened = 0;

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    if (entry.name.startsWith("__next.") || entry.name === "__next") {
      for (const file of listFiles(abs)) {
        const flatName = `${entry.name}.${file.rel.replace(/\//g, ".")}`;
        const dest = path.join(dir, flatName);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(file.abs, dest);
          flattened += 1;
        }
      }
      fs.rmSync(abs, { recursive: true, force: true });
      continue;
    }
    if (entry.name === "_next") continue; // static assets, never segment data
    walk(abs);
  }
}

if (!fs.existsSync(outDir)) {
  console.error(`[fix-export-segment-files] ${outDir} does not exist`);
  process.exit(1);
}

walk(outDir);
console.log(
  `[fix-export-segment-files] ${flattened ? `flattened ${flattened} segment file(s)` : "nothing to fix"} in ${outDir}`,
);
