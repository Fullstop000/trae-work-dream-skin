// token-map 单元测试：node --test tests/*.test.mjs
// token-map.mjs 是 UMD 文本（要内嵌进页面载荷，不能有 ESM 语法），用 vm 加载
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync(new URL("../packages/cli/runtime/token-map.mjs", import.meta.url), "utf8");
const vscodeCoreFixture = JSON.parse(readFileSync(new URL("../fixtures/vscode-core-vars.json", import.meta.url), "utf8"));
const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(code, sandbox);
const TM = sandbox.module.exports;

const SAMPLE = {
  appearance: "dark",
  accent: { base: "#f4e900" },
  surface: { base: "#070b11", card: "#09131e" },
  text: { primary: "#edf4f7" },
  state: { error: "#ff244d" },
};

const LIGHT_SAMPLE = {
  appearance: "light",
  accent: { base: "#7c9cff" },
  surface: { base: "#ffffff" },
  text: { primary: "#171717" },
};

test("deriveRoles 补全派生值", () => {
  const r = TM.deriveRoles(SAMPLE);
  assert.equal(r.accent.base, "#f4e900");
  assert.match(r.accent.hover, /^color-mix\(in srgb, #f4e900 82%, white\)$/);
  assert.match(r.accent.active, /^color-mix\(in srgb, #f4e900 82%, black\)$/);
  assert.match(r.accent.subtle, /^rgba\(244, 233, 0, 0.18\)$/);
  // 明黄色 accent 上应自动选深色文字
  assert.equal(r.accent.onAccent, "#000000");
  // 未提供的 surface/text 有默认
  assert.ok(r.surface.secondary);
  assert.ok(r.text.secondary);
});

test("扇出覆盖全部普查命名空间", () => {
  const map = TM.buildVarMap(SAMPLE);
  const expected = [];
  for (const s of TM.NS_BG) expected.push(`--bg-bg-${s}`);
  for (const s of TM.NS_TEXT) expected.push(`--text-text-${s}`);
  for (const s of TM.NS_ICON) expected.push(`--icon-icon-${s}`);
  for (const s of TM.NS_BORDER) expected.push(`--border-border-${s}`);
  for (const s of TM.ICUBE_BG) expected.push(`--vscode-icube--bg-bg-${s}`);
  for (const s of TM.ICUBE_TEXT) expected.push(`--vscode-icube--text-text-${s}`);
  for (const s of TM.ICUBE_ICON) expected.push(`--vscode-icube--icon-icon-${s}`);
  for (const s of TM.ICUBE_BORDER) expected.push(`--vscode-icube--border-border-${s}`);
  for (const s of TM.RAS_BG) expected.push(`--ras-bg-bg-${s}`);
  for (const s of TM.RAS_TEXT) expected.push(`--ras-text-text-${s}`);
  for (const s of TM.RAS_ICON) expected.push(`--ras-icon-icon-${s}`);
  for (const s of TM.RAS_BORDER) expected.push(`--ras-border-border-${s}`);
  expected.push(...TM.VSCODE_CORE);
  for (const k of TM.ICUBE_STATUS_KINDS) {
    for (const p of TM.ICUBE_STATUS_PARTS) {
      expected.push(`--vscode-icube--status-${k}-${p}`, `--ras-status-${k}-${p}`);
    }
  }
  for (const [stop] of TM.RAMP_STOPS) {
    expected.push(`--brand-brand-${stop}`, `--brand-brand-grey-${stop}`);
  }
  const missing = expected.filter((name) => !(name in map));
  assert.deepEqual(missing, [], `缺失映射: ${missing.join(", ")}`);
});

test("扇出值无 undefined/空串/非法 color-mix", () => {
  const map = TM.buildVarMap(SAMPLE);
  for (const [name, value] of Object.entries(map)) {
    assert.ok(value != null && value !== "", `${name} 为空`);
    assert.ok(!String(value).includes("undefined"), `${name} 含 undefined: ${value}`);
    if (String(value).startsWith("color-mix")) {
      assert.match(value, /^color-mix\(in srgb, .+ \d+(\.\d+)?%, (white|black|transparent)\)$/);
    }
  }
});

test("关键映射值正确", () => {
  const map = TM.buildVarMap(SAMPLE);
  assert.equal(map["--bg-bg-base-default"], "#070b11");
  assert.equal(map["--bg-bg-card"], "#09131e");
  assert.equal(map["--text-text-default"], "#edf4f7");
  assert.equal(map["--vscode-icube--text-text-default"], "#edf4f7");
  assert.equal(map["--vscode-icube--bg-bg-menu-tr0"], "rgba(9, 19, 30, 0)");
  assert.equal(map["--ras-bg-bg-brand"], "#f4e900");
  assert.equal(map["--brand-brand-500"], "#f4e900");
  assert.match(map["--brand-brand-100"], /^color-mix\(in srgb, #f4e900 16%, white\)$/);
  assert.match(map["--brand-brand-900"], /^color-mix\(in srgb, #f4e900 34%, black\)$/);
  assert.equal(map["--vscode-icube--status-primary-default"], "#f4e900");
  assert.equal(map["--vscode-icube--status-error-default"], "#ff244d");
  assert.equal(map["--border-border-neutral-l3"], map["--bg-bg-overlay-l4"]);
});

test("旧版 VS Code 核心变量桥接到 V3 语义角色", () => {
  const map = TM.buildVarMap(SAMPLE);
  const roles = TM.deriveRoles(SAMPLE);
  assert.equal(new Set(TM.VSCODE_CORE).size, TM.VSCODE_CORE.length, "VSCODE_CORE 含重复变量");
  assert.deepEqual([...TM.VSCODE_CORE], vscodeCoreFixture, "运行时桥接清单与协议普查存档不一致");

  // IM Channel 的卡片、文字、按钮、状态点与开关直接消费这些旧变量。
  assert.equal(map["--vscode-sideBar-background"], roles.surface.secondary);
  assert.equal(map["--vscode-foreground"], "#edf4f7");
  assert.equal(map["--vscode-descriptionForeground"], roles.text.secondary);
  assert.equal(map["--vscode-widget-border"], roles.border.subtle);
  assert.equal(map["--vscode-button-background"], "#f4e900");
  assert.equal(map["--vscode-checkbox-border"], roles.border.default);
  assert.equal(map["--vscode-testing-iconPassed"], roles.state.success);
});

test("浅色主题推导", () => {
  const map = TM.buildVarMap(LIGHT_SAMPLE);
  assert.equal(map["--bg-bg-base-default"], "#ffffff");
  assert.equal(map["--text-text-default"], "#171717");
  assert.equal(map["--bg-bg-invert"], "#171717");
  // 蓝紫 accent 亮度约 0.37，按 WCAG 黑字对比度(8.3)高于白字(2.5)
  assert.equal(map["--text-text-onaccent"], "#000000");
});

test("对比度护栏：好主题通过，烂主题被抓", () => {
  // vm 跨 realm 数组不能 deepStrictEqual，按长度与内容断言
  assert.equal(TM.auditContrast(SAMPLE).length, 0);
  assert.equal(TM.auditContrast(LIGHT_SAMPLE).length, 0);
  const bad = TM.auditContrast({
    appearance: "dark",
    surface: { base: "#0b1018" },
    text: { primary: "#31353a" }, // 复刻仙舟黑字事故
  });
  assert.ok(bad.length >= 1);
  assert.ok(bad.some((f) => f.fg === "text.primary" && f.bg === "surface.base"));
});

test("luminance/contrastRatio 基本正确性", () => {
  assert.equal(TM.luminance("#ffffff"), 1);
  assert.ok(Math.abs(TM.luminance("#000000")) < 1e-9);
  const ratio = TM.contrastRatio("#000000", "#ffffff");
  assert.ok(Math.abs(ratio - 21) < 0.01);
  assert.equal(TM.pickOnColor("#f4e900"), "#000000");
  assert.equal(TM.pickOnColor("#0b1018"), "#ffffff");
});

test("auditPairs 区分失败与不可解析配对", () => {
  const result = TM.auditPairs([
    { fg: "good.text", fgValue: "#ffffff", bg: "good.bg", bgValue: "#000000", minRatio: 4 },
    { fg: "bad.text", fgValue: "#777777", bg: "bad.bg", bgValue: "#777777", minRatio: 4 },
    { fg: "mixed.text", fgValue: "#ffffff", bg: "mixed.bg", bgValue: "color-mix(in srgb, #000 80%, white)", minRatio: 4 },
  ]);
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].fg, "bad.text");
  assert.equal(result.unverifiable.length, 1);
  assert.equal(result.unverifiable[0].bg, "mixed.bg");
});
