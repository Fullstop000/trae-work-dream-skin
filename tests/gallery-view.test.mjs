import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SKIN = fs.readFileSync(path.join(ROOT, "packages/cli/runtime/skin.js"), "utf8");

test("theme categories are shown only in the gallery view", () => {
  assert.match(SKIN, /tabsBar\.style\.display = view === "gallery" \? "" : "none";/);
  assert.match(SKIN, /galleryView\.style\.display = view === "gallery" \? "" : "none";/);
  assert.match(SKIN, /globalView\.style\.display = view === "global" \? "block" : "none";/);
  assert.doesNotMatch(SKIN, /catalogToolbar/);
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
  assert.match(SKIN, /syncButton\.textContent = "检查更新"/);
  assert.match(SKIN, /checkLabel\.textContent = "检查官方主题更新"/);
  assert.match(SKIN, /requestThemeSync\("check"\)/);
  assert.match(SKIN, /requestThemeSync\("sync"\)/);
  assert.match(SKIN, /自动更新官方主题/);
  assert.match(SKIN, /trae-dream-skin-sync-state/);
});

test("Theme Manager separates panel, Catalog, local, and card actions", () => {
  assert.match(SKIN, /headerActions\.append\(configToggle, globalToggle, closeButton\)/);
  assert.match(SKIN, /configToggle\.textContent = "当前主题"/);
  assert.match(SKIN, /globalToggle\.setAttribute\("aria-label", "主题库设置"\)/);
  assert.doesNotMatch(SKIN, /catalogSettingsButton/);
  assert.match(SKIN, /globalTitle\.textContent = "主题库设置"/);
  assert.match(SKIN, /localThemesLabel\.textContent = "本地主题"/);
  assert.match(SKIN, /reloadButton\.textContent = "重新扫描本地主题"/);
  assert.match(SKIN, /badge\.textContent = "当前主题"/);
});

test("Theme settings contains only current-theme controls", () => {
  const viewStart = SKIN.indexOf("configView.append(");
  const viewEnd = SKIN.indexOf("globalView.append(", viewStart);
  assert.ok(viewStart >= 0 && viewEnd > viewStart, "theme settings view is missing");
  const themeSettings = SKIN.slice(viewStart, viewEnd);
  assert.doesNotMatch(themeSettings, /updateRow/);
  assert.doesNotMatch(themeSettings, /localThemesRow/);
  assert.match(SKIN, /globalView\.append\(globalHead, syncBanner, checkRow, updateRow, localThemesRow, restoreRow\)/);
});

test("Theme Manager keeps an up-to-date Catalog state quiet", () => {
  assert.doesNotMatch(SKIN, /已是最新/);
  assert.match(SKIN, /checkDesc\.textContent = checkStatusCopy/);
  assert.match(SKIN, /globalToggle\.classList\.toggle\("ds-global-pending", updateCount > 0\)/);
  assert.match(SKIN, /const SUCCESS_FEEDBACK_DURATION_MS = 4000/);
});
