// TRAE Work Dream Skin — 主题角色 → 设计令牌扇出映射（纯函数，无 DOM 依赖）
// 用法：
//   页面载荷：injector 将本文件全文嵌入 skin.js（__TOKEN_MAP__ 占位符）
//   单测：    require("../token-map.mjs")
// 设计原则：映射表普查驱动，命名空间清单完整内置于本文件；
//   主题作者只声明角色（tokens），组件在任何页面读任何命名空间都拿到同一组值。
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DREAM_SKIN_TOKEN_MAP = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  // ---------- 颜色工具 ----------
  function parseColor(color) {
    if (!color || typeof color !== "string") return null;
    const c = color.trim();
    let m = /^#([0-9a-f]{3})$/i.exec(c);
    if (m) {
      const [r, g, b] = m[1].split("").map((x) => parseInt(x + x, 16));
      return { r, g, b, a: 1 };
    }
    m = /^#([0-9a-f]{6})$/i.exec(c);
    if (m) {
      const n = parseInt(m[1], 16);
      return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
    }
    m = /^#([0-9a-f]{8})$/i.exec(c);
    if (m) {
      const n = parseInt(m[1], 16);
      return { r: n >> 24, g: (n >> 16) & 255, b: (n >> 8) & 255, a: (n & 255) / 255 };
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(c);
    if (m) {
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] == null ? 1 : +m[4] };
    }
    return null;
  }

  function luminance(color) {
    const p = parseColor(color);
    if (!p) return null;
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(p.r) + 0.7152 * f(p.g) + 0.0722 * f(p.b);
  }

  function contrastRatio(a, b) {
    const la = luminance(a);
    const lb = luminance(b);
    if (la == null || lb == null) return null;
    const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  }

  // 从候选色里挑与 bg 对比度最高的；都不达标也返回最优的那个
  function pickOnColor(bg, candidates = ["#000000", "#ffffff"]) {
    let best = candidates[0];
    let bestRatio = -1;
    for (const c of candidates) {
      const r = contrastRatio(bg, c) ?? 0;
      if (r > bestRatio) { bestRatio = r; best = c; }
    }
    return best;
  }

  function withAlpha(color, alpha) {
    const p = parseColor(color);
    const a = Math.min(1, Math.max(0, Number(alpha)));
    if (p) return `rgba(${p.r}, ${p.g}, ${p.b}, ${+a.toFixed(3)})`;
    if (a === 1) return String(color);
    return `color-mix(in srgb, ${color} ${a * 100}%, transparent)`;
  }

  const mix = (color, pct, other) => `color-mix(in srgb, ${color} ${pct}%, ${other})`;

  // ---------- 命名空间普查清单（2026-07 实地盘点，见 docs/验证记录）----------
  const NS_BG = ["base-default", "base-secondary", "base-tertiary", "brand", "brand-active", "brand-disabled", "brand-disabled-sub", "brand-hover", "brand-hover-sub", "brand-old", "brand-popup", "brand-popup-sub", "brand-sub", "card", "card-hover", "input", "invert", "invert-active", "invert-disabled", "invert-hover", "menu", "menu-old", "overlay-l0", "overlay-l1", "overlay-l2", "overlay-l3", "overlay-l4", "tooltip", "white"];
  const NS_TEXT = ["brand", "brand-hover", "brand-hover-sub", "brand-sub", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "preformat-foreground", "secondary", "secondary-active", "secondary-hover", "tertiary"];
  const NS_ICON = ["brand", "brand-hover", "brand-hover-sub", "brand-sub", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "secondary", "secondary-active", "secondary-hover", "tertiary", "white"];
  const NS_BORDER = ["brand", "brand-sub", "contrast", "neutral-l1", "neutral-l2", "neutral-l3"];
  // --vscode-icube-- 别名层（组件真正消费的那层）
  const ICUBE_BG = ["base-default", "base-secondary", "base-tertiary", "brand", "brand-disabled", "brand-hover", "invert", "invert-active", "invert-disabled", "invert-hover", "menu", "menu-tr0", "overlay-l1", "overlay-l2", "overlay-l3", "overlay-l4", "tooltip"];
  const ICUBE_TEXT = ["brand", "brand-hover", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "secondary", "secondary-active", "secondary-hover", "tertiary"];
  const ICUBE_ICON = ["brand", "brand-hover", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "secondary", "secondary-active", "secondary-hover", "tertiary"];
  const ICUBE_BORDER = ["brand", "contrast", "neutral-l1", "neutral-l2", "neutral-l3"];
  const ICUBE_STATUS_KINDS = ["primary", "error", "success", "warning", "alert"];
  const ICUBE_STATUS_PARTS = ["default", "hover", "active", "surface-l1", "surface-l2", "surface-l3"];
  // --ras-* 镜像层
  const RAS_BG = ["base-default", "base-secondary", "base-tertiary", "brand", "brand-design", "brand-disabled", "brand-disabled-design", "brand-disabled-sub", "brand-hover", "brand-hover-design", "brand-hover-sub", "brand-popup", "brand-popup-design", "brand-popup-sub", "brand-sub", "invert", "invert-active", "invert-disabled", "invert-hover", "menu", "overlay-l1", "overlay-l2", "overlay-l3", "overlay-l4", "tooltip"];
  const RAS_TEXT = ["brand", "brand-design", "brand-hover", "brand-hover-design", "brand-hover-sub", "brand-sub", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "secondary", "secondary-active", "secondary-hover", "tertiary"];
  const RAS_ICON = ["brand", "brand-design", "brand-hover", "brand-hover-design", "brand-hover-sub", "brand-sub", "default", "default-active", "default-hover", "disabled", "onaccent", "onbrand", "secondary", "secondary-active", "secondary-hover", "tertiary"];
  const RAS_BORDER = ["brand", "brand-design", "brand-sub", "contrast", "neutral-l1", "neutral-l2", "neutral-l3"];
  // 品牌色阶停靠点：[suffix, accent 占比%, 混向]
  const RAMP_STOPS = [[50, 8, "white"], [100, 16, "white"], [200, 28, "white"], [300, 44, "white"], [400, 66, "white"], [500, 100, null], [600, 82, "black"], [700, 66, "black"], [800, 50, "black"], [900, 34, "black"], [950, 20, "black"]];

  // ---------- 角色补全 ----------
  // tokens 缺省时按规则推导：hover/active 用 color-mix，subtle 用透明度，onAccent 按亮度自动选黑白
  function deriveRoles(tokens, opts) {
    const t = tokens || {};
    const appearance = (opts && opts.appearance) || t.appearance || "dark";
    const accent = { ...(t.accent || {}) };
    if (!accent.base) accent.base = "#7c9cff";
    if (!accent.hover) accent.hover = mix(accent.base, 82, "white");
    if (!accent.active) accent.active = mix(accent.base, 82, "black");
    if (!accent.subtle) accent.subtle = withAlpha(accent.base, 0.18);
    if (!accent.disabled) accent.disabled = withAlpha(accent.base, 0.4);
    if (!accent.onAccent) accent.onAccent = pickOnColor(accent.base);

    const dark = appearance === "dark";
    const surface = { ...(t.surface || {}) };
    if (!surface.base) surface.base = dark ? "#0b1018" : "#ffffff";
    if (!surface.secondary) surface.secondary = mix(surface.base, dark ? 88 : 96, dark ? "white" : "black");
    if (!surface.tertiary) surface.tertiary = mix(surface.base, dark ? 80 : 92, dark ? "white" : "black");
    if (!surface.card) surface.card = surface.secondary;
    if (!surface.cardHover) surface.cardHover = surface.tertiary;
    if (!surface.input) surface.input = dark ? mix(surface.base, 85, "black") : mix(surface.base, 97, "black");
    if (!surface.menu) surface.menu = surface.card;
    if (!surface.tooltip) surface.tooltip = dark ? mix(surface.base, 80, "white") : mix(surface.base, 96, "black");
    if (!surface.invert) surface.invert = dark ? "#f5f5f5" : "#171717";

    const text = { ...(t.text || {}) };
    if (!text.primary) text.primary = dark ? "#edf4f7" : "#171717";
    if (!text.secondary) text.secondary = withAlpha(text.primary, 0.68);
    if (!text.tertiary) text.tertiary = withAlpha(text.primary, 0.45);
    if (!text.disabled) text.disabled = withAlpha(text.primary, 0.3);

    const icons = { ...(t.icons || {}) };
    if (!icons.primary) icons.primary = text.primary;
    if (!icons.secondary) icons.secondary = text.secondary;
    if (!icons.tertiary) icons.tertiary = text.tertiary;
    if (!icons.disabled) icons.disabled = text.disabled;

    const border = { ...(t.border || {}) };
    if (!border.subtle) border.subtle = withAlpha(text.primary, 0.14);
    if (!border.default) border.default = withAlpha(text.primary, 0.24);
    if (!border.strong) border.strong = withAlpha(text.primary, 0.38);
    if (!border.contrast) border.contrast = accent.base;

    const state = { ...(t.state || {}) };
    if (!state.info) state.info = "#57a8ff";
    if (!state.success) state.success = "#57d38c";
    if (!state.warning) state.warning = "#f5bf42";
    if (!state.error) state.error = "#ff5263";

    return { appearance, accent, surface, text, icons, border, state };
  }

  // ---------- 扇出 ----------
  function buildVarMap(tokens, opts) {
    const r = deriveRoles(tokens, opts);
    const { accent, surface, text, icons, border, state } = r;
    const out = {};

    // bg 语义（后缀共享：--bg-bg-* / --vscode-icube--bg-bg-* / --ras-bg-bg-*）
    const bgValue = (suffix) => {
      switch (suffix) {
        case "base-default": return surface.base;
        case "base-secondary": return surface.secondary;
        case "base-tertiary": return surface.tertiary;
        case "card": return surface.card;
        case "card-hover": return surface.cardHover;
        case "input": return surface.input;
        case "menu": case "menu-old": return surface.menu;
        case "menu-tr0": return withAlpha(surface.menu, 0);
        case "tooltip": return surface.tooltip;
        case "white": return "#ffffff";
        case "invert": return surface.invert;
        case "invert-hover": return mix(surface.invert, 88, r.appearance === "dark" ? "black" : "white");
        case "invert-active": return mix(surface.invert, 78, r.appearance === "dark" ? "black" : "white");
        case "invert-disabled": return withAlpha(surface.invert, 0.4);
        case "overlay-l0": return border.subtle;
        case "overlay-l1": return border.subtle;
        case "overlay-l2": return border.subtle;
        case "overlay-l3": return border.default;
        case "overlay-l4": return border.strong;
        case "brand": case "brand-old": case "brand-sub": case "brand-design": return accent.base;
        case "brand-hover": case "brand-hover-sub": case "brand-hover-design": return accent.hover;
        case "brand-active": return accent.active;
        case "brand-disabled": case "brand-disabled-sub": case "brand-disabled-design": return accent.disabled;
        case "brand-popup": case "brand-popup-sub": case "brand-popup-design": return accent.subtle;
        default: return undefined;
      }
    };
    const textValue = (suffix) => {
      switch (suffix) {
        case "default": case "default-hover": case "default-active": return text.primary;
        case "secondary": case "secondary-hover": case "secondary-active": return text.secondary;
        case "tertiary": return text.tertiary;
        case "disabled": return text.disabled;
        case "brand": case "brand-sub": case "brand-design": return accent.base;
        case "brand-hover": case "brand-hover-sub": case "brand-hover-design": return accent.hover;
        case "onaccent": case "onbrand": return accent.onAccent;
        case "preformat-foreground": return text.secondary;
        default: return undefined;
      }
    };
    const iconValue = (suffix) => {
      switch (suffix) {
        case "default": case "default-hover": case "default-active": return icons.primary;
        case "secondary": case "secondary-hover": case "secondary-active": return icons.secondary;
        case "tertiary": return icons.tertiary;
        case "disabled": return icons.disabled;
        case "brand": case "brand-sub": case "brand-design": return accent.base;
        case "brand-hover": case "brand-hover-sub": case "brand-hover-design": return accent.hover;
        case "onaccent": case "onbrand": return accent.onAccent;
        case "white": return "#ffffff";
        default: return undefined;
      }
    };
    const borderValue = (suffix) => {
      switch (suffix) {
        case "neutral-l1": return border.subtle;
        case "neutral-l2": return border.default;
        case "neutral-l3": return border.strong;
        case "brand": case "brand-design": return accent.base;
        case "brand-sub": return accent.subtle;
        case "contrast": return border.contrast;
        default: return undefined;
      }
    };

    const put = (name, value) => { if (value != null && value !== "") out[name] = value; };

    for (const s of NS_BG) put(`--bg-bg-${s}`, bgValue(s));
    for (const s of NS_TEXT) put(`--text-text-${s}`, textValue(s));
    for (const s of NS_ICON) put(`--icon-icon-${s}`, iconValue(s));
    for (const s of NS_BORDER) put(`--border-border-${s}`, borderValue(s));
    for (const s of ICUBE_BG) put(`--vscode-icube--bg-bg-${s}`, bgValue(s));
    for (const s of ICUBE_TEXT) put(`--vscode-icube--text-text-${s}`, textValue(s));
    for (const s of ICUBE_ICON) put(`--vscode-icube--icon-icon-${s}`, iconValue(s));
    for (const s of ICUBE_BORDER) put(`--vscode-icube--border-border-${s}`, borderValue(s));
    for (const s of RAS_BG) put(`--ras-bg-bg-${s}`, bgValue(s));
    for (const s of RAS_TEXT) put(`--ras-text-text-${s}`, textValue(s));
    for (const s of RAS_ICON) put(`--ras-icon-icon-${s}`, iconValue(s));
    for (const s of RAS_BORDER) put(`--ras-border-border-${s}`, borderValue(s));

    // 状态色家族（--vscode-icube--status-* 与 --ras-status-* 同步）
    const statusColor = { primary: accent.base, error: state.error, success: state.success, warning: state.warning, alert: state.info };
    for (const kind of ICUBE_STATUS_KINDS) {
      const c = statusColor[kind];
      for (const part of ICUBE_STATUS_PARTS) {
        let v;
        if (part === "default") v = c;
        else if (part === "hover") v = mix(c, 84, "white");
        else if (part === "active") v = mix(c, 84, "black");
        else v = withAlpha(c, { "surface-l1": 0.12, "surface-l2": 0.2, "surface-l3": 0.3 }[part]);
        put(`--vscode-icube--status-${kind}-${part}`, v);
        put(`--ras-status-${kind}-${part}`, v);
      }
    }
    // diff 提示色
    put("--vscode-icube--cue-diff-add", withAlpha(state.success, 0.2));
    put("--vscode-icube--cue-diff-add-inline", withAlpha(state.success, 0.35));
    put("--vscode-icube--cue-diff-add-popup", withAlpha(state.success, 0.25));
    put("--vscode-icube--cue-diff-remove", withAlpha(state.error, 0.2));
    put("--vscode-icube--cue-diff-line", border.subtle);

    // 品牌色阶：从 accent 一个值派生整条 ramp
    for (const [stop, pct, toward] of RAMP_STOPS) {
      put(`--brand-brand-${stop}`, toward ? mix(accent.base, pct, toward) : accent.base);
    }
    const neutral = text.secondary;
    for (const [stop, pct, toward] of RAMP_STOPS) {
      put(`--brand-brand-grey-${stop}`, toward ? mix(neutral, pct, toward) : neutral);
    }

    // 下拉/浮层菜单组件令牌
    const pm = {
      "bg": surface.menu, "text": text.primary, "border": border.subtle,
      "item-bg": withAlpha(surface.menu, 0),
      "item-hover-bg": accent.subtle, "item-selected-bg": accent.subtle,
      "item-disabled-text": text.disabled,
      "button-bg": accent.base, "button-hover-bg": accent.hover,
      "checkmark": accent.base, "mark-color": accent.base,
      "highlight-bg": accent.subtle, "footer-bg": surface.secondary,
      "scrollbar-bg": border.default, "scrollbar-hover-bg": border.strong,
      "separator": border.subtle,
      "shadow": "0 8px 24px rgba(0, 0, 0, 0.36)", "shadow-inset": withAlpha("#ffffff", 0.06),
    };
    for (const [k, v] of Object.entries(pm)) put(`--popup-menu-${k}`, v);

    return out;
  }

  // 对比度审计：输入一组 {fg, bg} 角色对，返回不达标项
  function auditContrast(tokens, opts) {
    const r = deriveRoles(tokens, opts);
    const pairs = [
      ["text.primary", r.text.primary, "surface.base", r.surface.base],
      ["text.primary", r.text.primary, "surface.card", r.surface.card],
      ["text.secondary", r.text.secondary, "surface.card", r.surface.card],
      ["text.tertiary", r.text.tertiary, "surface.card", r.surface.card],
      ["text.primary", r.text.primary, "surface.input", r.surface.input],
      ["text.primary", r.text.primary, "surface.menu", r.surface.menu],
      ["text.primary", r.text.primary, "surface.tooltip", r.surface.tooltip],
      ["accent.onAccent", r.accent.onAccent, "accent.base", r.accent.base],
      ["text.disabled", r.text.disabled, "surface.base", r.surface.base],
    ];
    const failures = [];
    for (const [fn, fv, bn, bv] of pairs) {
      const ratio = contrastRatio(fv, bv);
      if (ratio != null && ratio < (bn === "text.disabled" || fn === "text.disabled" ? 2.5 : 4.0)) {
        failures.push({ fg: fn, fgValue: fv, bg: bn, bgValue: bv, ratio: +ratio.toFixed(2) });
      }
    }
    return failures;
  }

  return {
    parseColor, luminance, contrastRatio, pickOnColor, withAlpha, mix,
    deriveRoles, buildVarMap, auditContrast,
    NS_BG, NS_TEXT, NS_ICON, NS_BORDER,
    ICUBE_BG, ICUBE_TEXT, ICUBE_ICON, ICUBE_BORDER, ICUBE_STATUS_KINDS, ICUBE_STATUS_PARTS,
    RAS_BG, RAS_TEXT, RAS_ICON, RAS_BORDER, RAMP_STOPS,
  };
});
