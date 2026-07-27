// TRAE Work Skin — 页面内载荷（背景层 + 主题画廊面板）
// injector.mjs 注入映射、主题目录与共享样式后经 Runtime.evaluate 执行。
// 幂等：重复执行先移除旧节点再重新挂载；主题选择存 localStorage，重启/导航后保持。
(() => {
  __TOKEN_MAP__
  __COMPONENT_MAP__
  const TOKEN_MAP = self.DREAM_SKIN_TOKEN_MAP;
  const COMPONENT_MAP = self.DREAM_SKIN_COMPONENT_MAP;
  const CATALOG = __CATALOG__;
  let themeSyncState = __THEME_SYNC_STATE__;
  const DEFAULT_THEME = __DEFAULT_THEME__;
  const VERSION = __VERSION__;
  const BASE_CSS = __BASE_CSS__;
  const MANAGER_CSS = __MANAGER_CSS__;
  const LS_PREFIX = "trae-dream-skin:";
  const LS_KEY = `${LS_PREFIX}theme`;
  const BLUR_LS_PREFIX = `${LS_PREFIX}panel-blur:`;
  const BRIGHTNESS_LS_PREFIX = `${LS_PREFIX}background-brightness:`;
  const MAIN_OVERLAY_LS_PREFIX = `${LS_PREFIX}main-overlay-opacity:`;
  const DISABLED_KEY = `${LS_PREFIX}disabled`;
  const STYLE_ID = "trae-dream-skin-style";
  const UI_STYLE_ID = "trae-dream-skin-ui-style";
  const THEME_STYLE_ID = "trae-dream-skin-theme-style";
  const ICONS_STYLE_ID = "trae-dream-skin-icons-style";
  const SCOPE_STYLE_ID = "trae-dream-skin-scope-style";
  const PANEL_ID = "trae-dream-skin-panel";
  const BUTTON_ID = "trae-dream-skin-button";

  window.__TRAE_DREAM_SKIN_OBS__?.disconnect();
  window.__TRAE_DREAM_SKIN_OBS__ = null;
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(UI_STYLE_ID)?.remove();
  document.getElementById(THEME_STYLE_ID)?.remove();
  document.getElementById(ICONS_STYLE_ID)?.remove();
  document.getElementById(SCOPE_STYLE_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(BUTTON_ID)?.remove();
  // 清理上一次注入在 <html> 上写的令牌变量（v3）
  if (Array.isArray(window.__TRAE_DREAM_SKIN_HTML_VARS__)) {
    for (const name of window.__TRAE_DREAM_SKIN_HTML_VARS__) {
      document.documentElement.style.removeProperty(name);
    }
    window.__TRAE_DREAM_SKIN_HTML_VARS__ = null;
  }
  // 清理旧版/调试会话遗留在 <html> 上的背景，避免加载失败时串用旧资产。
  document.documentElement.style.removeProperty("--trae-skin-art");
  window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__?.disconnect?.();
  window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__ = null;
  // 记录 App 原始外观（只在首次注入时记录一次，恢复默认时还原）
  if (!window.__TRAE_DREAM_SKIN_ORIG_APPEARANCE__) {
    window.__TRAE_DREAM_SKIN_ORIG_APPEARANCE__ = {
      dataTheme: document.documentElement.getAttribute("data-theme"),
      light: Boolean(document.body?.classList.contains("light")),
      vsDark: Boolean(document.body?.classList.contains("vs-dark")),
    };
  }
  if (document.body) {
    for (const className of [...document.body.classList]) {
      if (className.startsWith("trae-skin-theme-")) {
        document.body.classList.remove(className);
      }
    }
    for (const key of [
      "traeSkinLandingBanner",
      "traeSkinModeTabs",
      "traeSkinModeTabIcons",
      "traeSkinModeTabCodes",
    ]) delete document.body.dataset[key];
  }

  let disabled = false;
  try { disabled = localStorage.getItem(DISABLED_KEY) === "true"; } catch {}
  if (disabled) {
    if (document.body) {
      const semanticPrefixes = [
        "--bg-bg-",
        "--text-text-",
        "--icon-icon-",
        "--border-border-",
      ];
      for (const name of [...document.body.style]) {
        if (
          name.startsWith("--trae-skin-")
          || semanticPrefixes.some((prefix) => name.startsWith(prefix))
        ) {
          document.body.style.removeProperty(name);
        }
      }
      document.body.classList.remove(
        "trae-skin-v2",
        "trae-skin-v3",
        "trae-skin-appearance-dark",
        "trae-skin-effects-max",
        "trae-skin-blur-disabled",
      );
    }
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = BASE_CSS;
  // 管理器（画廊面板/按钮）样式独立于主题样式常驻：
  // “恢复默认”只移除主题样式，管理器布局不受影响
  const uiStyle = document.createElement("style");
  uiStyle.id = UI_STYLE_ID;
  uiStyle.textContent = MANAGER_CSS;
  const themeStyle = document.createElement("style");
  themeStyle.id = THEME_STYLE_ID;
  (document.head || document.documentElement).appendChild(uiStyle);
  if (!disabled) {
    (document.head || document.documentElement).appendChild(style);
    (document.head || document.documentElement).appendChild(themeStyle);
  }

  const findTheme = (id) => CATALOG.find((t) => t.id === id);
  const setVar = (name, value) => {
    if (value == null || value === "") return;
    document.body.style.setProperty(name, String(value));
  };
  const asNumber = (value, fallback, min = -Infinity, max = Infinity) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
  };
  const asLength = (value, fallback) => {
    if (value == null || value === "") return fallback;
    return typeof value === "number" ? `${value}px` : String(value);
  };
  const asCssString = (value, fallback = "") => JSON.stringify(String(value ?? fallback));
  const withAlpha = (color, opacity) => {
    const alpha = asNumber(opacity, 1, 0, 1);
    const match = /^#([0-9a-f]{6})$/i.exec(String(color || ""));
    if (match) {
      const value = Number.parseInt(match[1], 16);
      return `rgba(${value >> 16}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
    }
    if (alpha === 1) return String(color);
    return `color-mix(in srgb, ${color} ${alpha * 100}%, transparent)`;
  };
  const clearManagedVars = () => {
    const semanticPrefixes = [
      "--bg-bg-",
      "--text-text-",
      "--icon-icon-",
      "--border-border-",
    ];
    for (const name of [...document.body.style]) {
      if (
        name.startsWith("--trae-skin-")
        || semanticPrefixes.some((prefix) => name.startsWith(prefix))
      ) {
        document.body.style.removeProperty(name);
      }
    }
    // v3 写在 <html> 上的令牌变量
    if (Array.isArray(window.__TRAE_DREAM_SKIN_HTML_VARS__)) {
      for (const name of window.__TRAE_DREAM_SKIN_HTML_VARS__) {
        document.documentElement.style.removeProperty(name);
      }
      window.__TRAE_DREAM_SKIN_HTML_VARS__ = null;
    }
    document.documentElement.style.removeProperty("--trae-skin-art");
    if (document.body) {
      for (const key of [
        "traeSkinLandingBanner",
        "traeSkinModeTabs",
        "traeSkinModeTabIcons",
        "traeSkinModeTabCodes",
      ]) delete document.body.dataset[key];
    }
  };
  const setSurface = (name, config, fallbackColor, fallbackOpacity, fallbackBlur) => {
    const surface = config || {};
    setVar(
      `--trae-skin-${name}-surface`,
      withAlpha(surface.background || fallbackColor, surface.opacity ?? fallbackOpacity),
    );
    setVar(
      `--trae-skin-${name}-blur`,
      asLength(surface.backdropBlur, `${fallbackBlur}px`),
    );
    setVar(
      `--trae-skin-${name}-saturation`,
      asNumber(surface.backdropSaturation, 1.2, 0, 3),
    );
  };
  const publicThemeConfig = (theme) => {
    const config = {
      id: theme.id,
      name: theme.name,
      desc: theme.desc,
      category: theme.category,
    };
    if (theme.settings?.schemaVersion) {
      Object.assign(config, theme.settings);
    } else {
      if (theme.surfaceLight != null) config.surfaceLight = theme.surfaceLight;
      if (theme.surfaceDark != null) config.surfaceDark = theme.surfaceDark;
      if (theme.blurPx != null) config.blurPx = theme.blurPx;
    }
    return config;
  };
  const panelBlurEnabled = (theme) => {
    const defaultValue = theme.settings?.effects?.panelBlurEnabled ?? true;
    try {
      const saved = localStorage.getItem(`${BLUR_LS_PREFIX}${theme.id}`);
      return saved == null ? Boolean(defaultValue) : saved === "true";
    } catch {
      return Boolean(defaultValue);
    }
  };
  const savePanelBlur = (theme, enabled) => {
    try {
      localStorage.setItem(`${BLUR_LS_PREFIX}${theme.id}`, String(Boolean(enabled)));
    } catch {}
  };
  const defaultBackgroundBrightness = (theme) => asNumber(
    theme.settings?.background?.brightness,
    1,
    0,
    2,
  );
  const backgroundBrightness = (theme) => {
    const fallback = defaultBackgroundBrightness(theme);
    try {
      const saved = localStorage.getItem(`${BRIGHTNESS_LS_PREFIX}${theme.id}`);
      return saved == null ? fallback : asNumber(saved, fallback, 0, 2);
    } catch {
      return fallback;
    }
  };
  const saveBackgroundBrightness = (theme, value) => {
    const next = asNumber(value, defaultBackgroundBrightness(theme), 0, 2);
    try { localStorage.setItem(`${BRIGHTNESS_LS_PREFIX}${theme.id}`, String(next)); } catch {}
    return next;
  };
  const resetBackgroundBrightness = (theme) => {
    try { localStorage.removeItem(`${BRIGHTNESS_LS_PREFIX}${theme.id}`); } catch {}
    return defaultBackgroundBrightness(theme);
  };
  const defaultMainOverlayOpacity = (theme) => asNumber(
    theme.settings?.surfaces?.opacity?.chat ?? theme.settings?.surfaces?.opacity?.main,
    0.68, 0, 1,
  );
  const mainOverlayOpacity = (theme) => {
    try {
      const saved = localStorage.getItem(`${MAIN_OVERLAY_LS_PREFIX}${theme.id}`);
      return saved == null ? null : asNumber(saved, null, 0, 1);
    } catch { return null; }
  };
  const saveMainOverlayOpacity = (theme, value) => {
    const next = asNumber(value, defaultMainOverlayOpacity(theme), 0, 1);
    try { localStorage.setItem(`${MAIN_OVERLAY_LS_PREFIX}${theme.id}`, String(next)); } catch {}
    return next;
  };
  const resetMainOverlayOpacity = (theme) => {
    try { localStorage.removeItem(`${MAIN_OVERLAY_LS_PREFIX}${theme.id}`); } catch {}
  };
  let ensureSelfHeal = () => {};
  let activeThemeClass = null;

  // v3 外观握手的逆操作：还原 App 原始外观（切换到 v1/v2 主题、恢复默认时调用）
  const restoreNativeAppearance = () => {
    window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__?.disconnect?.();
    window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__ = null;
    const orig = window.__TRAE_DREAM_SKIN_ORIG_APPEARANCE__;
    if (!orig) return;
    if (orig.dataTheme == null) {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", orig.dataTheme);
    }
    if (document.body) {
      document.body.classList.toggle("light", orig.light);
      document.body.classList.toggle("vs-dark", orig.vsDark);
    }
  };
  const restoreNativeTheme = () => {
    try {
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith(LS_PREFIX)) localStorage.removeItem(key);
      }
      localStorage.setItem(DISABLED_KEY, "true");
    } catch {}
    disabled = true;
    clearManagedVars();
    // v3 外观握手的逆操作：还原 App 原始外观
    restoreNativeAppearance();
    window.__TRAE_DREAM_SKIN_ORIG_APPEARANCE__ = null;
    document.body.classList.remove(
      "trae-skin-v2",
      "trae-skin-v3",
      "trae-skin-appearance-dark",
      "trae-skin-effects-max",
      "trae-skin-blur-disabled",
    );
    if (activeThemeClass) document.body.classList.remove(activeThemeClass);
    activeThemeClass = null;
    document.getElementById(STYLE_ID)?.remove();
    document.getElementById(THEME_STYLE_ID)?.remove();
    document.getElementById(ICONS_STYLE_ID)?.remove();
    document.getElementById(SCOPE_STYLE_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    panel.style.display = "none";
    panel.querySelectorAll(".ds-card").forEach((card) => card.classList.remove("ds-active"));
    configToggle.style.display = "none";
    showConfig(false);
    if (!uiStyle.isConnected) (document.head || document.documentElement).appendChild(uiStyle);
    ensureSelfHeal();
    button.title = "打开 TRAE Work Skin 主题画廊";
    window.__TRAE_DREAM_SKIN__ = VERSION;
    return { ok: true, disabled: true, controlRetained: true };
  };
  let renderCurrentConfig = () => {};
  let renderBlurControl = () => {};
  let renderBrightnessControl = () => {};
  let renderMainOverlayControl = () => {};

  const setAppearance = (appearance) => {
    const root = document.documentElement;
    const wantDark = appearance === "dark";
    if (root.getAttribute("data-theme") !== appearance) {
      root.setAttribute("data-theme", appearance);
    }
    if (document.body) {
      document.body.classList.toggle("light", !wantDark);
      document.body.classList.toggle("vs-dark", wantDark);
    }
  };

  const ensureAppearanceObserver = () => {
    if (window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__) return;
    const obs = new MutationObserver(() => {
      let id = null;
      try { id = localStorage.getItem(LS_KEY); } catch {}
      const current = id ? findTheme(id) : null;
      if (!current || Number(current.settings?.schemaVersion) < 3) {
        obs.disconnect();
        window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__ = null;
        return;
      }
      const want = current.settings.appearance === "light" ? "light" : "dark";
      if (document.documentElement.getAttribute("data-theme") !== want) {
        setAppearance(want);
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    window.__TRAE_DREAM_SKIN_APPEARANCE_OBS__ = obs;
  };

  const setTraeSkinVarsV3 = (roles, settings, theme) => {
    const { accent, surface, text, icons, border, state } = roles;
    const background = settings.background || {};
    const surfaces = settings.surfaces || {};
    const surfacesOpacity = surfaces.opacity || {};
    const surfacesBlur = surfaces.blurPx || {};
    const surfacesSaturation = surfaces.saturation ?? 1.2;
    const typography = settings.typography || {};
    const shape = settings.shape || {};
    const radius = shape.radius || {};
    const elevation = settings.elevation || {};
    const scrollbar = settings.scrollbar || {};
    const workbench = settings.workbench || {};
    const workbenchOpacity = workbench.opacity || {};
    const effects = settings.effects || {};
    const surfacesColors = surfaces.colors || {};
    const components = settings.components || {};
    const chatC = components.chat || {};
    const popoverC = components.popover || {};
    const settingsC = components.settings || {};
    const decorations = settings.decorations || {};
    const componentRoles = COMPONENT_MAP.deriveComponents(components, { accent, surface, text, border, state });
    const bannerC = componentRoles.banner;
    const modeTabsC = componentRoles.modeTabs;
    const mainOverlay = mainOverlayOpacity(theme);
    const centerOpacity = (fallback) => mainOverlay ?? fallback;

    document.body.classList.toggle("trae-skin-effects-max", effects.mode === "max");

    setVar("--trae-skin-background-color", background.color || surface.base);
    setVar("--trae-skin-background-position", background.position || "center");
    setVar("--trae-skin-background-size", background.size || "cover");
    setVar("--trae-skin-background-repeat", background.repeat || "no-repeat");
    setVar("--trae-skin-background-blur", asLength(background.blur, "0px"));
    setVar("--trae-skin-background-brightness", backgroundBrightness(theme));
    setVar("--trae-skin-background-saturation", asNumber(background.saturation, 1, 0, 3));
    setVar("--trae-skin-background-scale", background.blur ? 1.035 : 1);
    setVar("--trae-skin-background-overlay", withAlpha(
      background.overlay?.color || "transparent",
      background.overlay?.opacity ?? 0,
    ));

    setSurface("left", { background: surfacesColors.left ?? surface.secondary, opacity: surfacesOpacity.left ?? 0.72, backdropBlur: surfacesBlur.left ?? 16, backdropSaturation: surfacesSaturation }, surface.secondary, 0.72, 16);
    setSurface("chat", { background: surfacesColors.chat ?? surface.base, opacity: centerOpacity(surfacesOpacity.chat ?? 0.72), backdropBlur: surfacesBlur.chat ?? 20, backdropSaturation: surfacesSaturation }, surface.base, 0.72, 20);
    setSurface("main", { background: surfacesColors.main ?? surface.base, opacity: centerOpacity(surfacesOpacity.main ?? 0.68), backdropBlur: surfacesBlur.main ?? 18, backdropSaturation: surfacesSaturation }, surface.base, 0.68, 18);
    setSurface("landing", { background: surfacesColors.landing ?? surface.base, opacity: centerOpacity(surfacesOpacity.landing ?? 0.68), backdropBlur: surfacesBlur.landing ?? 18, backdropSaturation: surfacesSaturation }, surface.base, 0.68, 18);
    setVar("--trae-skin-landing-overlay-opacity", centerOpacity(surfacesOpacity.landing ?? 0.68));
    setVar("--trae-skin-layout-gap", surfaces.gap || withAlpha(surface.secondary, 0.35));
    setVar("--trae-skin-divider", surfaces.divider || border.subtle);
    setVar("--trae-skin-surface-light", centerOpacity(surfacesOpacity.chat ?? 0.72));
    setVar("--trae-skin-surface-dark", centerOpacity(surfacesOpacity.chat ?? 0.72));
    setVar("--trae-skin-blur", `${surfacesBlur.chat ?? 20}px`);

    setVar("--trae-skin-text-primary", text.primary);
    setVar("--trae-skin-text-secondary", text.secondary);
    setVar("--trae-skin-text-tertiary", text.tertiary);
    setVar("--trae-skin-text-disabled", text.disabled);
    setVar("--trae-skin-accent", accent.base);
    setVar("--trae-skin-accent-hover", accent.hover);
    setVar("--trae-skin-accent-subtle", accent.subtle);
    setVar("--trae-skin-accent-on", accent.onAccent);
    setVar("--trae-skin-info", state.info);
    setVar("--trae-skin-info-subtle", withAlpha(state.info, 0.12));
    setVar("--trae-skin-error", state.error);
    setVar("--trae-skin-warning", state.warning);
    setVar("--trae-skin-success", state.success);
    setVar("--trae-skin-input", surface.input);
    setVar("--trae-skin-menu", surface.menu);
    setVar("--trae-skin-border-subtle", border.subtle);
    setVar("--trae-skin-border-default", border.default);
    setVar("--trae-skin-border-strong", border.strong);
    setVar("--trae-skin-scanline-color", effects.scanlineColor || "transparent");
    setVar("--trae-skin-grid-color", effects.gridColor || "transparent");
    setVar("--trae-skin-magenta", effects.magenta || state.error);
    setVar("--trae-skin-neon-glow", effects.glow || "none");

    setVar("--trae-skin-font-ui", typography.ui?.family || "inherit");
    setVar("--trae-skin-font-heading", typography.heading?.family || typography.ui?.family || "inherit");
    setVar("--trae-skin-font-code", typography.code?.family || "monospace");
    setVar("--trae-skin-heading-weight", typography.heading?.weight || 600);
    setVar("--trae-skin-heading-spacing", typography.heading?.letterSpacing || "normal");
    setVar("--trae-skin-radius-small", asLength(radius.small, "6px"));
    setVar("--trae-skin-radius-medium", asLength(radius.medium, "10px"));
    setVar("--trae-skin-radius-large", asLength(radius.large, "14px"));
    setVar("--trae-skin-radius-pill", asLength(radius.pill, "999px"));
    setVar("--trae-skin-shadow-card", elevation.card || "0 8px 24px #00000026");
    setVar("--trae-skin-shadow-floating", elevation.floating || "0 16px 48px #00000073");
    setVar("--trae-skin-focus-ring", elevation.focusRing || `0 0 0 2px ${accent.base}`);

    setVar("--trae-skin-scrollbar-track", scrollbar.track || "transparent");
    setVar("--trae-skin-scrollbar-thumb", scrollbar.thumb || border.default);
    setVar("--trae-skin-scrollbar-hover", scrollbar.thumbHover || accent.base);
    setVar("--trae-skin-scrollbar-width", asLength(scrollbar.width, "8px"));

    setVar("--trae-skin-chat-user-bubble", chatC.userBubble || surface.card);
    setVar("--trae-skin-chat-user-border", chatC.userBubbleBorder || border.subtle);
    setVar("--trae-skin-chat-code", chatC.code || surface.input);
    setVar("--trae-skin-chat-card", chatC.card || surface.card);
    setVar("--trae-skin-chat-assistant-message", chatC.assistantMessage || "transparent");
    setVar("--trae-skin-chat-assistant-border", chatC.assistantMessageBorder || "transparent");
    setVar("--trae-skin-chat-assistant-shadow", chatC.assistantMessageShadow || "none");
    setVar("--trae-skin-popover", popoverC.background || surface.menu);
    setVar("--trae-skin-popover-hover", popoverC.itemHover || withAlpha(state.info, 0.1));
    setVar("--trae-skin-popover-selected", popoverC.itemSelected || accent.subtle);

    setVar("--trae-skin-settings-overlay", settingsC.overlay || withAlpha(surface.base, 0.72));
    setVar("--trae-skin-settings-panel", settingsC.panel || surface.menu);
    setVar("--trae-skin-settings-sidebar", settingsC.sidebar || surface.secondary);
    setVar("--trae-skin-settings-card", settingsC.card || surface.card);
    setVar("--trae-skin-settings-control", settingsC.control || surface.input);
    setVar("--trae-skin-settings-active", settingsC.active || accent.subtle);

    document.body.dataset.traeSkinLandingBanner = bannerC.variant;
    document.body.dataset.traeSkinModeTabs = modeTabsC.variant;
    document.body.dataset.traeSkinModeTabIcons = modeTabsC.content.iconPolicy;
    document.body.dataset.traeSkinModeTabCodes = String(modeTabsC.content.showModeCode);
    setVar("--trae-skin-banner-surface", bannerC.colors.surface);
    setVar("--trae-skin-banner-border", bannerC.colors.border);
    setVar("--trae-skin-banner-accent", bannerC.colors.accent);
    setVar("--trae-skin-banner-text", bannerC.colors.text);
    setVar("--trae-skin-banner-muted", bannerC.colors.muted);
    setVar("--trae-skin-banner-status-color", bannerC.colors.status);
    setVar("--trae-skin-banner-shadow", bannerC.effects.shadow);
    setVar("--trae-skin-banner-corner-cut", `${bannerC.metrics.cornerCutPx}px`);
    setVar("--trae-skin-banner-max-width", `${bannerC.metrics.maxWidthPx}px`);
    setVar("--trae-skin-banner-icon-size", `${bannerC.metrics.iconSizePx}px`);
    setVar("--trae-skin-banner-code-work", asCssString(bannerC.content.modes.work.code));
    setVar("--trae-skin-banner-code-code", asCssString(bannerC.content.modes.code.code));
    setVar("--trae-skin-banner-code-design", asCssString(bannerC.content.modes.design.code));
    setVar("--trae-skin-banner-label-work", asCssString(bannerC.content.modes.work.label));
    setVar("--trae-skin-banner-label-code", asCssString(bannerC.content.modes.code.label));
    setVar("--trae-skin-banner-label-design", asCssString(bannerC.content.modes.design.label));
    setVar("--trae-skin-banner-status", asCssString(bannerC.content.statusText));
    setVar("--trae-skin-mode-tabs-track", modeTabsC.colors.track);
    setVar("--trae-skin-mode-tabs-border", modeTabsC.colors.border);
    setVar("--trae-skin-mode-tabs-indicator", modeTabsC.colors.indicator);
    setVar("--trae-skin-mode-tabs-accent", modeTabsC.colors.accent);
    setVar("--trae-skin-mode-tabs-active-text", modeTabsC.colors.activeText);
    setVar("--trae-skin-mode-tabs-inactive-text", modeTabsC.colors.inactiveText);
    setVar("--trae-skin-mode-tabs-hover", modeTabsC.colors.hover);
    setVar("--trae-skin-mode-tabs-shadow", modeTabsC.effects.shadow);
    setVar("--trae-skin-mode-tabs-height", `${modeTabsC.metrics.heightPx}px`);
    setVar("--trae-skin-mode-tabs-tab-width", `${modeTabsC.metrics.tabWidthPx}px`);
    setVar("--trae-skin-mode-tabs-gap", `${modeTabsC.metrics.gapPx}px`);
    setVar("--trae-skin-mode-tabs-corner-cut", `${modeTabsC.metrics.cornerCutPx}px`);
    setVar("--trae-skin-mode-tabs-code-work", asCssString(modeTabsC.content.modes.work.code));
    setVar("--trae-skin-mode-tabs-code-code", asCssString(modeTabsC.content.modes.code.code));
    setVar("--trae-skin-mode-tabs-code-design", asCssString(modeTabsC.content.modes.design.code));

    // 侧栏/右栏装饰图（与 v2 extensions.decorations 同语义，v3 移到顶层 decorations）
    const setDecorationV3 = (name, asset, config, fallbackColor) => {
      if (!asset || !config) return;
      const overlay = withAlpha(config.overlay?.color || fallbackColor, config.overlay?.opacity ?? 0.42);
      setVar(`--trae-skin-${name}-art-layer`, `linear-gradient(${overlay}, ${overlay}), url("${asset}")`);
      setVar(`--trae-skin-${name}-art-position`, config.position || "center");
      setVar(`--trae-skin-${name}-art-size`, config.size || "cover");
    };
    setDecorationV3("left", theme.assets?.leftSidebar, decorations.leftSidebar, surface.secondary);
    setDecorationV3("right", theme.assets?.rightPanel, decorations.rightPanel, surface.base);

    setVar("--trae-skin-workbench-sidebar", withAlpha(surface.secondary, workbenchOpacity.sidebar ?? 0.72));
    setVar("--trae-skin-workbench-editor", withAlpha(surface.base, centerOpacity(workbenchOpacity.editor ?? 0.76)));
    setVar("--trae-skin-workbench-panel", withAlpha(surface.secondary, workbenchOpacity.panel ?? 0.72));
    return componentRoles;
  };

  // ---------- v3：图标 glyph 替换（CSS mask，颜色跟随 currentColor） ----------
  const applyIconOverrides = (settings) => {
    document.getElementById(ICONS_STYLE_ID)?.remove();
    const overrides = settings.icons?.overrides || {};
    const assets = settings.icons?.assets || {};
    const rules = [];
    for (const [key, spec] of Object.entries(overrides)) {
      const art = assets[key];
      if (!art) continue;
      const selector = (typeof spec === "object" && spec?.selector)
        ? spec.selector
        : key.startsWith("codicon-") ? `.${key}` : `svg.trae-icon-${key}`;
      const mask = `url("${art}") center / contain no-repeat`;
      if (key.startsWith("codicon-") || (typeof spec === "object" && spec?.pseudo)) {
        rules.push(`${selector}::before {
  content: "" !important; display: inline-block !important;
  width: 1em; height: 1em; background: currentColor !important;
  -webkit-mask: ${mask} !important; mask: ${mask} !important;
  -webkit-mask-mode: alpha !important; mask-mode: alpha !important;
}`);
      } else {
        rules.push(`${selector} * { display: none !important; }
${selector} {
  background: currentColor !important;
  -webkit-mask: ${mask} !important; mask: ${mask} !important;
  -webkit-mask-mode: alpha !important; mask-mode: alpha !important;
}`);
      }
    }
    if (!rules.length) return 0;
    const el = document.createElement("style");
    el.id = ICONS_STYLE_ID;
    el.textContent = rules.join("\n");
    (document.head || document.documentElement).appendChild(el);
    return rules.length;
  };

  // ---------- v3 主入口：握手 → 扇出 → 自有层 → 护栏 ----------
  const applyV3Theme = (theme, settings) => {
    const appearance = settings.appearance === "light" ? "light" : "dark";
    setAppearance(appearance);
    ensureAppearanceObserver();

    // 角色 → 全命名空间扇出，写到 <html>（覆盖 :root 与 [data-theme] 定义）
    const tokens = settings.tokens || {};
    const varMap = TOKEN_MAP.buildVarMap(tokens, { appearance });
    const htmlStyle = document.documentElement.style;
    const applied = [];
    for (const [name, value] of Object.entries(varMap)) {
      htmlStyle.setProperty(name, value);
      applied.push(name);
    }
    window.__TRAE_DREAM_SKIN_HTML_VARS__ = applied;

    // App 还在 body / .solo-theme / body.icube-chat-next 上重定义令牌（如 --bg-bg-overlay-l1），
    // 按最近祖先原则会遮蔽 <html> 内联值——用带 !important 的作用域规则压过它们
    document.getElementById(SCOPE_STYLE_ID)?.remove();
    const scopeStyle = document.createElement("style");
    scopeStyle.id = SCOPE_STYLE_ID;
    scopeStyle.textContent = `body, .solo-theme, body.icube-chat-next {\n${Object.entries(varMap)
      .map(([name, value]) => `  ${name}: ${value} !important;`)
      .join("\n")}\n}`;
    (document.head || document.documentElement).appendChild(scopeStyle);

    const roles = TOKEN_MAP.deriveRoles(tokens, { appearance });
    const componentRoles = setTraeSkinVarsV3(roles, settings, theme);
    const iconCount = applyIconOverrides(settings);

    document.body.classList.add("trae-skin-v2", "trae-skin-v3");
    document.body.classList.toggle("trae-skin-appearance-dark", appearance === "dark");

    const componentAudit = TOKEN_MAP.auditPairs(COMPONENT_MAP.getContrastPairs(componentRoles));
    const warnings = [
      ...TOKEN_MAP.auditContrast(tokens, { appearance }),
      ...componentAudit.failures,
    ];
    if (warnings.length) console.warn("[twskin] contrast warnings:", JSON.stringify(warnings));
    if (componentAudit.unverifiable.length) {
      console.warn("[twskin] contrast unverifiable:", JSON.stringify(componentAudit.unverifiable));
    }
    return {
      contrastWarnings: warnings.length,
      contrastUnverifiable: componentAudit.unverifiable.length,
      iconOverrides: iconCount,
    };
  };

  const apply = (id) => {
    const theme = findTheme(id);
    if (!theme) return { ok: false, error: `unknown theme: ${id}` };
    clearManagedVars();
    document.body.classList.remove(
      "trae-skin-v2",
      "trae-skin-v3",
      "trae-skin-appearance-dark",
      "trae-skin-effects-max",
      "trae-skin-blur-disabled",
    );
    if (activeThemeClass) document.body.classList.remove(activeThemeClass);
    activeThemeClass = `trae-skin-theme-${theme.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    themeStyle.textContent = theme.customCss || "";
    if (!themeStyle.isConnected) (document.head || document.documentElement).appendChild(themeStyle);
    document.body.classList.add(activeThemeClass);
    setVar("--trae-skin-art", `url("${theme.art}")`);
    const blurEnabled = panelBlurEnabled(theme);
    const brightness = backgroundBrightness(theme);
    const mainOverlay = mainOverlayOpacity(theme);
    document.body.classList.toggle("trae-skin-blur-disabled", !blurEnabled);

    const settings = theme.settings || {};
    const v3Result = applyV3Theme(theme, settings);

    try { localStorage.setItem(LS_KEY, id); } catch {}
    panel?.querySelectorAll(".ds-card").forEach((card) => {
      card.classList.toggle("ds-active", card.dataset.themeId === id);
    });
    renderCurrentConfig(theme);
    renderBlurControl(theme, blurEnabled);
    renderBrightnessControl(theme, brightness);
    renderMainOverlayControl(theme, mainOverlay);
    return {
      ok: true,
      id,
      schemaVersion: theme.settings?.schemaVersion || 1,
      panelBlurEnabled: blurEnabled,
      backgroundBrightness: brightness,
      mainOverlayOpacity: mainOverlay ?? defaultMainOverlayOpacity(theme),
      customCss: Boolean(theme.customCss),
      ...(v3Result || {}),
    };
  };

  // 画廊面板
  const panel = document.createElement("div");
  panel.id = PANEL_ID;
  panel.style.display = "none";
  const header = document.createElement("div");
  header.className = "ds-header";
  const headerText = document.createElement("div");
  headerText.className = "ds-header-text";
  const title = document.createElement("div");
  title.className = "ds-title";
  title.textContent = "主题画廊";
  const currentLabel = document.createElement("div");
  currentLabel.className = "ds-current";
  headerText.append(title, currentLabel);
  const headerActions = document.createElement("div");
  headerActions.className = "ds-header-actions";
  const configToggle = document.createElement("button");
  configToggle.className = "ds-config-toggle";
  configToggle.type = "button";
  configToggle.textContent = "当前主题";
  configToggle.title = "查看当前主题配置";
  const globalToggle = document.createElement("button");
  globalToggle.className = "ds-global-toggle";
  globalToggle.type = "button";
  globalToggle.setAttribute("aria-label", "主题库设置");
  globalToggle.setAttribute("aria-pressed", "false");
  globalToggle.title = "主题库设置";
  globalToggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1 1.7-2.1 2.1-1.7-.1-1.2 1-.4 1.6h-3l-.4-1.6-1.2-1-1.7.1-2.1-2.1.1-1.7-1-1.2L3 13.4v-3l1.6-.4 1-1.2-.1-1.7 2.1-2.1 1.7.1 1.2-1 .4-1.6h3l.4 1.6 1.2 1 1.7-.1 2.1 2.1-.1 1.7 1 1.2 1.6.4v3l-1.6.4-1 1.2Z"/></svg>';
  const syncButton = document.createElement("button");
  syncButton.className = "ds-sync";
  syncButton.type = "button";
  syncButton.textContent = "检查更新";
  syncButton.title = "检查官方主题更新";
  const reloadButton = document.createElement("button");
  reloadButton.className = "ds-local-reload";
  reloadButton.type = "button";
  reloadButton.textContent = "重新扫描本地主题";
  reloadButton.title = "重新加载主题目录（新主题热加载）";
  const closeButton = document.createElement("button");
  closeButton.className = "ds-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.title = "关闭 (Esc)";
  headerActions.append(configToggle, globalToggle, closeButton);
  header.append(headerText, headerActions);
  const panelBody = document.createElement("div");
  panelBody.className = "ds-body";

  const galleryView = document.createElement("div");
  galleryView.className = "ds-gallery-view";
  const syncBanner = document.createElement("div");
  syncBanner.className = "ds-sync-banner";
  const configView = document.createElement("div");
  configView.className = "ds-config-view";
  const configHead = document.createElement("div");
  configHead.className = "ds-config-head";
  const configName = document.createElement("div");
  configName.className = "ds-config-name";
  const copyConfig = document.createElement("button");
  copyConfig.className = "ds-copy-config";
  copyConfig.type = "button";
  copyConfig.textContent = "复制 JSON";
  const configCode = document.createElement("pre");
  configCode.className = "ds-config-code";
  const blurRow = document.createElement("div");
  blurRow.className = "ds-setting-row";
  const blurCopy = document.createElement("div");
  blurCopy.className = "ds-setting-copy";
  const blurLabel = document.createElement("div");
  blurLabel.className = "ds-setting-label";
  blurLabel.textContent = "启用毛玻璃效果";
  blurCopy.append(blurLabel);
  const blurSwitch = document.createElement("button");
  blurSwitch.className = "ds-switch";
  blurSwitch.type = "button";
  blurSwitch.setAttribute("role", "switch");
  blurSwitch.setAttribute("aria-label", "面板模糊");
  blurRow.append(blurCopy, blurSwitch);
  const globalView = document.createElement("div");
  globalView.className = "ds-global-view";
  const globalHead = document.createElement("div");
  globalHead.className = "ds-global-head";
  const globalTitle = document.createElement("div");
  globalTitle.className = "ds-global-title";
  globalTitle.textContent = "主题库设置";
  const globalDesc = document.createElement("div");
  globalDesc.className = "ds-global-desc";
  globalDesc.textContent = "管理所有主题共用的更新与本地目录";
  globalHead.append(globalTitle, globalDesc);
  const checkRow = document.createElement("div");
  checkRow.className = "ds-setting-row";
  const checkCopy = document.createElement("div");
  checkCopy.className = "ds-setting-copy";
  const checkLabel = document.createElement("div");
  checkLabel.className = "ds-setting-label";
  checkLabel.textContent = "检查官方主题更新";
  const checkDesc = document.createElement("div");
  checkDesc.className = "ds-setting-desc";
  checkDesc.setAttribute("aria-live", "polite");
  checkCopy.append(checkLabel, checkDesc);
  checkRow.append(checkCopy, syncButton);
  const updateRow = document.createElement("div");
  updateRow.className = "ds-setting-row";
  const updateCopy = document.createElement("div");
  updateCopy.className = "ds-setting-copy";
  const updateLabel = document.createElement("div");
  updateLabel.className = "ds-setting-label";
  updateLabel.textContent = "自动更新官方主题";
  const updateDesc = document.createElement("div");
  updateDesc.className = "ds-setting-desc";
  updateDesc.textContent = "发现兼容的新主题或更新时自动下载安装";
  updateCopy.append(updateLabel, updateDesc);
  const updateSwitch = document.createElement("button");
  updateSwitch.className = "ds-switch";
  updateSwitch.type = "button";
  updateSwitch.setAttribute("role", "switch");
  updateSwitch.setAttribute("aria-label", "自动更新官方主题");
  updateRow.append(updateCopy, updateSwitch);
  const localThemesRow = document.createElement("div");
  localThemesRow.className = "ds-setting-row ds-local-themes-row";
  const localThemesCopy = document.createElement("div");
  localThemesCopy.className = "ds-setting-copy";
  const localThemesLabel = document.createElement("div");
  localThemesLabel.className = "ds-setting-label";
  localThemesLabel.textContent = "本地主题";
  const localThemesDesc = document.createElement("div");
  localThemesDesc.className = "ds-setting-desc";
  localThemesDesc.textContent = "新增或修改 themes/ 目录后重新读取";
  localThemesCopy.append(localThemesLabel, localThemesDesc);
  localThemesRow.append(localThemesCopy, reloadButton);
  const brightnessRow = document.createElement("div");
  brightnessRow.className = "ds-setting-row ds-setting-row-slider";
  const brightnessHead = document.createElement("div");
  brightnessHead.className = "ds-slider-head";
  const brightnessCopy = document.createElement("div");
  brightnessCopy.className = "ds-setting-copy";
  const brightnessLabel = document.createElement("label");
  brightnessLabel.className = "ds-setting-label";
  brightnessLabel.htmlFor = "trae-dream-skin-brightness";
  brightnessLabel.textContent = "背景亮度";
  const brightnessDesc = document.createElement("div");
  brightnessDesc.className = "ds-setting-desc";
  brightnessDesc.textContent = "只调整壁纸，不改变面板与文字";
  brightnessCopy.append(brightnessLabel, brightnessDesc);
  const brightnessMeta = document.createElement("div");
  brightnessMeta.className = "ds-slider-meta";
  const brightnessValue = document.createElement("output");
  brightnessValue.className = "ds-slider-value";
  brightnessValue.setAttribute("for", "trae-dream-skin-brightness");
  const brightnessReset = document.createElement("button");
  brightnessReset.className = "ds-slider-reset";
  brightnessReset.type = "button";
  brightnessReset.textContent = "默认";
  brightnessReset.title = "恢复当前主题的默认背景亮度";
  brightnessMeta.append(brightnessValue, brightnessReset);
  brightnessHead.append(brightnessCopy, brightnessMeta);
  const brightnessRange = document.createElement("input");
  brightnessRange.id = "trae-dream-skin-brightness";
  brightnessRange.className = "ds-slider";
  brightnessRange.type = "range";
  brightnessRange.min = "0";
  brightnessRange.max = "200";
  brightnessRange.step = "1";
  brightnessRange.setAttribute("aria-label", "背景亮度");
  brightnessRow.append(brightnessHead, brightnessRange);
  const mainOverlayRow = brightnessRow.cloneNode(true);
  const mainOverlayRange = mainOverlayRow.querySelector("input");
  const mainOverlayValue = mainOverlayRow.querySelector("output");
  const mainOverlayReset = mainOverlayRow.querySelector("button");
  const mainOverlayId = "trae-dream-skin-main-overlay";
  mainOverlayRow.querySelector("label").htmlFor = mainOverlayId;
  mainOverlayRow.querySelector("label").textContent = "主区域遮罩";
  mainOverlayRow.querySelector(".ds-setting-desc").textContent = "调整中间工作区覆盖壁纸的透明度";
  mainOverlayRange.id = mainOverlayId;
  mainOverlayRange.max = "100";
  mainOverlayRange.setAttribute("aria-label", "主区域遮罩透明度");
  mainOverlayValue.setAttribute("for", mainOverlayId);
  const resetConfig = document.createElement("button");
  resetConfig.className = "ds-reset-config";
  resetConfig.type = "button";
  resetConfig.textContent = "恢复默认";
  resetConfig.title = "移除 TRAE Work Skin，恢复 TRAE 原生主题";
  const resetCancel = document.createElement("button");
  resetCancel.className = "ds-reset-cancel";
  resetCancel.type = "button";
  resetCancel.textContent = "取消";
  const resetActions = document.createElement("div");
  resetActions.className = "ds-reset-actions";
  resetActions.append(resetCancel, resetConfig);
  configHead.append(configName, copyConfig);
  const restoreRow = document.createElement("div");
  restoreRow.className = "ds-setting-row ds-restore-row";
  const restoreCopy = document.createElement("div");
  restoreCopy.className = "ds-setting-copy";
  const restoreLabel = document.createElement("div");
  restoreLabel.className = "ds-setting-label";
  restoreLabel.textContent = "恢复原生外观";
  const restoreDesc = document.createElement("div");
  restoreDesc.className = "ds-setting-desc";
  restoreDesc.textContent = "停止应用主题化，并恢复 TRAE 默认界面";
  restoreCopy.append(restoreLabel, restoreDesc);
  restoreRow.append(restoreCopy, resetActions);
  configView.append(configHead, brightnessRow, mainOverlayRow, blurRow, configCode);
  globalView.append(globalHead, syncBanner, checkRow, updateRow, localThemesRow, restoreRow);
  panelBody.append(galleryView, configView, globalView);

  // 分类 Tab（固定在头部下，不随列表滚动；选择持久化）
  const CATEGORY_LS = `${LS_PREFIX}category`;
  const ALL_LABEL = "全部";
  const categories = [ALL_LABEL, ...new Set(CATALOG.map((t) => t.category || "其他"))];
  const tabsBar = document.createElement("div");
  tabsBar.className = "ds-tabs";
  let activeCategory = ALL_LABEL;
  try {
    const saved = localStorage.getItem(CATEGORY_LS);
    if (saved && categories.includes(saved)) activeCategory = saved;
  } catch {}
  const applyCategoryFilter = () => {
    galleryView.querySelectorAll(".ds-card").forEach((card) => {
      card.style.display = (activeCategory === ALL_LABEL || card.dataset.category === activeCategory) ? "" : "none";
    });
    tabsBar.querySelectorAll(".ds-tab").forEach((tab) => {
      tab.classList.toggle("ds-tab-active", tab.dataset.category === activeCategory);
    });
    try { localStorage.setItem(CATEGORY_LS, activeCategory); } catch {}
  };
  for (const cat of categories) {
    const tab = document.createElement("button");
    tab.className = "ds-tab";
    tab.type = "button";
    tab.dataset.category = cat;
    tab.textContent = cat;
    tab.addEventListener("click", (event) => {
      event.stopPropagation();
      activeCategory = cat;
      applyCategoryFilter();
    });
    tabsBar.appendChild(tab);
  }

  const footer = document.createElement("div");
  footer.className = "ds-footer";
  const footerText = document.createElement("span");
  footerText.className = "ds-footer-text";
  footerText.textContent = `TRAE Work Skin v${VERSION}`;
  footer.append(footerText);
  panel.append(header, tabsBar, panelBody, footer);

  let activeView = "gallery";
  const showView = (view) => {
    activeView = view;
    // 详情页只呈现对应所有权范围的设置，画廊则恢复主题库操作与分类列表。
    tabsBar.style.display = view === "gallery" ? "" : "none";
    galleryView.style.display = view === "gallery" ? "" : "none";
    configView.style.display = view === "theme" ? "block" : "none";
    globalView.style.display = view === "global" ? "block" : "none";
    configToggle.textContent = view === "gallery" ? "当前主题" : "主题";
    configToggle.title = view === "gallery" ? "查看当前主题配置" : "返回主题列表";
    globalToggle.classList.toggle("ds-global-toggle-active", view === "global");
    globalToggle.setAttribute("aria-pressed", String(view === "global"));
    globalToggle.title = view === "global" ? "返回主题列表" : "主题库设置";
    renderThemeSyncState();
  };
  const showConfig = (open) => showView(open ? "theme" : "gallery");
  renderCurrentConfig = (theme = findTheme(
    (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
  )) => {
    if (!theme) return;
    const config = publicThemeConfig(theme);
    configName.textContent = `${theme.name} · ${theme.id} · v${theme.version || "0.0.0"}`;
    currentLabel.textContent = `当前：${theme.name}`;
    configCode.textContent = JSON.stringify(config, null, 2);
  };
  renderBlurControl = (theme = findTheme(
    (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
  ), enabled = theme ? panelBlurEnabled(theme) : false) => {
    if (!theme) return;
    blurSwitch.setAttribute("aria-checked", String(Boolean(enabled)));
    blurSwitch.title = enabled ? "关闭毛玻璃效果" : "启用毛玻璃效果";
  };
  const requestThemeSync = (action, autoUpdate) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.__TRAE_DREAM_SKIN_SYNC_REQUEST__ = { id, action, ...(typeof autoUpdate === "boolean" ? { autoUpdate } : {}) };
    themeSyncState = {
      ...themeSyncState,
      phase: action === "check" ? "checking" : action === "auto-update" ? "idle" : "downloading",
      message: action === "check" ? "正在检查主题更新" : "正在同步官方主题",
    };
    renderThemeSyncState();
  };
  const syncSummary = () => {
    if (themeSyncState.phase === "checking") return "正在检查主题更新…";
    if (themeSyncState.phase === "downloading" || themeSyncState.phase === "installing") return themeSyncState.message || "正在同步官方主题…";
    if (themeSyncState.phase === "update-available") return `发现 ${themeSyncState.newThemes || 0} 个新主题、${themeSyncState.updatedThemes || 0} 个更新`;
    if (themeSyncState.phase === "success") return themeSyncState.message || "主题同步完成";
    if (themeSyncState.phase === "error") return themeSyncState.message || "主题更新失败";
    return "";
  };
  const SUCCESS_FEEDBACK_DURATION_MS = 4000;
  let successFeedbackTimer = null;
  const hasRecentSyncSuccess = () => {
    if (themeSyncState.phase !== "success") return false;
    const completedAt = Date.parse(themeSyncState.lastSuccessfulSyncAt || "");
    return Number.isFinite(completedAt) && Date.now() - completedAt < SUCCESS_FEEDBACK_DURATION_MS;
  };
  const renderThemeSyncState = () => {
    const phase = themeSyncState.phase || "idle";
    const summary = syncSummary();
    const updateCount = Number(themeSyncState.updateCount || 0);
    const showSuccessFeedback = hasRecentSyncSuccess();
    syncBanner.replaceChildren();
    syncBanner.className = `ds-sync-banner ds-sync-${phase}`;
    if (!summary || phase === "fresh" || phase === "idle" || (phase === "success" && !showSuccessFeedback) || activeView !== "global") {
      syncBanner.style.display = "none";
    } else {
      syncBanner.style.display = "flex";
      const text = document.createElement("span");
      text.className = "ds-sync-copy";
      text.textContent = summary;
      syncBanner.append(text);
      if (phase === "update-available") {
        const install = document.createElement("button");
        install.type = "button";
        install.className = "ds-sync-action";
        install.textContent = "立即更新";
        install.addEventListener("click", (event) => {
          event.stopPropagation();
          requestThemeSync("sync");
        });
        syncBanner.append(install);
      } else if (phase === "error") {
        const retry = document.createElement("button");
        retry.type = "button";
        retry.className = "ds-sync-action";
        retry.textContent = "重试";
        retry.addEventListener("click", (event) => {
          event.stopPropagation();
          requestThemeSync("check");
        });
        syncBanner.append(retry);
      }
    }
    syncButton.classList.toggle("ds-sync-pending", updateCount > 0);
    syncButton.disabled = phase === "checking" || phase === "downloading" || phase === "installing";
    syncButton.title = summary || "检查官方主题更新";
    globalToggle.classList.toggle("ds-global-pending", updateCount > 0);
    let checkStatusCopy = "尚未检查";
    if (phase === "checking") checkStatusCopy = "正在检查更新…";
    else if (phase === "update-available") checkStatusCopy = `发现 ${updateCount} 项更新`;
    else if (phase === "success" && showSuccessFeedback) checkStatusCopy = "已完成同步";
    else if (phase === "error") checkStatusCopy = "检查失败，可重试";
    else if (themeSyncState.lastCheckedAt) checkStatusCopy = `上次检查：${new Date(themeSyncState.lastCheckedAt).toLocaleString()}`;
    checkDesc.textContent = checkStatusCopy;
    if (successFeedbackTimer) {
      clearTimeout(successFeedbackTimer);
      successFeedbackTimer = null;
    }
    if (showSuccessFeedback) {
      const remaining = SUCCESS_FEEDBACK_DURATION_MS - (Date.now() - Date.parse(themeSyncState.lastSuccessfulSyncAt));
      successFeedbackTimer = setTimeout(() => {
        successFeedbackTimer = null;
        renderThemeSyncState();
      }, Math.max(0, remaining));
    }
    updateSwitch.setAttribute("aria-checked", String(Boolean(themeSyncState.autoUpdateThemes)));
    updateSwitch.title = themeSyncState.autoUpdateThemes ? "关闭官方主题自动更新" : "开启官方主题自动更新";
    footerText.textContent = `TRAE Work Skin v${VERSION}`;
  };
  renderBrightnessControl = (theme = findTheme(
    (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
  ), value = theme ? backgroundBrightness(theme) : 1) => {
    if (!theme) return;
    const percent = Math.round(asNumber(value, defaultBackgroundBrightness(theme), 0, 2) * 100);
    brightnessRange.value = String(percent);
    brightnessRange.style.setProperty("--ds-slider-fill", `${percent / 2}%`);
    brightnessRange.setAttribute("aria-valuetext", `${percent}%`);
    brightnessValue.value = `${percent}%`;
    brightnessValue.textContent = `${percent}%`;
    brightnessReset.disabled = Math.abs(value - defaultBackgroundBrightness(theme)) < 0.001;
  };
  renderMainOverlayControl = (theme = findTheme(
    (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
  ), saved = theme ? mainOverlayOpacity(theme) : null) => {
    if (!theme) return;
    const percent = Math.round((saved ?? defaultMainOverlayOpacity(theme)) * 100);
    mainOverlayRange.value = String(percent);
    mainOverlayRange.style.setProperty("--ds-slider-fill", `${percent}%`);
    mainOverlayRange.setAttribute("aria-valuetext", `${percent}%`);
    mainOverlayValue.value = `${percent}%`;
    mainOverlayValue.textContent = `${percent}%`;
    mainOverlayReset.disabled = saved == null;
  };
  configToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (activeView === "gallery") {
      renderCurrentConfig();
      showView("theme");
    } else {
      showView("gallery");
    }
  });
  globalToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    showView(activeView === "global" ? "gallery" : "global");
  });
  syncButton.addEventListener("click", (event) => {
    event.stopPropagation();
    requestThemeSync("check");
  });
  updateSwitch.addEventListener("click", (event) => {
    event.stopPropagation();
    requestThemeSync("auto-update", !themeSyncState.autoUpdateThemes);
  });
  copyConfig.addEventListener("click", async (event) => {
    event.stopPropagation();
    const original = copyConfig.textContent;
    try {
      await navigator.clipboard.writeText(configCode.textContent);
      copyConfig.textContent = "已复制";
    } catch {
      const selection = getSelection();
      const range = document.createRange();
      range.selectNodeContents(configCode);
      selection.removeAllRanges();
      selection.addRange(range);
      copyConfig.textContent = "已选中";
    }
    setTimeout(() => { copyConfig.textContent = original; }, 1200);
  });
  blurSwitch.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = findTheme(
      (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
    );
    if (!current) return;
    savePanelBlur(current, !panelBlurEnabled(current));
    apply(current.id);
  });
  brightnessRange.addEventListener("input", (event) => {
    event.stopPropagation();
    const current = findTheme(
      (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
    );
    if (!current) return;
    const value = saveBackgroundBrightness(current, Number(brightnessRange.value) / 100);
    setVar("--trae-skin-background-brightness", value);
    renderBrightnessControl(current, value);
  });
  brightnessReset.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = findTheme(
      (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
    );
    if (!current) return;
    const value = resetBackgroundBrightness(current);
    setVar("--trae-skin-background-brightness", value);
    renderBrightnessControl(current, value);
  });
  mainOverlayRange.addEventListener("input", (event) => {
    event.stopPropagation();
    const current = findTheme((() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })());
    if (!current) return;
    saveMainOverlayOpacity(current, Number(mainOverlayRange.value) / 100);
    apply(current.id);
  });
  mainOverlayReset.addEventListener("click", (event) => {
    event.stopPropagation();
    const current = findTheme((() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })());
    if (!current) return;
    resetMainOverlayOpacity(current);
    apply(current.id);
  });
  let resetArmed = false;
  let resetTimer = null;
  const disarmReset = () => {
    resetArmed = false;
    clearTimeout(resetTimer);
    resetConfig.classList.remove("ds-reset-armed");
    resetCancel.classList.remove("ds-reset-cancel-visible");
    resetConfig.textContent = "恢复默认";
  };
  resetCancel.addEventListener("click", (event) => {
    event.stopPropagation();
    disarmReset();
  });
  resetConfig.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!resetArmed) {
      resetArmed = true;
      resetConfig.classList.add("ds-reset-armed");
      resetCancel.classList.add("ds-reset-cancel-visible");
      resetConfig.textContent = "确认恢复";
      resetTimer = setTimeout(disarmReset, 8000);
      return;
    }
    disarmReset();
    restoreNativeTheme();
  });

  const activateTheme = (id) => {
    if (disabled) {
      try { localStorage.removeItem(DISABLED_KEY); } catch {}
      disabled = false;
      if (!uiStyle.isConnected) (document.head || document.documentElement).appendChild(uiStyle);
      if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
      if (!themeStyle.isConnected) (document.head || document.documentElement).appendChild(themeStyle);
      configToggle.style.display = "";
      button.title = "TRAE Work Skin 主题画廊";
      ensureSelfHeal();
    }
    return apply(id);
  };

  for (const theme of CATALOG) {
    const card = document.createElement("div");
    card.className = "ds-card";
    card.dataset.themeId = theme.id;
    card.dataset.category = theme.category || "其他";
    const badge = document.createElement("span");
    badge.className = "ds-badge";
    badge.textContent = "当前主题";
    const preview = document.createElement("div");
    preview.className = "ds-preview";
    preview.style.backgroundImage = `url("${theme.art}")`;
    const meta = document.createElement("div");
    meta.className = "ds-meta";
    const name = document.createElement("span");
    name.className = "ds-name";
    name.textContent = theme.name;
    meta.appendChild(name);
    const version = document.createElement("span");
    version.className = "ds-version";
    version.textContent = `v${theme.version || "0.0.0"}`;
    meta.appendChild(version);
    if (theme.desc) {
      const desc = document.createElement("span");
      desc.className = "ds-desc";
      desc.textContent = theme.desc;
      desc.title = theme.desc;
      meta.appendChild(desc);
    }
    card.append(preview, meta, badge);
    card.addEventListener("click", () => activateTheme(theme.id));
    galleryView.appendChild(card);
  }
  applyCategoryFilter();
  renderThemeSyncState();

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.title = "TRAE Work Skin 主题画廊";
  button.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A4.6 4.6 0 0 0 22 9.9C21.6 6 17.2 3 12 3zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>';
  const setPanelOpen = (open) => {
    if (open && !panel.isConnected) document.body.appendChild(panel);
    panel.style.display = open ? "flex" : "none";
  };
  const isPanelOpen = () => panel.style.display !== "none";
  const toggle = () => setPanelOpen(!isPanelOpen());
  button.addEventListener("click", (e) => {
    e.stopPropagation();
    if (disabled) {
      if (!panel.isConnected) document.body.appendChild(panel);
      showConfig(false);
      setPanelOpen(!isPanelOpen());
      return;
    }
    toggle();
  });
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    setPanelOpen(false);
  });
  reloadButton.addEventListener("click", (e) => {
    e.stopPropagation();
    if (reloadButton.classList.contains("ds-local-reload-loading")) return;
    reloadButton.classList.add("ds-local-reload-loading");
    const original = reloadButton.textContent;
    reloadButton.textContent = "正在扫描…";
    // 守护进程轮询到这个标记后会重建主题目录、重新注入并重新打开面板
    window.__TRAE_DREAM_SKIN_RELOAD_REQUEST__ = Date.now();
    setTimeout(() => {
      reloadButton.classList.remove("ds-local-reload-loading");
      reloadButton.textContent = original;
    }, 6000);
  });
  window.__TRAE_DREAM_SKIN_SYNC_LISTENER__ && window.removeEventListener("trae-dream-skin-sync-state", window.__TRAE_DREAM_SKIN_SYNC_LISTENER__);
  window.__TRAE_DREAM_SKIN_SYNC_LISTENER__ = () => {
    const next = window.__TRAE_DREAM_SKIN_SYNC_STATE__;
    if (next && typeof next === "object") {
      themeSyncState = next;
      renderThemeSyncState();
    }
  };
  window.addEventListener("trae-dream-skin-sync-state", window.__TRAE_DREAM_SKIN_SYNC_LISTENER__);
  document.addEventListener("click", (e) => {
    if (isPanelOpen() && !panel.contains(e.target)) setPanelOpen(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setPanelOpen(false);
  });

  if (disabled) {
    configToggle.style.display = "none";
    document.body.append(button);
  } else {
    document.body.append(panel, button);
  }

  // 初始主题：localStorage 里的选择优先，其次 injector 给的默认
  if (!disabled) {
    let initial = null;
    try { initial = localStorage.getItem(LS_KEY); } catch {}
    apply(findTheme(initial) ? initial : DEFAULT_THEME);
  }

  window.__TRAE_DREAM_SKIN__ = VERSION;
  window.__TRAE_DREAM_SKIN_GALLERY__ = {
    version: VERSION,
    apply: activateTheme,
    open: () => setPanelOpen(true),
    close: () => setPanelOpen(false),
    current: () => { try { return localStorage.getItem(LS_KEY); } catch { return null; } },
    config: () => {
      const current = findTheme(
        (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
      );
      return current ? publicThemeConfig(current) : null;
    },
    panelBlur: (enabled) => {
      const current = findTheme(
        (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
      );
      if (!current) return null;
      if (typeof enabled === "boolean") {
        savePanelBlur(current, enabled);
        apply(current.id);
      }
      return panelBlurEnabled(current);
    },
    backgroundBrightness: (value) => {
      const current = findTheme(
        (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
      );
      if (!current) return null;
      if (typeof value === "number") {
        const next = saveBackgroundBrightness(current, value);
        setVar("--trae-skin-background-brightness", next);
        renderBrightnessControl(current, next);
      }
      return backgroundBrightness(current);
    },
    mainOverlayOpacity: (value) => {
      const current = findTheme((() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })());
      if (!current) return null;
      if (typeof value === "number") {
        saveMainOverlayOpacity(current, value);
        apply(current.id);
      }
      return mainOverlayOpacity(current) ?? defaultMainOverlayOpacity(current);
    },
    restoreNative: restoreNativeTheme,
    showConfig: () => {
      renderCurrentConfig();
      showConfig(true);
      setPanelOpen(true);
    },
    themes: () => CATALOG.map((t) => t.id),
  };

  // 自愈：节点被 SPA 清掉时清空标记，让 injector 重新注入
  // 恢复默认后主题样式不存在是正常的，此时改看常驻的管理器样式
  ensureSelfHeal = () => {
    if (window.__TRAE_DREAM_SKIN_OBS__) return;
    const obs = new MutationObserver(() => {
      const requiredIds = disabled ? [UI_STYLE_ID] : [STYLE_ID, THEME_STYLE_ID];
      if (requiredIds.some((id) => !document.getElementById(id))) {
        window.__TRAE_DREAM_SKIN__ = null;
        obs.disconnect();
        window.__TRAE_DREAM_SKIN_OBS__ = null;
      }
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
    window.__TRAE_DREAM_SKIN_OBS__ = obs;
  };
  ensureSelfHeal();

  return {
    ok: true,
    version: VERSION,
    themes: CATALOG.length,
    disabled,
    url: String(location.href),
  };
})();
