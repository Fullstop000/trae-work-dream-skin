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

test("runtime owns maintenance-action styles and maps them to semantic roles", () => {
  const defaultActionRule = BASE_CSS.match(
    /\.task-list-panel button:has\(\.progressCircleContainer\),\s*\nbody\.trae-skin-v2 \.soloUpdateStatusWrapper \.updateAlertActions > button\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const hoverActionRule = BASE_CSS.match(
    /\.task-list-panel button:has\(\.progressCircleContainer\):hover:not\(:disabled\),\s*\nbody\.trae-skin-v2 \.soloUpdateStatusWrapper \.updateAlertActions > button:hover:not\(:disabled\)\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const styles = fs.readdirSync(THEMES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(THEMES, entry.name, "theme.css"))
    .filter((file) => fs.existsSync(file));

  assert.ok(defaultActionRule, "sidebar and popover update actions need one shared runtime rule");
  assert.match(defaultActionRule, /color:\s*var\(--trae-skin-text-secondary\)/);
  assert.match(defaultActionRule, /border:\s*1px solid var\(--trae-skin-border-default\)/);
  assert.match(defaultActionRule, /background:\s*var\(--trae-skin-popover\)/);
  assert.match(defaultActionRule, /box-shadow:\s*none/);
  assert.doesNotMatch(defaultActionRule, /#[0-9a-f]{3,8}/i, "runtime actions must not hard-code a theme color");
  assert.ok(hoverActionRule, "sidebar and popover update actions need one shared runtime hover rule");
  assert.match(hoverActionRule, /var\(--trae-skin-popover-hover\)/);
  for (const file of styles) {
    assert.doesNotMatch(
      fs.readFileSync(file, "utf8"),
      /progressCircleContainer|soloUpdateStatusWrapper/,
      `${path.relative(ROOT, file)} redefines a runtime-owned maintenance action`,
    );
  }

});

test("runtime normalizes Templates tab strips and Automation filter surfaces", () => {
  const templatesSelector = 'body.trae-skin-v2 :is([class^="tabsBar-"], [class*=" tabsBar-"]):has(> :is([class^="tabRow-"], [class*=" tabRow-"]))';
  const templatesStart = BASE_CSS.indexOf(templatesSelector);
  const templatesRule = templatesStart >= 0
    ? BASE_CSS.slice(templatesStart, BASE_CSS.indexOf("\n}", templatesStart) + 2)
    : "";

  assert.match(
    BASE_CSS,
    /:is\(\[class\^="tabsBar-"\], \[class\*=" tabsBar-"\]\):has\(> :is\(\[class\^="tabRow-"\], \[class\*=" tabRow-"\]\)\)/,
  );
  assert.match(templatesRule, /background:\s*transparent !important/);
  assert.match(
    BASE_CSS,
    /:is\(\[class\^="filterBar-"\], \[class\*=" filterBar-"\]\):has\(> :is\(\[class\^="statusSelect-"\], \[class\*=" statusSelect-"\]\)\)\s*\{\s*background:\s*transparent !important/s,
  );
  assert.match(
    BASE_CSS,
    /:is\(\[role="combobox"\], \[class\^="trigger-"\], \[class\*=" trigger-"\]\)\s*\{\s*background:\s*var\(--trae-skin-input\) !important/s,
  );
});

test("Solvay composer has one visual boundary", () => {
  const css = fs.readFileSync(
    path.join(THEMES, "solvay-1927-solarized-light", "theme.css"),
    "utf8",
  );
  const innerComposerRule = css.match(
    /\.messageInputEditorWrapper \.messageInputChatInput > \.chat-input-v2-editor-part\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const focusRule = css.match(
    /\.messageInputEditorWrapper:has\(\.chat-input-v2-input-box-editable:focus\)\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(innerComposerRule, "Solvay needs an explicit inner composer reset");
  assert.match(innerComposerRule, /border:\s*0 !important/);
  assert.match(innerComposerRule, /border-radius:\s*0 !important/);
  assert.match(innerComposerRule, /box-shadow:\s*none !important/);
  assert.ok(focusRule, "Solvay needs a composer focus state");
  assert.doesNotMatch(focusRule, /0 0 0 \d+px/, "focus must not add a second outline");
});

test("Solvay assistant messages do not render a decorative rail", () => {
  const css = fs.readFileSync(
    path.join(THEMES, "solvay-1927-solarized-light", "theme.css"),
    "utf8",
  );
  const assistantRule = css.match(
    /\.core-finish-card\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const assistantDecorationRule = css.match(
    /\.core-finish-card::before\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(assistantRule, "Solvay needs an explicit assistant-message reset");
  assert.match(assistantRule, /padding-left:\s*0 !important/);
  assert.match(assistantRule, /border:\s*0 !important/);
  assert.match(assistantRule, /background:\s*transparent !important/);
  assert.ok(assistantDecorationRule, "Solvay needs an explicit assistant-decoration reset");
  assert.match(assistantDecorationRule, /content:\s*none !important/);
});

test("Solvay task-list hover uses one background state without decorative rails", () => {
  const css = fs.readFileSync(
    path.join(THEMES, "solvay-1927-solarized-light", "theme.css"),
    "utf8",
  );
  const hoverRule = css.match(
    /\.task-list-new-task-item:hover,[\s\S]*?\.task-list-panel \[tabindex="0"\]:hover\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const bottomFadeRule = css.match(
    /\.task-list-shadow-bottom\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(hoverRule, "Solvay needs an explicit task-list hover state");
  assert.match(hoverRule, /linear-gradient\(90deg/);
  assert.match(hoverRule, /box-shadow:\s*none !important/);
  assert.doesNotMatch(hoverRule, /\binset\b/, "nested task controls must not stack edge rails");
  assert.ok(bottomFadeRule, "Solvay needs an explicit task-list bottom-fade reset");
  assert.match(bottomFadeRule, /background:\s*none !important/);
});

test("Solvay send action stays inside the composer grid", () => {
  const css = fs.readFileSync(
    path.join(THEMES, "solvay-1927-solarized-light", "theme.css"),
    "utf8",
  );
  const sendRule = css.match(
    /\.chat-input-v2-send-button\s*\{([\s\S]*?)\n\}/,
  )?.[1];
  const sendDecorationRule = css.match(
    /\.chat-input-v2-send-button::before,\s*\nbody[^{}]+\.chat-input-v2-send-button::after\s*\{([\s\S]*?)\n\}/,
  )?.[1];

  assert.ok(sendRule, "Solvay needs an explicit send-action treatment");
  assert.match(sendRule, /width:\s*32px !important/);
  assert.match(sendRule, /height:\s*32px !important/);
  assert.match(sendRule, /border-radius:\s*2px !important/);
  assert.match(sendRule, /box-shadow:\s*none !important/);
  assert.ok(sendDecorationRule, "Solvay needs an explicit send-decoration reset");
  assert.match(sendDecorationRule, /content:\s*none !important/);
  assert.doesNotMatch(css, /solvay-(?:orbit|electron)/);
});
