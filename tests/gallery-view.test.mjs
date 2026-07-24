import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKIN = fs.readFileSync(path.join(ROOT, "packages/cli/runtime/skin.js"), "utf8");

test("theme categories are hidden while viewing the current theme config", () => {
  assert.match(SKIN, /tabsBar\.style\.display = configOpen \? "none" : "";/);
});
