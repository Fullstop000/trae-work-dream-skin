import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THEMES = path.join(ROOT, "themes");
const BASE_CSS = fs.readFileSync(path.join(ROOT, "packages/cli/runtime/styles/base.css"), "utf8");
const OWNED_SURFACES = [
  ".task-list-panel",
  ".solo-lite-chat-panel-container",
  ".solo-lite-main-area",
  ".panel-container > .panel-content",
];
const PROTECTED_PROPERTIES = new Set([
  "background",
  "background-color",
  "background-image",
  "background-position",
  "background-repeat",
  "background-size",
  "backdrop-filter",
  "-webkit-backdrop-filter",
]);

function rootSurfaceSelector(selector, surface) {
  const index = selector.indexOf(surface);
  if (index < 0) return false;
  const after = selector.slice(index + surface.length).trim();
  return after === "" || after.startsWith("::");
}

function protectedSurfaceOverrides(css) {
  const rules = css.replaceAll(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g);
  const violations = [];
  for (const [, selectorList, body] of rules) {
    if (selectorList.trim().startsWith("@")) continue;
    const properties = [...body.matchAll(/(?:^|[;\n])\s*([\w-]+)\s*:/g)]
      .map((match) => match[1])
      .filter((property) => PROTECTED_PROPERTIES.has(property));
    if (!properties.length) continue;
    for (const selector of selectorList.split(",").map((item) => item.trim())) {
      for (const surface of OWNED_SURFACES) {
        if (rootSurfaceSelector(selector, surface)) {
          violations.push(`${selector}: ${properties.join(", ")}`);
          break;
        }
      }
    }
  }
  return violations;
}

test("runtime composes theme decoration over every owned layout surface", () => {
  for (const slot of ["left", "chat", "main", "landing"]) {
    assert.match(BASE_CSS, new RegExp(`--trae-skin-${slot}-decoration`));
  }
  assert.match(BASE_CSS, /solo-lite-main-area[\s\S]*?--trae-skin-main-surface/);
  assert.match(BASE_CSS, /monaco-workbench[\s\S]*?--trae-skin-workbench-editor/);
});

test("surface contract rejects a theme that replaces the right workspace", () => {
  const violations = protectedSurfaceOverrides(`
    body.trae-skin-theme-example .solo-lite-main-area {
      background: transparent !important;
      backdrop-filter: none !important;
    }
  `);
  assert.deepEqual(violations, [
    "body.trae-skin-theme-example .solo-lite-main-area: background, backdrop-filter",
  ]);
});

test("official theme CSS cannot replace runtime-owned layout surfaces", () => {
  const styles = fs.readdirSync(THEMES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(THEMES, entry.name, "theme.css"))
    .filter((file) => fs.existsSync(file));
  for (const file of styles) {
    const violations = protectedSurfaceOverrides(fs.readFileSync(file, "utf8"));
    assert.deepEqual(violations, [], `${path.relative(ROOT, file)} bypasses the surface contract`);
  }
});
