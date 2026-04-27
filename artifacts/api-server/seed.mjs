import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build as esbuild } from "esbuild";

globalThis.require = createRequire(import.meta.url);

const artifactDir = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.resolve(artifactDir, "dist/seed.mjs");

await esbuild({
  entryPoints: [path.resolve(artifactDir, "src/seed.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: outFile,
  logLevel: "info",
  external: ["*.node", "pg-native"],
  banner: {
    js: `import { createRequire as __bannerCrReq } from 'node:module';
import __bannerPath from 'node:path';
import __bannerUrl from 'node:url';
globalThis.require = __bannerCrReq(import.meta.url);
globalThis.__filename = __bannerUrl.fileURLToPath(import.meta.url);
globalThis.__dirname = __bannerPath.dirname(globalThis.__filename);
`,
  },
});

const { spawn } = await import("node:child_process");
const child = spawn(
  process.execPath,
  ["--env-file-if-exists=.env", outFile],
  { stdio: "inherit", cwd: artifactDir },
);
child.on("exit", (code) => process.exit(code ?? 0));
