import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THEMES = path.join(ROOT, "themes");
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$/;
const RANGE = /^>=\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\s+<\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const DARK_ART_THEMES = ["mono", "aurora", "forest", "ocean", "sakura", "sunset"];

test("official theme manifests declare a content version and CLI compatibility", () => {
  const manifests = fs.readdirSync(THEMES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(THEMES, entry.name, "theme.json"))
    .filter((file) => fs.existsSync(file));
  assert.ok(manifests.length >= 10);
  for (const file of manifests) {
    const theme = JSON.parse(fs.readFileSync(file, "utf8"));
    assert.match(theme.version || "", SEMVER, `${file} needs a SemVer version`);
    assert.match(theme.engines?.twskin || "", RANGE, `${file} needs engines.twskin`);
  }
});

test("dark art themes keep dark semantic surfaces and complete interaction roles", () => {
  for (const id of DARK_ART_THEMES) {
    const file = path.join(THEMES, id, "theme.json");
    const theme = JSON.parse(fs.readFileSync(file, "utf8"));

    // These backgrounds intentionally use dark artwork. A light App contract would
    // reintroduce dark text and white fog panels outside the main reading surface.
    assert.equal(theme.appearance, "dark", `${id} needs a dark appearance contract`);
    assert.ok(theme.background?.color, `${id} needs an explicit background base color`);
    assert.ok(theme.surfaces?.colors?.left && theme.surfaces?.colors?.chat && theme.surfaces?.colors?.main && theme.surfaces?.colors?.landing, `${id} needs all panel surfaces`);
    assert.ok(theme.surfaces?.opacity?.left >= 0.8, `${id} sidebar needs an opaque reading surface`);

    for (const group of ["accent", "surface", "text", "icons", "border", "state"]) {
      assert.ok(theme.tokens?.[group], `${id} needs tokens.${group}`);
    }
    assert.ok(theme.components?.chat && theme.components?.popover && theme.components?.settings, `${id} needs chat, popover, and settings state surfaces`);
    assert.ok(theme.elevation?.focusRing, `${id} needs a visible focus ring`);
  }
});
