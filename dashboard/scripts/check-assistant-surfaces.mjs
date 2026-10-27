import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { withModules } from "./assistant-check-tools.mjs";
const css = await readFile(new URL("../src/styles/assistant.css", import.meta.url), "utf8");
assert.ok(css.includes(":host"));
const documentCss = await readFile(new URL("../src/styles/document.css", import.meta.url), "utf8");
assert.ok(css.includes('@import "./shared.css"'));
assert.ok(css.includes('@import "./shadow-properties.css"'));
const shadowDefaults = await readFile(
  new URL("../src/styles/shadow-properties.css", import.meta.url),
  "utf8",
);
assert.ok(shadowDefaults.includes("--tw-border-style: solid"));
assert.ok(shadowDefaults.includes("--tw-translate-z: 0"));
assert.ok(!documentCss.includes("shadow-properties.css"));
assert.ok(documentCss.includes('@import "./shared.css"'));
assert.ok(!/(^|\n)\s*(body|html|:root)\s*\{/.test(css));
for (const name of ["dialog", "sheet", "select", "alert-dialog"]) {
  const source = await readFile(
    new URL("../src/components/ui/" + name + ".tsx", import.meta.url),
    "utf8",
  );
  assert.ok(source.includes("useOverlayContainer"));
  assert.ok(source.includes("container={container}"));
}
const moduleEntry = await readFile(new URL("../src/sdk/index.ts", import.meta.url), "utf8");
assert.ok(moduleEntry.includes("assistant.css?inline"));
assert.ok(!moduleEntry.includes("import '../styles/assistant.css';"));
// Minimal DOM contract fixture; this deliberately does not simulate layout or focus.
class Node {
  constructor() {
    this.childNodes = [];
    this.dataset = {};
    this.style = {};
    this.classes = new Set();
    this.classList = {
      toggle: (value, active) => (active ? this.classes.add(value) : this.classes.delete(value)),
    };
  }
  append(...nodes) {
    this.childNodes.push(...nodes);
  }
  replaceChildren(...nodes) {
    this.childNodes = nodes;
  }
  attachShadow() {
    this.shadowRoot = new Node();
    return this.shadowRoot;
  }
}
class Link extends Node {}
const savedDocument = globalThis.document,
  savedLink = globalThis.HTMLLinkElement;
globalThis.document = { createElement: (name) => (name === "link" ? new Link() : new Node()) };
globalThis.HTMLLinkElement = Link;
try {
  await withModules(async (load) => {
    const { createSmokeySurface } = await load("sdk/surface.ts");
    const { resolveAssistantAsset } = await load("sdk/assets.ts");
    const first = new Node(),
      second = new Node(),
      foreign = new Node();
    foreign.append(new Node());
    const a = createSmokeySurface(first, "/smokey-assets/releases/1.0.0/styles.css"),
      b = createSmokeySurface(second, "", "inline");
    assert.notEqual(a.portal, b.portal);
    a.setTheme("dark");
    assert.ok(a.portal.classes.has("dark"));
    assert.ok(!b.portal.classes.has("dark"));
    assert.throws(() => createSmokeySurface(foreign, "", ""));
    assert.throws(() => createSmokeySurface(first, "", ""));
    a.destroy();
    assert.equal(first.shadowRoot.childNodes.length, 0);
    assert.equal(second.shadowRoot.childNodes.length, 3);
    assert.equal(foreign.childNodes.length, 1);
    createSmokeySurface(first, "", "").destroy();
    b.destroy();
    assert.equal(
      resolveAssistantAsset("office-cat-sprite.webp", "/smokey-assets/releases/1.0.0/assets/"),
      "http://localhost/smokey-assets/releases/1.0.0/assets/office-cat-sprite.webp",
    );
  });
} finally {
  if (savedDocument === undefined) delete globalThis.document;
  else globalThis.document = savedDocument;
  if (savedLink === undefined) delete globalThis.HTMLLinkElement;
  else globalThis.HTMLLinkElement = savedLink;
}
console.log(
  "Assistant surfaces: isolated owned nodes, themes, assets and canonical portals passed (keyboard/visual behavior unverified).",
);
