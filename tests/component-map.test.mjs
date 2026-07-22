import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import vm from "node:vm";

const loadUmd = (path) => {
  const code = readFileSync(new URL(path, import.meta.url), "utf8");
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(code, sandbox);
  return sandbox.module.exports;
};
const CM = loadUmd("../component-map.mjs");
const TM = loadUmd("../token-map.mjs");

const ROLES = {
  accent: { base: "#b6f52c", subtle: "#b6f52c24" },
  surface: { secondary: "#111013", card: "#151217", cardHover: "#251b27", tertiary: "#201a22" },
  text: { primary: "#f0ebec", secondary: "#beb4b7", tertiary: "#8b8084" },
  border: { default: "#9b697a70" },
  state: { success: "#b6f52c" },
};

test("组件槽位缺省时保留 App 原生变体", () => {
  const c = CM.deriveComponents({}, ROLES);
  assert.equal(c.banner.variant, "default");
  assert.equal(c.modeTabs.variant, "default");
  assert.equal(c.modeTabs.content.iconPolicy, "active");
  assert.equal(c.modeTabs.content.showModeCode, false);
  assert.equal(c.banner.colors.surface, ROLES.surface.card);
});

test("system-plate 与 launch-rail 分层配置完整映射", () => {
  const c = CM.deriveComponents({
    landing: { banner: {
      variant: "system-plate",
      colors: { surface: "#120d17ed", accent: "#b6f52c" },
      metrics: { cornerCutPx: 18 },
      effects: { shadow: "0 18px 46px #00000085, inset 0 1px #ffffff0a" },
      content: {
        statusText: "READY",
        modes: {
          work: { code: "W1", label: "OPS" },
          code: { code: "C2", label: "SYSTEMS" },
          design: { code: "D3", label: "SYNTHESIS" },
        },
      },
    } },
    navigation: { modeTabs: {
      variant: "launch-rail",
      metrics: { tabWidthPx: 92 },
      content: { iconPolicy: "always", showModeCode: true },
    } },
  }, ROLES);
  assert.equal(c.banner.variant, "system-plate");
  assert.equal(c.banner.content.modes.code.code, "C2");
  assert.equal(c.banner.content.modes.design.label, "SYNTHESIS");
  assert.equal(c.banner.content.statusText, "READY");
  assert.equal(c.banner.metrics.cornerCutPx, 18);
  assert.equal(c.banner.effects.shadow, "0 18px 46px #00000085, inset 0 1px #ffffff0a");
  assert.equal(c.modeTabs.variant, "launch-rail");
  assert.equal(c.modeTabs.content.iconPolicy, "always");
  assert.equal(c.modeTabs.content.showModeCode, true);
  assert.equal(c.modeTabs.metrics.tabWidthPx, 92);
});

test("未知变体、错误类型与越界尺寸安全回退", () => {
  const c = CM.deriveComponents({
    landing: { banner: { variant: "arbitrary-css", metrics: { cornerCutPx: 999, maxWidthPx: 12 } } },
    navigation: { modeTabs: {
      variant: "unknown",
      metrics: { heightPx: 99, tabWidthPx: 4 },
      content: { iconPolicy: "sometimes", showModeCode: "false" },
    } },
  }, ROLES);
  assert.equal(c.banner.variant, "default");
  assert.equal(c.banner.metrics.cornerCutPx, 40);
  assert.equal(c.banner.metrics.maxWidthPx, 320);
  assert.equal(c.modeTabs.variant, "default");
  assert.equal(c.modeTabs.content.iconPolicy, "active");
  assert.equal(c.modeTabs.content.showModeCode, false);
  assert.equal(c.modeTabs.metrics.heightPx, 56);
  assert.equal(c.modeTabs.metrics.tabWidthPx, 64);
});

test("颜色、阴影和装饰文本经过封闭校验", () => {
  const c = CM.deriveComponents({
    landing: { banner: {
      variant: "system-plate",
      colors: { surface: "url(https://example.test/x)", border: "#abcd", accent: "#abc" },
      effects: { shadow: "0 0 3px red; color: hotpink" },
      content: { modes: { work: { code: "01\n02", label: "OPS\u0000TEAM" }, chat: { code: "04" } } },
    } },
    navigation: { modeTabs: {
      variant: "launch-rail",
      colors: { track: "var(--steal)", hover: "rgba(999, 0, 0, 1)" },
      effects: { shadow: "url(https://example.test/filter)" },
    } },
  }, ROLES);
  assert.equal(c.banner.colors.surface, ROLES.surface.card);
  assert.equal(c.banner.colors.border, ROLES.border.default);
  assert.equal(c.banner.colors.accent, "#abc");
  assert.equal(c.banner.effects.shadow, "none");
  assert.equal(c.banner.content.modes.work.code, "01 02");
  assert.equal(c.banner.content.modes.work.label, "OPS TEAM");
  assert.equal("chat" in c.banner.content.modes, false);
  assert.equal(c.modeTabs.colors.track, ROLES.surface.secondary);
  assert.equal(c.modeTabs.colors.hover, ROLES.surface.cardHover);
  assert.equal(c.modeTabs.effects.shadow, "none");
});

test("组件语义对比度配对只包含实际启用的变体", () => {
  assert.equal(CM.getContrastPairs(CM.deriveComponents({}, ROLES)).length, 0);
  const c = CM.deriveComponents({
    landing: { banner: { variant: "system-plate" } },
    navigation: { modeTabs: { variant: "launch-rail" } },
  }, ROLES);
  const pairs = CM.getContrastPairs(c);
  assert.equal(pairs.length, 5);
  assert.equal(pairs[0].minRatio, 4);
  assert.equal(pairs[1].minRatio, 3);
});

test("EVA-01 使用收敛后的 V3 组件槽位", () => {
  const theme = JSON.parse(readFileSync(new URL("../themes/eva-01/theme.json", import.meta.url), "utf8"));
  const c = CM.deriveComponents(theme.components, ROLES);
  assert.equal(c.banner.variant, "system-plate");
  assert.equal(c.banner.colors.surface, "#120d17ed");
  assert.equal(c.banner.effects.shadow, "0 18px 46px #00000085, inset 0 1px #ffffff0a");
  assert.equal(c.banner.content.modes.work.label, "OPERATIONS");
  assert.equal(c.modeTabs.variant, "launch-rail");
  assert.equal(c.modeTabs.colors.hover, "#382142d9");
  assert.equal(c.modeTabs.effects.shadow, "0 10px 28px #00000075, inset 0 1px #ffffff0a");
  assert.equal(c.modeTabs.content.iconPolicy, "always");
  assert.equal(c.modeTabs.content.showModeCode, true);
});

test("所有主题均可派生组件并完成对比度冒烟审计", () => {
  const themesUrl = new URL("../themes/", import.meta.url);
  let count = 0;
  for (const directory of readdirSync(themesUrl)) {
    const themeUrl = new URL(`../themes/${directory}/theme.json`, import.meta.url);
    if (!existsSync(themeUrl)) continue;
    const theme = JSON.parse(readFileSync(themeUrl, "utf8"));
    const roles = TM.deriveRoles(theme.tokens, { appearance: theme.appearance });
    const components = CM.deriveComponents(theme.components, roles);
    const audit = TM.auditPairs(CM.getContrastPairs(components));
    assert.ok(Array.isArray(audit.failures), `${theme.id}: failures 非数组`);
    assert.ok(Array.isArray(audit.unverifiable), `${theme.id}: unverifiable 非数组`);
    count += 1;
  }
  assert.ok(count >= 10, `主题数量异常: ${count}`);
});
