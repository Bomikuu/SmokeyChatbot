import { readFile, writeFile, mkdir, cp, access, rename, rm, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const args = process.argv.slice(2),
  value = (name) => {
    const candidate = args[args.indexOf(name) + 1];
    if (!candidate || candidate.startsWith("--")) throw new Error("Missing value for " + name);
    return candidate;
  };
const version = args.includes("--version") ? value("--version") : "";
if (!/^\d+\.\d+\.\d+$/.test(version))
  throw new Error(
    "Provide --version with a semantic version. This command packages an existing build.",
  );
const dashboard = fileURLToPath(new URL("../", import.meta.url));
const source = path.resolve(
    args.includes("--source") ? value("--source") : path.join(dashboard, "dist-module"),
  ),
  output = path.resolve(
    args.includes("--output") ? value("--output") : path.join(dashboard, "../releases/ui"),
  );
const manifest = JSON.parse(await readFile(path.join(source, ".vite/manifest.json"), "utf8"));
const entry =
  manifest["src/sdk/index.ts"] ||
  Object.values(manifest).find((item) => item.isEntry && item.name === "smokey");
if (!entry?.file || !entry.file.endsWith(".mjs"))
  throw new Error("The module build has no browser ESM entry.");
const walk = async (dir) => {
  const files = [];
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...(await walk(file)));
    else files.push(file);
  }
  return files;
};
const css = (await walk(source)).filter((file) => file.endsWith(".css"));
if (css.length !== 1) throw new Error("Expected one shared assistant stylesheet.");
const destination = path.join(output, "releases", version),
  staging = destination + ".staging-" + process.pid;
try {
  await access(destination);
  throw new Error("This immutable release already exists. Use a new version.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir(path.dirname(destination), { recursive: true });
try {
  await cp(source, staging, { recursive: true });
  await mkdir(path.join(staging, "assets"), { recursive: true });
  await cp(
    path.join(dashboard, "public/office-cat-sprite.webp"),
    path.join(staging, "assets/office-cat-sprite.webp"),
  );
  const prefix = "../releases/" + version + "/";
  const release = {
    schemaVersion: 1,
    release: version,
    adapter: { major: 1, minMinor: 0 },
    hostApi: { major: 1, minMinor: 0 },
    entry: prefix + entry.file,
    stylesheet: prefix + path.relative(source, css[0]).split(path.sep).join("/"),
    assets: prefix + "assets/",
  };
  await writeFile(path.join(staging, "release.json"), JSON.stringify(release, null, 2) + "\n");
  await rename(staging, destination);
  if (args.includes("--promote")) {
    const channels = path.join(output, "channels");
    await mkdir(channels, { recursive: true });
    const channel = path.join(channels, "stable-v1.json");
    try {
      await cp(channel, path.join(channels, "previous-v1.json"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const temporary = channel + ".tmp-" + process.pid;
    await writeFile(temporary, JSON.stringify(release, null, 2) + "\n");
    await rename(temporary, channel);
  }
  console.log(
    JSON.stringify({ release: version, destination, promoted: args.includes("--promote") }),
  );
} catch (error) {
  await rm(staging, { recursive: true, force: true });
  throw error;
}
