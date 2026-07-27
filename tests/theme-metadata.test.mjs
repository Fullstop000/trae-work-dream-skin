import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const THEMES = path.join(ROOT, "themes");
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:[-+][0-9A-Za-z.-]+)?$/;
const RANGE = /^>=\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\s+<\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

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
