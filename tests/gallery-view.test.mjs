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

test("restore confirmation returns to its default button state after confirmation", () => {
  const handlerStart = SKIN.indexOf('resetConfig.addEventListener("click"');
  const handlerEnd = SKIN.indexOf("const activateTheme", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, "restore confirmation handler is missing");
  const handler = SKIN.slice(handlerStart, handlerEnd);
  const disarm = handler.indexOf("disarmReset();");
  const restore = handler.indexOf("restoreNativeTheme();");
  assert.ok(disarm >= 0, "restore confirmation does not reset its armed state");
  assert.ok(restore > disarm, "restore confirmation must reset before restoring the native theme");
});

test("Theme Manager exposes Catalog update status and automatic-update control", () => {
  assert.match(SKIN, /ds-sync-banner/);
  assert.match(SKIN, /requestThemeSync\("check"\)/);
  assert.match(SKIN, /requestThemeSync\("sync"\)/);
  assert.match(SKIN, /自动更新官方主题/);
  assert.match(SKIN, /trae-dream-skin-sync-state/);
});
