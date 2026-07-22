import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildPayload } from "../packages/cli/runtime/injector.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNTIME = path.join(ROOT, "packages/cli/runtime");
const THEMES = path.join(ROOT, "themes");

test("runtime styles are single-source files and produce a valid injection payload", () => {
  const payload = buildPayload({ themesDir: THEMES, defaultTheme: "eva-01" });
  assert.doesNotThrow(() => new Function(payload));
  assert.doesNotMatch(payload, /__(?:BASE_CSS|MANAGER_CSS|CATALOG|DEFAULT_THEME|VERSION)__/);
  assert.match(payload, /trae-dream-skin-panel/);
  assert.match(payload, /EVA-01\s+\/\s+ENTRY LINK/);
});

test("core skin contains no theme-specific selectors", () => {
  const skin = fs.readFileSync(path.join(RUNTIME, "skin.js"), "utf8");
  assert.ok(Buffer.byteLength(skin) < 50 * 1024, `skin.js is ${Buffer.byteLength(skin)} bytes`);
  assert.doesNotMatch(skin, /body\.trae-skin-theme-/);
  assert.match(fs.readFileSync(path.join(RUNTIME, "styles/base.css"), "utf8"), /主内容面板/);
  assert.match(fs.readFileSync(path.join(RUNTIME, "styles/manager.css"), "utf8"), /#trae-dream-skin-panel/);
});

test("theme-specific component CSS stays with its theme", () => {
  for (const id of ["eva-01", "eva-01-light", "xianzhou-luofu"]) {
    const css = fs.readFileSync(path.join(THEMES, id, "theme.css"), "utf8");
    assert.match(css, new RegExp(`body\\.trae-skin-theme-${id.replaceAll("-", "-")}`));
  }
});
