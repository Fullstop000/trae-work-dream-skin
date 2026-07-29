import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { buildPayload } from "../packages/cli/runtime/injector.mjs";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNTIME = path.join(ROOT, "packages/cli/runtime");
const THEMES = path.join(ROOT, "themes");
const SKIN = fs.readFileSync(path.join(RUNTIME, "skin.js"), "utf8");
const RUNTIME_MANIFEST = JSON.parse(fs.readFileSync(path.join(RUNTIME, "manifest.json"), "utf8"));
const RUNTIME_STYLES = ["base.css", "manager.css"]
  .map((file) => fs.readFileSync(path.join(RUNTIME, "styles", file), "utf8"))
  .join("\n");

test("runtime styles are single-source files and produce a valid injection payload", () => {
  const payload = buildPayload({ themesDir: THEMES, defaultTheme: "eva-01" });
  assert.doesNotThrow(() => new Function(payload));
  assert.doesNotMatch(payload, /__(?:BASE_CSS|MANAGER_CSS|CATALOG|DEFAULT_THEME|VERSION)__/);
  assert.match(payload, /trae-dream-skin-panel/);
  assert.match(payload, /EVA-01\s+\/\s+ENTRY LINK/);
});

test("runtime payload uses the packaged runtime version", () => {
  const injector = fs.readFileSync(path.join(RUNTIME, "injector.mjs"), "utf8");
  const payload = buildPayload({ themesDir: THEMES, defaultTheme: "eva-01" });
  assert.match(injector, /manifest\.json/);
  assert.match(payload, new RegExp(`const VERSION = ${JSON.stringify(RUNTIME_MANIFEST.packageVersion)}`));
});

test("core skin contains no theme-specific selectors", () => {
  assert.ok(Buffer.byteLength(SKIN) < 64 * 1024, `skin.js is ${Buffer.byteLength(SKIN)} bytes`);
  assert.doesNotMatch(SKIN, /body\.trae-skin-theme-/);
  assert.match(SKIN, /backgroundBrightness: \(value\)/);
  assert.match(SKIN, /mainOverlayOpacity: \(value\)/);
  assert.match(SKIN, /background-brightness:/);
  assert.match(SKIN, /main-overlay-opacity:/);
  assert.match(fs.readFileSync(path.join(RUNTIME, "styles/base.css"), "utf8"), /主内容面板/);
  const managerCss = fs.readFileSync(path.join(RUNTIME, "styles/manager.css"), "utf8");
  assert.match(managerCss, /#trae-dream-skin-panel/);
  assert.match(managerCss, /\.ds-slider::-webkit-slider-thumb/);
});

test("runtime CSS variables have token or component mapping producers", () => {
  const references = [...RUNTIME_STYLES.matchAll(/var\((--trae-skin-[\w-]+)([^)]*)\)/g)]
    .filter(([, , fallback]) => !fallback.trimStart().startsWith(","))
    .map(([, name]) => name);
  const producers = new Set(
    [...SKIN.matchAll(/setVar\([`"](--trae-skin-[\w-]+)/g)].map(([, name]) => name),
  );
  const cssDefined = new Set(
    [...RUNTIME_STYLES.matchAll(/(--trae-skin-[\w-]+)\s*:/g)].map(([, name]) => name),
  );
  for (const slot of ["left", "chat", "main", "landing"]) {
    for (const suffix of ["surface", "blur", "saturation"]) {
      producers.add(`--trae-skin-${slot}-${suffix}`);
    }
  }

  const missing = [...new Set(references)]
    .filter((name) => !producers.has(name) && !cssDefined.has(name))
    .sort();
  assert.deepEqual(missing, [], `runtime CSS references unmapped variables: ${missing.join(", ")}`);
});

test("automatic theme sync is silent and follows the Catalog check interval", () => {
  const injector = fs.readFileSync(path.join(RUNTIME, "injector.mjs"), "utf8");
  assert.match(injector, /function catalogCheckIntervalMs\(\)/);
  assert.match(injector, /handleThemeSync\("auto-sync", \{ silent: true \}\)/);
  assert.doesNotMatch(injector, /nextAutomaticThemeSyncAt = Date\.now\(\) \+ 60_000/);
});

test("theme-specific component CSS stays with its theme", () => {
  for (const id of ["eva-01", "eva-01-light", "xianzhou-luofu"]) {
    const css = fs.readFileSync(path.join(THEMES, id, "theme.css"), "utf8");
    assert.match(css, new RegExp(`body\\.trae-skin-theme-${id.replaceAll("-", "-")}`));
  }
});
