import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveConfig } from "vite";
const config = await resolveConfig(
  { configFile: fileURLToPath(new URL("../vite.module.config.ts", import.meta.url)) },
  "build",
);
assert.equal(config.build.rollupOptions.preserveEntrySignatures, "strict");
assert.equal(config.build.rollupOptions.external, undefined);
const directory = await mkdtemp(path.join(tmpdir(), "smokey-delivery-"));
try {
  const source = path.join(directory, "fixture"),
    output = path.join(directory, "output");
  await mkdir(path.join(source, ".vite"), { recursive: true });
  await writeFile(path.join(source, "smokey.fixture.mjs"), "export const fixture = true;");
  await writeFile(path.join(source, "styles.fixture.css"), ".fixture {}");
  await writeFile(
    path.join(source, ".vite/manifest.json"),
    JSON.stringify({ "src/sdk/index.ts": { file: "smokey.fixture.mjs", isEntry: true } }),
  );
  const packageScript = new URL("./package-assistant-release.mjs", import.meta.url);
  const run = (version) =>
    execFileSync(
      process.execPath,
      [
        packageScript.pathname,
        "--source",
        source,
        "--output",
        output,
        "--version",
        version,
        "--promote",
      ],
      { stdio: "pipe" },
    );
  run("1.0.0");
  const first = JSON.parse(await readFile(path.join(output, "channels/stable-v1.json"), "utf8"));
  assert.equal(first.entry, "../releases/1.0.0/smokey.fixture.mjs");
  await access(path.join(output, "releases/1.0.0/assets/office-cat-sprite.webp"));
  assert.throws(() => run("1.0.0"));
  run("1.0.1");
  const previous = JSON.parse(
    await readFile(path.join(output, "channels/previous-v1.json"), "utf8"),
  );
  assert.deepEqual(previous, first);
  await access(path.join(output, "releases/1.0.0/smokey.fixture.mjs"));
  console.log(
    "Assistant delivery: synthetic fixture packaging, immutable versions and retained rollback pointer passed. No application build or real channel promotion.",
  );
} finally {
  await rm(directory, { recursive: true, force: true });
}
