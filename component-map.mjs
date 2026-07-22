// TRAE Work Dream Skin — V3 组件槽位规范化（纯函数，无 DOM 依赖）
// 页面载荷由 injector 嵌入 skin.js；单测可直接加载本文件。
// 前置条件：roles 必须是 TOKEN_MAP.deriveRoles 的完整输出。
(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.DREAM_SKIN_COMPONENT_MAP = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const BANNER_VARIANTS = new Set(["default", "system-plate"]);
  const MODE_TAB_VARIANTS = new Set(["default", "launch-rail"]);
  const ICON_POLICIES = new Set(["active", "always", "never"]);
  const MODES = ["work", "code", "design"];
  const DEFAULT_BANNER_MODES = {
    work: { code: "01", label: "WORK" },
    code: { code: "02", label: "CODE" },
    design: { code: "03", label: "DESIGN" },
  };
  const DEFAULT_TAB_MODES = {
    work: { code: "01" },
    code: { code: "02" },
    design: { code: "03" },
  };

  const object = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const number = (value, fallback, min, max) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const choice = (value, values, fallback) => values.has(value) ? value : fallback;
  const text = (value, fallback, maxLength = 32) => {
    if (value == null || !["string", "number"].includes(typeof value)) return fallback;
    const normalized = String(value)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalized ? normalized.slice(0, maxLength) : fallback;
  };

  // 主题输入只接受可审计的封闭颜色语法；fallback 来自 deriveRoles，属于可信内部值。
  const isThemeColor = (value) => {
    if (typeof value !== "string") return false;
    const color = value.trim();
    if (color.toLowerCase() === "transparent") return true;
    if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color)) return true;
    const match = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(color);
    if (!match) return false;
    const channels = match.slice(1, 4).map(Number);
    const alpha = match[4] == null ? 1 : Number(match[4]);
    return channels.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 255)
      && Number.isFinite(alpha) && alpha >= 0 && alpha <= 1;
  };
  const safeColor = (value, fallback) => isThemeColor(value) ? value.trim() : fallback;

  const splitTopLevel = (value, separator) => {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < value.length; i += 1) {
      if (value[i] === "(") depth += 1;
      else if (value[i] === ")") depth -= 1;
      else if (value[i] === separator && depth === 0) {
        parts.push(value.slice(start, i).trim());
        start = i + 1;
      }
      if (depth < 0) return [];
    }
    if (depth !== 0) return [];
    parts.push(value.slice(start).trim());
    return parts;
  };
  const SHADOW_LENGTH = /^(?:0|[+-]?(?:\d+(?:\.\d+)?|\.\d+)(?:px|rem|em))$/i;
  const isShadowLayer = (value) => {
    let layer = value.trim();
    if (!layer) return false;
    if (/^inset\s+/i.test(layer)) layer = layer.replace(/^inset\s+/i, "");
    let color = null;
    const colorMatch = /(?:#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|rgba?\([^)]*\)|transparent)$/i.exec(layer);
    if (colorMatch) {
      color = colorMatch[0];
      layer = layer.slice(0, colorMatch.index).trim();
    }
    if (color != null && !isThemeColor(color)) return false;
    const lengths = layer.split(/\s+/);
    return lengths.length >= 2 && lengths.length <= 4 && lengths.every((part) => SHADOW_LENGTH.test(part));
  };
  const safeShadow = (value, fallback = "none") => {
    if (typeof value !== "string") return fallback;
    const shadow = value.trim();
    if (!shadow) return fallback;
    if (shadow.toLowerCase() === "none") return "none";
    if (/(?:url|var|attr|expression)\s*\(|[;{}]|\/\*|\*\//i.test(shadow)) return fallback;
    const layers = splitTopLevel(shadow, ",");
    return layers.length && layers.every(isShadowLayer) ? shadow : fallback;
  };

  const modeContent = (value, fallback, includeLabel) => {
    const modes = object(value);
    return Object.fromEntries(MODES.map((mode) => {
      const source = object(modes[mode]);
      const normalized = { code: text(source.code, fallback[mode].code, 24) };
      if (includeLabel) normalized.label = text(source.label, fallback[mode].label, 24);
      return [mode, normalized];
    }));
  };

  function deriveComponents(components, roles) {
    const c = object(components);
    const r = object(roles);
    const accent = object(r.accent);
    const surface = object(r.surface);
    const textRole = object(r.text);
    const border = object(r.border);
    const state = object(r.state);
    const banner = object(object(c.landing).banner);
    const bannerColors = object(banner.colors);
    const bannerMetrics = object(banner.metrics);
    const bannerEffects = object(banner.effects);
    const bannerContent = object(banner.content);
    const tabs = object(object(c.navigation).modeTabs);
    const tabColors = object(tabs.colors);
    const tabMetrics = object(tabs.metrics);
    const tabEffects = object(tabs.effects);
    const tabContent = object(tabs.content);

    return {
      banner: {
        variant: choice(banner.variant, BANNER_VARIANTS, "default"),
        colors: {
          surface: safeColor(bannerColors.surface, surface.card),
          border: safeColor(bannerColors.border, border.default),
          accent: safeColor(bannerColors.accent, accent.base),
          text: safeColor(bannerColors.text, textRole.primary),
          muted: safeColor(bannerColors.muted, textRole.tertiary),
          status: safeColor(bannerColors.status, state.success || accent.base),
        },
        metrics: {
          cornerCutPx: number(bannerMetrics.cornerCutPx, 12, 0, 40),
          maxWidthPx: number(bannerMetrics.maxWidthPx, 620, 320, 960),
          iconSizePx: number(bannerMetrics.iconSizePx, 48, 24, 80),
        },
        effects: { shadow: safeShadow(bannerEffects.shadow, "none") },
        content: {
          statusText: text(bannerContent.statusText, "ONLINE", 20),
          modes: modeContent(bannerContent.modes, DEFAULT_BANNER_MODES, true),
        },
      },
      modeTabs: {
        variant: choice(tabs.variant, MODE_TAB_VARIANTS, "default"),
        colors: {
          track: safeColor(tabColors.track, surface.secondary),
          border: safeColor(tabColors.border, border.default),
          indicator: safeColor(tabColors.indicator, accent.subtle || surface.card),
          accent: safeColor(tabColors.accent, accent.base),
          activeText: safeColor(tabColors.activeText, accent.base || textRole.primary),
          inactiveText: safeColor(tabColors.inactiveText, textRole.secondary),
          hover: safeColor(tabColors.hover, surface.cardHover || surface.tertiary),
        },
        metrics: {
          heightPx: number(tabMetrics.heightPx, 40, 32, 56),
          tabWidthPx: number(tabMetrics.tabWidthPx, 84, 64, 120),
          gapPx: number(tabMetrics.gapPx, 3, 0, 12),
          cornerCutPx: number(tabMetrics.cornerCutPx, 8, 0, 18),
        },
        effects: { shadow: safeShadow(tabEffects.shadow, "none") },
        content: {
          iconPolicy: choice(tabContent.iconPolicy, ICON_POLICIES, "active"),
          showModeCode: tabContent.showModeCode === true,
          modes: modeContent(tabContent.modes, DEFAULT_TAB_MODES, false),
        },
      },
    };
  }

  function getContrastPairs(components) {
    const c = object(components);
    const banner = object(c.banner);
    const bannerColors = object(banner.colors);
    const modeTabs = object(c.modeTabs);
    const tabColors = object(modeTabs.colors);
    const pairs = [];
    if (banner.variant === "system-plate") {
      pairs.push(
        { fg: "components.landing.banner.colors.text", fgValue: bannerColors.text, bg: "components.landing.banner.colors.surface", bgValue: bannerColors.surface, minRatio: 4 },
        { fg: "components.landing.banner.colors.muted", fgValue: bannerColors.muted, bg: "components.landing.banner.colors.surface", bgValue: bannerColors.surface, minRatio: 3 },
        { fg: "components.landing.banner.colors.status", fgValue: bannerColors.status, bg: "components.landing.banner.colors.surface", bgValue: bannerColors.surface, minRatio: 4 },
      );
    }
    if (modeTabs.variant === "launch-rail") {
      pairs.push(
        { fg: "components.navigation.modeTabs.colors.activeText", fgValue: tabColors.activeText, bg: "components.navigation.modeTabs.colors.indicator", bgValue: tabColors.indicator, minRatio: 4 },
        { fg: "components.navigation.modeTabs.colors.inactiveText", fgValue: tabColors.inactiveText, bg: "components.navigation.modeTabs.colors.track", bgValue: tabColors.track, minRatio: 4 },
      );
    }
    return pairs;
  }

  return { deriveComponents, getContrastPairs, safeColor, safeShadow, MODES };
});
