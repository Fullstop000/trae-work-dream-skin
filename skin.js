// TRAE Work Dream Skin — 页面内载荷（背景层 + 主题画廊面板）
// injector.mjs 替换 __CATALOG__ / __DEFAULT_THEME__ / __VERSION__ 后经 Runtime.evaluate 执行。
// 幂等：重复执行先移除旧节点再重新挂载；主题选择存 localStorage，重启/导航后保持。
(() => {
  __TOKEN_MAP__
  __COMPONENT_MAP__
  const TOKEN_MAP = self.DREAM_SKIN_TOKEN_MAP;
  const COMPONENT_MAP = self.DREAM_SKIN_COMPONENT_MAP;
  const CATALOG = __CATALOG__;
  const DEFAULT_THEME = __DEFAULT_THEME__;
  const VERSION = __VERSION__;
  const LS_PREFIX = "trae-dream-skin:";
  const LS_KEY = `${LS_PREFIX}theme`;
  const BLUR_LS_PREFIX = `${LS_PREFIX}panel-blur:`;
  const DISABLED_KEY = `${LS_PREFIX}disabled`;
  const STYLE_ID = "trae-dream-skin-style";
  const UI_STYLE_ID = "trae-dream-skin-ui-style";
  const ICONS_STYLE_ID = "trae-dream-skin-icons-style";
  const SCOPE_STYLE_ID = "trae-dream-skin-scope-style";
  const PANEL_ID = "trae-dream-skin-panel";
  const BUTTON_ID = "trae-dream-skin-button";

  window.__TRAE_DREAM_SKIN_OBS__?.disconnect();
  window.__TRAE_DREAM_SKIN_OBS__ = null;
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(UI_STYLE_ID)?.remove();
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
  style.textContent = `
/* 背景层：CSS 变量驱动，切主题只改变量 */
html, body { background: transparent !important; }
body::before {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  z-index: -1 !important;
  pointer-events: none !important;
  background-color: var(--trae-skin-background-color, #10121a) !important;
  background-image: var(--trae-skin-art) !important;
  background-position: var(--trae-skin-background-position, center) !important;
  background-size: var(--trae-skin-background-size, cover) !important;
  background-repeat: var(--trae-skin-background-repeat, no-repeat) !important;
  filter:
    blur(var(--trae-skin-background-blur, 0px))
    brightness(var(--trae-skin-background-brightness, 1))
    saturate(var(--trae-skin-background-saturation, 1)) !important;
  transform: scale(var(--trae-skin-background-scale, 1.01)) !important;
}
body::after {
  content: "" !important;
  position: fixed !important;
  inset: 0 !important;
  z-index: -1 !important;
  pointer-events: none !important;
  background-color: var(--trae-skin-background-overlay, transparent) !important;
  background-image:
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 3px,
      var(--trae-skin-scanline-color, transparent) 3px,
      var(--trae-skin-scanline-color, transparent) 4px
    ),
    linear-gradient(
      to right,
      var(--trae-skin-grid-color, transparent) 1px,
      transparent 1px
    ),
    linear-gradient(
      to bottom,
      var(--trae-skin-grid-color, transparent) 1px,
      transparent 1px
    ) !important;
  background-size: auto, 64px 64px, 64px 64px !important;
}
#root, #solo-lite-root, .solo-lite-layout {
  background: transparent !important;
  background-color: transparent !important;
}
/* 主内容面板：Work 聊天面板 + Code/Design 落地页面板，半透明 + 毛玻璃 */
.solo-lite-chat-panel-container,
.panel-container > .panel-content {
  background: rgba(255, 255, 255, var(--trae-skin-surface-light, 0.78)) !important;
  backdrop-filter: blur(var(--trae-skin-blur, 24px)) saturate(1.3) !important;
  -webkit-backdrop-filter: blur(var(--trae-skin-blur, 24px)) saturate(1.3) !important;
}
.task-list-panel {
  background: rgba(255, 255, 255, 0.55) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
}
body.vs-dark .solo-lite-chat-panel-container,
body.vs-dark .panel-container > .panel-content {
  background: rgba(16, 18, 32, var(--trae-skin-surface-dark, 0.72)) !important;
}
body.vs-dark .task-list-panel { background: rgba(10, 12, 24, 0.55) !important; }

/* Theme V2：每个主区域都有独立表面，不再只控制 background/blur */
body.trae-skin-v2 {
  color: var(--trae-skin-text-primary, inherit);
  font-family: var(--trae-skin-font-ui, inherit);
}
body.trae-skin-v2 .task-list-panel {
  background-color: var(--trae-skin-left-surface) !important;
  background-image: var(--trae-skin-left-art-layer, none) !important;
  background-position: center, var(--trae-skin-left-art-position, center) !important;
  background-size: cover, var(--trae-skin-left-art-size, cover) !important;
  background-repeat: no-repeat !important;
  border-right: 1px solid var(--trae-skin-divider) !important;
  backdrop-filter:
    blur(var(--trae-skin-left-blur))
    saturate(var(--trae-skin-left-saturation)) !important;
  -webkit-backdrop-filter:
    blur(var(--trae-skin-left-blur))
    saturate(var(--trae-skin-left-saturation)) !important;
}
body.trae-skin-v2 .solo-lite-chat-panel-container {
  background: var(--trae-skin-chat-surface) !important;
  border-right: 1px solid var(--trae-skin-divider) !important;
  backdrop-filter:
    blur(var(--trae-skin-chat-blur))
    saturate(var(--trae-skin-chat-saturation)) !important;
  -webkit-backdrop-filter:
    blur(var(--trae-skin-chat-blur))
    saturate(var(--trae-skin-chat-saturation)) !important;
}
body.trae-skin-v2 .solo-lite-main-area {
  background-color: var(--trae-skin-main-surface) !important;
  background-image: var(--trae-skin-right-art-layer, none) !important;
  background-position: center, var(--trae-skin-right-art-position, right center) !important;
  background-size: cover, var(--trae-skin-right-art-size, auto 100%) !important;
  background-repeat: no-repeat !important;
  backdrop-filter:
    blur(var(--trae-skin-main-blur))
    saturate(var(--trae-skin-main-saturation)) !important;
  -webkit-backdrop-filter:
    blur(var(--trae-skin-main-blur))
    saturate(var(--trae-skin-main-saturation)) !important;
}
body.trae-skin-v2 .panel-container > .panel-content {
  background: var(--trae-skin-landing-surface) !important;
  backdrop-filter:
    blur(var(--trae-skin-landing-blur))
    saturate(var(--trae-skin-landing-saturation)) !important;
  -webkit-backdrop-filter:
    blur(var(--trae-skin-landing-blur))
    saturate(var(--trae-skin-landing-saturation)) !important;
}

/* 主面板四周 8px 缝隙：做磨砂+淡色，避免直接露出原图深色边缘（"黑条"） */
.panel-container {
  background: var(--trae-skin-layout-gap, rgba(255, 255, 255, 0.18)) !important;
  backdrop-filter: blur(var(--trae-skin-blur, 24px)) !important;
  -webkit-backdrop-filter: blur(var(--trae-skin-blur, 24px)) !important;
}
body.vs-dark:not(.trae-skin-v2) .panel-container { background: rgba(16, 18, 32, 0.18) !important; }

/* Code 模式内嵌 IDE workbench（打开文件夹后出现）：各部件半透明 */
.monaco-workbench .part.sidebar,
.monaco-workbench .part.activitybar,
.monaco-workbench .part.panel,
.monaco-workbench .part.statusbar,
.monaco-workbench .part.titlebar {
  background-color: rgba(255, 255, 255, 0.55) !important;
  backdrop-filter: blur(16px) !important;
  -webkit-backdrop-filter: blur(16px) !important;
}
.monaco-workbench .part.editor,
.monaco-workbench .monaco-editor-background,
.monaco-workbench .monaco-editor .margin {
  background-color: rgba(255, 255, 255, 0.72) !important;
}
body.vs-dark .monaco-workbench .part.sidebar,
body.vs-dark .monaco-workbench .part.activitybar,
body.vs-dark .monaco-workbench .part.panel,
body.vs-dark .monaco-workbench .part.statusbar,
body.vs-dark .monaco-workbench .part.titlebar {
  background-color: rgba(10, 12, 24, 0.55) !important;
}
body.vs-dark .monaco-workbench .part.editor,
body.vs-dark .monaco-workbench .monaco-editor-background,
body.vs-dark .monaco-workbench .monaco-editor .margin {
  background-color: rgba(16, 18, 32, 0.72) !important;
}
body.trae-skin-v2 .monaco-workbench .part.sidebar,
body.trae-skin-v2 .monaco-workbench .part.activitybar,
body.trae-skin-v2 .monaco-workbench .part.titlebar,
body.trae-skin-v2 .monaco-workbench .part.statusbar {
  background-color: var(--trae-skin-workbench-sidebar) !important;
}
body.trae-skin-v2 .monaco-workbench .part.panel {
  background-color: var(--trae-skin-workbench-panel) !important;
}
body.trae-skin-v2 .monaco-workbench .part.editor,
body.trae-skin-v2 .monaco-workbench .monaco-editor-background,
body.trae-skin-v2 .monaco-workbench .monaco-editor .margin {
  background-color: var(--trae-skin-workbench-editor) !important;
}
body.trae-skin-v2 .monaco-workbench {
  --vscode-foreground: var(--trae-skin-text-primary) !important;
  --vscode-descriptionForeground: var(--trae-skin-text-secondary) !important;
  --vscode-disabledForeground: var(--trae-skin-text-disabled) !important;
  --vscode-focusBorder: var(--trae-skin-accent) !important;
  --vscode-selection-background: var(--trae-skin-accent-subtle) !important;
  --vscode-textLink-foreground: var(--trae-skin-info) !important;
  --vscode-textLink-activeForeground: var(--trae-skin-accent) !important;
  --vscode-editor-foreground: var(--trae-skin-text-primary) !important;
  --vscode-editor-background: transparent !important;
  --vscode-editorCursor-foreground: var(--trae-skin-accent) !important;
  --vscode-editorLineNumber-foreground: var(--trae-skin-text-tertiary) !important;
  --vscode-editorLineNumber-activeForeground: var(--trae-skin-accent) !important;
  --vscode-editor-selectionBackground: var(--trae-skin-accent-subtle) !important;
  --vscode-editor-lineHighlightBorder: var(--trae-skin-border-subtle) !important;
  --vscode-editorWidget-background: var(--trae-skin-menu) !important;
  --vscode-editorWidget-border: var(--trae-skin-border-default) !important;
  --vscode-input-background: var(--trae-skin-input) !important;
  --vscode-input-foreground: var(--trae-skin-text-primary) !important;
  --vscode-input-border: var(--trae-skin-border-default) !important;
  --vscode-button-background: var(--trae-skin-accent) !important;
  --vscode-button-foreground: var(--trae-skin-accent-on) !important;
  --vscode-list-hoverBackground: var(--trae-skin-info-subtle) !important;
  --vscode-list-activeSelectionBackground: var(--trae-skin-accent-subtle) !important;
  --vscode-list-activeSelectionForeground: var(--trae-skin-text-primary) !important;
  --vscode-panel-border: var(--trae-skin-border-default) !important;
  --vscode-sideBar-border: var(--trae-skin-border-default) !important;
  --vscode-tab-activeBorderTop: var(--trae-skin-accent) !important;
  --vscode-terminal-foreground: var(--trae-skin-text-primary) !important;
}

/* Theme V2 组件细节 */
body.trae-skin-v2 ::selection {
  color: var(--trae-skin-text-primary);
  background: var(--trae-skin-accent-subtle);
}
body.trae-skin-v2 button:focus-visible,
body.trae-skin-v2 a[href]:focus-visible,
body.trae-skin-v2 input:focus-visible,
body.trae-skin-v2 select:focus-visible,
body.trae-skin-v2 textarea:focus-visible,
body.trae-skin-v2 [tabindex]:focus-visible:not([contenteditable="true"]):not([role="textbox"]) {
  outline: none !important;
  box-shadow: var(--trae-skin-focus-ring) !important;
}
body.trae-skin-v2 [contenteditable="true"]:focus-visible,
body.trae-skin-v2 [role="textbox"]:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}
body.trae-skin-v2 button[role="tab"][aria-selected="true"] {
  color: var(--trae-skin-accent) !important;
}
body.trae-skin-v2 .user-message__text-box {
  background: var(--trae-skin-chat-user-bubble) !important;
  border: 1px solid var(--trae-skin-chat-user-border) !important;
  border-radius: var(--trae-skin-radius-large) !important;
  box-shadow: var(--trae-skin-shadow-card) !important;
}
body.trae-skin-v2 .core-finish-card {
  background: var(--trae-skin-chat-assistant-message) !important;
  border-color: var(--trae-skin-chat-assistant-border) !important;
  border-radius: var(--trae-skin-radius-medium) !important;
  box-shadow: var(--trae-skin-chat-assistant-shadow) !important;
}
body.trae-skin-v2 .core-finish-card__code-card,
body.trae-skin-v2 [class*="recommendationCard"],
body.trae-skin-v2 [class*="card-QNuQ2F"] {
  background: var(--trae-skin-chat-card) !important;
  border-color: var(--trae-skin-border-subtle) !important;
  border-radius: var(--trae-skin-radius-medium) !important;
  box-shadow: var(--trae-skin-shadow-card) !important;
}
body.trae-skin-v2 [class*="messageInputContainer"],
body.trae-skin-v2 [class*="message-input"],
body.trae-skin-v2 [data-slate-editor="true"] {
  border-color: var(--trae-skin-border-default) !important;
}
body.trae-skin-v2 .core-model-select-portal-content,
body.trae-skin-v2 [data-radix-popper-content-wrapper] > * {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-popover) !important;
  border-color: var(--trae-skin-border-default) !important;
  border-radius: var(--trae-skin-radius-large) !important;
  box-shadow: var(--trae-skin-shadow-floating) !important;
}
body.trae-skin-v2 [role="option"][data-highlighted],
body.trae-skin-v2 [role="menuitem"][data-highlighted] {
  background: var(--trae-skin-popover-hover) !important;
}
body.trae-skin-v2 [role="option"][aria-selected="true"],
body.trae-skin-v2 [role="menuitem"][data-state="checked"] {
  color: var(--trae-skin-accent) !important;
  background: var(--trae-skin-popover-selected) !important;
}

/* Account card：Trae Work 使用独立 CSS module，不走通用 popover。 */
body.trae-skin-v2 [class*="account-module__card___"],
body.trae-skin-v2 [class*="account-module__subMenuInner___"] {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-popover) !important;
  border: 1px solid var(--trae-skin-border-default) !important;
  box-shadow: var(--trae-skin-shadow-floating) !important;
}
body.trae-skin-v2 [class*="account-module__card___"] [class*="account-module__"] {
  color: var(--trae-skin-text-primary) !important;
}
body.trae-skin-v2 [class*="account-module__card___"] [class*="menuItemIconLeft"],
body.trae-skin-v2 [class*="account-module__card___"] [class*="subMenuValue"] {
  color: var(--trae-skin-text-secondary) !important;
}
body.trae-skin-v2 [class*="account-module__card___"] [class*="subMenuArrow"] {
  color: var(--trae-skin-accent) !important;
}
body.trae-skin-v2 [class*="account-module__card___"] [class*="menuSectionDivider"] {
  border-color: var(--trae-skin-border-subtle) !important;
}
body.trae-skin-v2 [class*="account-module__card___"] [class*="menuItem"]:hover,
body.trae-skin-v2 [class*="account-module__card___"] [class*="subMenu"]:hover,
body.trae-skin-v2 [class*="account-module__card___"] [class*="optionItem"]:hover {
  background: var(--trae-skin-popover-hover) !important;
}
body.trae-skin-v2 [class*="account-module__logoutButton"] {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-popover-hover) !important;
  border: 1px solid var(--trae-skin-border-subtle) !important;
}

/* Settings：外壳、侧栏、内容卡和控件均由 components.settings 驱动。 */
body.trae-skin-v2 .solo-lite-settings-overlay {
  background: var(--trae-skin-settings-overlay) !important;
}
body.trae-skin-v2 .solo-lite-settings-content {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-settings-panel) !important;
  border: 1px solid var(--trae-skin-border-default) !important;
  border-radius: var(--trae-skin-radius-large) !important;
  box-shadow: var(--trae-skin-shadow-floating) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icube-settings-sidebar-container {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-settings-sidebar) !important;
  border-right: 1px solid var(--trae-skin-border-subtle) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icube-settings-content {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-settings-panel) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icu-settings-title,
body.trae-skin-v2 .solo-lite-settings-content .icu-settings-title-content,
body.trae-skin-v2 .solo-lite-settings-content .icb-setting-item-label,
body.trae-skin-v2 .solo-lite-settings-content .user-name,
body.trae-skin-v2 .solo-lite-settings-content .user-name-text {
  color: var(--trae-skin-text-primary) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icb-setting-item-description,
body.trae-skin-v2 .solo-lite-settings-content .user-description,
body.trae-skin-v2 .solo-lite-settings-content .bytedance {
  color: var(--trae-skin-text-secondary) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .settings-sidebar-menu-item {
  color: var(--trae-skin-text-secondary) !important;
  background: transparent !important;
}
body.trae-skin-v2 .solo-lite-settings-content .settings-sidebar-menu-item .text,
body.trae-skin-v2 .solo-lite-settings-content .settings-sidebar-menu-item .prefix {
  color: inherit !important;
}
body.trae-skin-v2 .solo-lite-settings-content .settings-sidebar-menu-item:hover {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-popover-hover) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .settings-sidebar-menu-item.active {
  color: var(--trae-skin-accent) !important;
  background: var(--trae-skin-settings-active) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .menu-divider {
  background: var(--trae-skin-border-subtle) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icb-settings-container {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-settings-card) !important;
  border-color: var(--trae-skin-border-subtle) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icube-settings-theme-menu-trigger,
body.trae-skin-v2 .solo-lite-settings-content .icube-setting-language-trigger,
body.trae-skin-v2 .solo-lite-settings-content .icd-btn,
body.trae-skin-v2 .solo-lite-settings-content .icd-btn-v2,
body.trae-skin-v2 .solo-lite-settings-content input,
body.trae-skin-v2 .solo-lite-settings-content textarea,
body.trae-skin-v2 .solo-lite-settings-content select {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-settings-control) !important;
  border-color: var(--trae-skin-border-default) !important;
}
body.trae-skin-v2 .solo-lite-settings-content .icube-settings-theme-menu-trigger *,
body.trae-skin-v2 .solo-lite-settings-content .icube-setting-language-trigger *,
body.trae-skin-v2 .solo-lite-settings-content .icd-btn *,
body.trae-skin-v2 .solo-lite-settings-content .icd-btn-v2 * {
  color: inherit !important;
}
body.trae-skin-v2 [role="listbox"] {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-popover) !important;
  border-color: var(--trae-skin-border-default) !important;
  box-shadow: var(--trae-skin-shadow-floating) !important;
}
body.trae-skin-v2 [role="option"]:hover {
  background: var(--trae-skin-popover-hover) !important;
}
body.trae-skin-v2 [role="option"][aria-selected="true"] {
  color: var(--trae-skin-accent) !important;
  background: var(--trae-skin-popover-selected) !important;
}

/* V3 components.landing.banner — system-plate */
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"]:has(.messageInputContainer[data-mode="work"]) {
  --trae-skin-banner-current-code: var(--trae-skin-banner-code-work);
  --trae-skin-banner-current-label: var(--trae-skin-banner-label-work);
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"]:has(.messageInputContainer[data-mode="code"]) {
  --trae-skin-banner-current-code: var(--trae-skin-banner-code-code);
  --trae-skin-banner-current-label: var(--trae-skin-banner-label-code);
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"]:has(.messageInputContainer[data-mode="design"]) {
  --trae-skin-banner-current-code: var(--trae-skin-banner-code-design);
  --trae-skin-banner-current-label: var(--trae-skin-banner-label-design);
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper {
  margin-bottom: 30px !important;
  padding: 0 24px !important;
  box-sizing: border-box !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="traeWorkTitle-"] {
  position: relative !important;
  align-items: stretch !important;
  box-sizing: border-box !important;
  width: min(var(--trae-skin-banner-max-width), calc(100% - 24px)) !important;
  max-width: var(--trae-skin-banner-max-width) !important;
  padding: 30px 30px 22px !important;
  color: var(--trae-skin-banner-text) !important;
  background:
    linear-gradient(90deg, var(--trae-skin-banner-border) 0 62%, transparent 62% 65%, var(--trae-skin-banner-accent) 65% 100%) top / 100% 2px no-repeat,
    linear-gradient(90deg, var(--trae-skin-banner-accent) 0 22%, transparent 22% 25%, var(--trae-skin-banner-border) 25% 100%) bottom / 100% 2px no-repeat,
    var(--trae-skin-banner-surface) !important;
  border: 1px solid var(--trae-skin-banner-border) !important;
  border-radius: 0 !important;
  clip-path: polygon(
    0 var(--trae-skin-banner-corner-cut),
    var(--trae-skin-banner-corner-cut) 0,
    calc(100% - var(--trae-skin-banner-corner-cut)) 0,
    100% var(--trae-skin-banner-corner-cut),
    100% calc(100% - var(--trae-skin-banner-corner-cut)),
    calc(100% - var(--trae-skin-banner-corner-cut)) 100%,
    var(--trae-skin-banner-corner-cut) 100%,
    0 calc(100% - var(--trae-skin-banner-corner-cut))
  ) !important;
  box-shadow: var(--trae-skin-banner-shadow) !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="traeWorkTitle-"]::before {
  content: var(--trae-skin-banner-current-code) "  /  " var(--trae-skin-banner-current-label);
  position: absolute;
  top: 9px;
  left: 30px;
  color: var(--trae-skin-banner-muted);
  font: 700 9px/1 var(--trae-skin-font-code);
  letter-spacing: 0.16em;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="traeWorkTitle-"]::after {
  content: "●  " var(--trae-skin-banner-status);
  position: absolute;
  top: 8px;
  right: 30px;
  color: var(--trae-skin-banner-status-color);
  font: 700 9px/1 var(--trae-skin-font-code);
  letter-spacing: 0.12em;
  text-shadow: 0 0 9px color-mix(in srgb, var(--trae-skin-banner-status-color) 55%, transparent);
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="animationContainer-"] {
  align-items: stretch !important;
  width: 100% !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="mainTextContainer-"] {
  justify-content: flex-start !important;
  width: 100% !important;
  column-gap: 16px !important;
  font-family: var(--trae-skin-font-heading) !important;
  font-size: 30px !important;
  font-weight: var(--trae-skin-heading-weight) !important;
  letter-spacing: var(--trae-skin-heading-spacing) !important;
  line-height: 1.1 !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="mainTextContainer-"] > [class*="icon-"] {
  display: inline-grid !important;
  flex: 0 0 var(--trae-skin-banner-icon-size) !important;
  width: var(--trae-skin-banner-icon-size) !important;
  height: var(--trae-skin-banner-icon-size) !important;
  place-items: center !important;
  color: var(--trae-skin-banner-accent) !important;
  background: color-mix(in srgb, var(--trae-skin-banner-border) 24%, transparent) !important;
  border: 1px solid var(--trae-skin-banner-border) !important;
  clip-path: polygon(0 10px, 10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%) !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="mainTextContainer-"] > [class*="icon-"] svg {
  width: 62% !important;
  height: 62% !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="workText-"],
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="codeText-"],
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="designText-"] {
  color: var(--trae-skin-banner-text) !important;
}
body.trae-skin-v3[data-trae-skin-landing-banner="system-plate"] .welcomeTitleWrapper [class*="withTraeText-"] {
  align-self: flex-end !important;
  margin-bottom: 4px !important;
  color: var(--trae-skin-banner-muted) !important;
  font: 600 11px/1 var(--trae-skin-font-code) !important;
  letter-spacing: 0.12em !important;
  text-transform: uppercase !important;
}

/* V3 components.navigation.modeTabs — launch-rail */
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn {
  box-sizing: border-box !important;
  height: var(--trae-skin-mode-tabs-height) !important;
  padding: 3px !important;
  gap: var(--trae-skin-mode-tabs-gap) !important;
  background: var(--trae-skin-mode-tabs-track) !important;
  border: 1px solid var(--trae-skin-mode-tabs-border) !important;
  border-radius: 0 !important;
  clip-path: polygon(
    0 var(--trae-skin-mode-tabs-corner-cut),
    var(--trae-skin-mode-tabs-corner-cut) 0,
    calc(100% - var(--trae-skin-mode-tabs-corner-cut)) 0,
    100% var(--trae-skin-mode-tabs-corner-cut),
    100% 100%, 0 100%
  ) !important;
  box-shadow: var(--trae-skin-mode-tabs-shadow) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn [class*="indicator-"] {
  top: 3px !important;
  left: 3px !important;
  width: var(--trae-skin-mode-tabs-tab-width) !important;
  height: calc(var(--trae-skin-mode-tabs-height) - 8px) !important;
  background:
    linear-gradient(110deg, var(--trae-skin-mode-tabs-indicator) 0 78%, var(--trae-skin-mode-tabs-accent) 78% 100%) !important;
  border: 1px solid color-mix(in srgb, var(--trae-skin-mode-tabs-accent) 52%, var(--trae-skin-mode-tabs-border)) !important;
  border-radius: 0 !important;
  clip-path: polygon(0 7px, 7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%) !important;
  box-shadow: inset 3px 0 var(--trae-skin-mode-tabs-accent) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn:has(> span:nth-of-type(2) button[aria-selected="true"]) [class*="indicator-"] {
  left: calc(3px + var(--trae-skin-mode-tabs-tab-width) + var(--trae-skin-mode-tabs-gap)) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn:has(> span:nth-of-type(3) button[aria-selected="true"]) [class*="indicator-"] {
  left: calc(3px + var(--trae-skin-mode-tabs-tab-width) + var(--trae-skin-mode-tabs-gap) + var(--trae-skin-mode-tabs-tab-width) + var(--trae-skin-mode-tabs-gap)) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn > span {
  flex: 0 0 var(--trae-skin-mode-tabs-tab-width) !important;
  width: var(--trae-skin-mode-tabs-tab-width) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn button[role="tab"] {
  box-sizing: border-box !important;
  flex: 0 0 var(--trae-skin-mode-tabs-tab-width) !important;
  width: var(--trae-skin-mode-tabs-tab-width) !important;
  height: calc(var(--trae-skin-mode-tabs-height) - 8px) !important;
  padding: 2px 7px !important;
  color: var(--trae-skin-mode-tabs-inactive-text) !important;
  background: transparent !important;
  border-radius: 0 !important;
  font: 600 12px/1 var(--trae-skin-font-ui) !important;
  letter-spacing: 0.01em !important;
  transition: color 150ms ease, transform 150ms ease, background 150ms ease !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn button[role="tab"]:hover:not([aria-selected="true"]) {
  color: var(--trae-skin-mode-tabs-active-text) !important;
  background: var(--trae-skin-mode-tabs-hover) !important;
  transform: translateY(-1px) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tabs="launch-rail"] .mode-switcher-btn button[role="tab"][aria-selected="true"] {
  color: var(--trae-skin-mode-tabs-active-text) !important;
  background: transparent !important;
  text-shadow: 0 0 8px color-mix(in srgb, var(--trae-skin-mode-tabs-accent) 48%, transparent) !important;
}
body.trae-skin-v3[data-trae-skin-mode-tab-icons="always"] .mode-switcher-btn [class*="tabIcon-"] {
  width: 16px !important;
  margin-right: 5px !important;
  opacity: 0.68 !important;
  transform: none !important;
}
body.trae-skin-v3[data-trae-skin-mode-tab-icons="always"] .mode-switcher-btn button[aria-selected="true"] [class*="tabIcon-"] {
  color: var(--trae-skin-mode-tabs-accent) !important;
  opacity: 1 !important;
}
body.trae-skin-v3[data-trae-skin-mode-tab-icons="never"] .mode-switcher-btn [class*="tabIcon-"] {
  display: none !important;
}
body.trae-skin-v3[data-trae-skin-mode-tab-codes="true"] .mode-switcher-btn button[role="tab"]::after {
  margin-left: 5px;
  color: var(--trae-skin-mode-tabs-accent);
  font: 700 7px/1 var(--trae-skin-font-code);
  letter-spacing: 0.08em;
  opacity: 0.72;
}
body.trae-skin-v3[data-trae-skin-mode-tab-codes="true"] .mode-switcher-btn > span:nth-of-type(1) button[role="tab"]::after { content: var(--trae-skin-mode-tabs-code-work); }
body.trae-skin-v3[data-trae-skin-mode-tab-codes="true"] .mode-switcher-btn > span:nth-of-type(2) button[role="tab"]::after { content: var(--trae-skin-mode-tabs-code-code); }
body.trae-skin-v3[data-trae-skin-mode-tab-codes="true"] .mode-switcher-btn > span:nth-of-type(3) button[role="tab"]::after { content: var(--trae-skin-mode-tabs-code-design); }

body.trae-skin-theme-xianzhou-luofu .task-list-panel svg,
body.trae-skin-theme-xianzhou-luofu .solo-lite-main-area svg {
  filter: drop-shadow(0 0 4px #6fc8bd52);
}
body.trae-skin-theme-xianzhou-luofu [role="tab"][aria-selected="true"] svg,
body.trae-skin-theme-xianzhou-luofu [aria-current="page"] svg,
body.trae-skin-theme-xianzhou-luofu [data-state="checked"] svg {
  color: #dfbf69 !important;
  filter: drop-shadow(0 0 5px #dfbf6970);
}
body.trae-skin-v2 [data-sonner-toast] {
  color: var(--trae-skin-text-primary) !important;
  background: var(--trae-skin-menu) !important;
  border-color: var(--trae-skin-border-default) !important;
  border-radius: var(--trae-skin-radius-medium) !important;
  box-shadow: var(--trae-skin-shadow-floating) !important;
}
body.trae-skin-v2 code {
  color: var(--trae-skin-text-secondary) !important;
  background: var(--trae-skin-chat-code) !important;
  border-color: var(--trae-skin-border-subtle) !important;
  font-family: var(--trae-skin-font-code) !important;
}
body.trae-skin-v2 .markdown-renderer strong {
  color: var(--trae-skin-text-primary) !important;
}
body.trae-skin-v2 .markdown-renderer a {
  color: var(--trae-skin-info) !important;
}
body.trae-skin-v2 h1,
body.trae-skin-v2 h2,
body.trae-skin-v2 h3 {
  font-family: var(--trae-skin-font-heading) !important;
  font-weight: var(--trae-skin-heading-weight) !important;
  letter-spacing: var(--trae-skin-heading-spacing) !important;
}
body.trae-skin-v2 * {
  scrollbar-color: var(--trae-skin-scrollbar-thumb) var(--trae-skin-scrollbar-track);
  scrollbar-width: thin;
}
body.trae-skin-v2 *::-webkit-scrollbar {
  width: var(--trae-skin-scrollbar-width);
  height: var(--trae-skin-scrollbar-width);
}
body.trae-skin-v2 *::-webkit-scrollbar-track {
  background: var(--trae-skin-scrollbar-track);
}
body.trae-skin-v2 *::-webkit-scrollbar-thumb {
  background: var(--trae-skin-scrollbar-thumb);
  border-radius: var(--trae-skin-radius-pill);
}
body.trae-skin-v2 *::-webkit-scrollbar-thumb:hover {
  background: var(--trae-skin-scrollbar-hover);
}

/* MAX 特效：只由明确开启 effects.mode=max 的主题使用 */
@keyframes trae-skin-scan {
  from { background-position: 0 0, 0 0, 0 0; }
  to { background-position: 0 16px, 64px 0, 0 64px; }
}
body.trae-skin-effects-max::after {
  animation: trae-skin-scan 5s linear infinite;
}
body.trae-skin-effects-max .task-list-panel {
  box-shadow:
    inset -1px 0 var(--trae-skin-info),
    inset 0 3px var(--trae-skin-accent),
    var(--trae-skin-neon-glow) !important;
}
body.trae-skin-effects-max .solo-lite-chat-panel-container,
body.trae-skin-effects-max .panel-container > .panel-content,
body.trae-skin-effects-max .solo-lite-main-area {
  box-shadow:
    inset 0 1px var(--trae-skin-info),
    inset 0 -1px var(--trae-skin-magenta),
    var(--trae-skin-neon-glow) !important;
}
body.trae-skin-effects-max button[role="tab"][aria-selected="true"] {
  color: var(--trae-skin-accent-on) !important;
  background: var(--trae-skin-accent) !important;
  border-color: var(--trae-skin-info) !important;
  border-radius: 0 !important;
  clip-path: polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 9px 100%, 0 calc(100% - 9px));
  box-shadow: 0 0 18px var(--trae-skin-accent) !important;
}
body.trae-skin-effects-max .user-message__text-box,
body.trae-skin-effects-max .core-finish-card,
body.trae-skin-effects-max [class*="messageInputContainer"] {
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
}
body.trae-skin-effects-max .core-finish-card,
body.trae-skin-effects-max .core-finish-card__code-card {
  border-left: 3px solid var(--trae-skin-accent) !important;
}
body.trae-skin-effects-max h1,
body.trae-skin-effects-max h2,
body.trae-skin-effects-max h3 {
  color: var(--trae-skin-accent) !important;
  text-shadow:
    1px 0 var(--trae-skin-info),
    -1px 0 var(--trae-skin-magenta),
    0 0 16px #f4e90073;
}

/* EVA 初号机 · 测试设施：把主题语言落到组件，而不只是一张背景图 */
body.trae-skin-theme-eva-01-light .task-list-panel,
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container,
body.trae-skin-theme-eva-01-light .solo-lite-main-area,
body.trae-skin-theme-eva-01-light .panel-container > .panel-content {
  border-color: rgba(97, 50, 154, 0.18) !important;
  backdrop-filter: blur(18px) saturate(1.16) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.16) !important;
}
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container {
  background: rgba(248, 252, 255, 0.48) !important;
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.9),
    inset 0 -1px rgba(97, 50, 154, 0.12) !important;
}
body.trae-skin-theme-eva-01-light .user-message__text-box {
  color: var(--trae-skin-text-primary) !important;
  background: rgba(238, 231, 246, 0.84) !important;
  border: 1px solid rgba(97, 50, 154, 0.32) !important;
  backdrop-filter: blur(12px) saturate(1.14) !important;
  -webkit-backdrop-filter: blur(12px) saturate(1.14) !important;
  box-shadow: 0 8px 22px rgba(48, 63, 76, 0.09), inset 0 1px rgba(255, 255, 255, 0.9) !important;
}
body.trae-skin-theme-eva-01-light .core-finish-card {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
body.trae-skin-theme-eva-01-light .core-finish-card__code-card,
body.trae-skin-theme-eva-01-light [class*="recommendationCard"],
body.trae-skin-theme-eva-01-light [class*="card-QNuQ2F"] {
  background: rgba(255, 255, 255, 0.78) !important;
  border: 1px solid rgba(97, 50, 154, 0.16) !important;
  backdrop-filter: blur(14px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(14px) saturate(1.12) !important;
}
body.trae-skin-theme-eva-01-light [class*="messageInputContainer"],
body.trae-skin-theme-eva-01-light [class*="message-input"] {
  background: rgba(255, 255, 255, 0.78) !important;
  border: 1px solid rgba(97, 50, 154, 0.26) !important;
  backdrop-filter: blur(16px) saturate(1.15) !important;
  -webkit-backdrop-filter: blur(16px) saturate(1.15) !important;
  box-shadow: 0 12px 30px rgba(42, 67, 82, 0.11), inset 0 1px rgba(255, 255, 255, 0.96) !important;
}
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container table {
  overflow: hidden !important;
  border: 1px solid rgba(97, 50, 154, 0.22) !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: rgba(255, 255, 255, 0.76) !important;
  backdrop-filter: blur(12px) saturate(1.1) !important;
  -webkit-backdrop-filter: blur(12px) saturate(1.1) !important;
  box-shadow: 0 8px 22px rgba(44, 68, 82, 0.08) !important;
}
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container th {
  color: var(--trae-skin-text-primary) !important;
  background: rgba(97, 50, 154, 0.1) !important;
  border-color: rgba(97, 50, 154, 0.2) !important;
}
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container td {
  background: rgba(255, 255, 255, 0.14) !important;
  border-color: rgba(46, 131, 170, 0.16) !important;
}
body.trae-skin-theme-eva-01-light .solo-lite-chat-panel-container tr:hover td {
  background: rgba(166, 213, 58, 0.08) !important;
}
body.trae-skin-theme-eva-01-light pre,
body.trae-skin-theme-eva-01-light .core-finish-card__code-card {
  border-left: 3px solid rgba(46, 131, 170, 0.6) !important;
}
body.trae-skin-theme-eva-01-light.trae-skin-effects-max h1,
body.trae-skin-theme-eva-01-light.trae-skin-effects-max h2,
body.trae-skin-theme-eva-01-light.trae-skin-effects-max h3 {
  color: #271d30 !important;
  text-shadow: none !important;
}

/* EVA 初号机 · 终局警报：张力留在边缘，正文区域保持安静 */
body.trae-skin-theme-eva-01 .task-list-panel,
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container,
body.trae-skin-theme-eva-01 .solo-lite-main-area,
body.trae-skin-theme-eva-01 .panel-container > .panel-content {
  border-color: rgba(157, 98, 189, 0.26) !important;
}
body.trae-skin-theme-eva-01 .task-list-panel {
  backdrop-filter: blur(4px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(4px) saturate(1.08) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container {
  backdrop-filter: blur(3px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(3px) saturate(1.08) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-main-area,
body.trae-skin-theme-eva-01 .panel-container > .panel-content {
  backdrop-filter: blur(18px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(18px) saturate(1.12) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container {
  background: rgba(13, 11, 15, 0.54) !important;
  box-shadow:
    inset 0 1px rgba(255, 255, 255, 0.04),
    inset 0 -1px rgba(182, 245, 44, 0.13) !important;
}
body.trae-skin-theme-eva-01 .user-message__text-box {
  color: var(--trae-skin-text-primary) !important;
  background: rgba(42, 24, 48, 0.86) !important;
  border: 1px solid rgba(135, 85, 163, 0.5) !important;
  backdrop-filter: blur(12px) saturate(1.1) !important;
  -webkit-backdrop-filter: blur(12px) saturate(1.1) !important;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.36), inset 0 1px rgba(255, 255, 255, 0.05) !important;
}
body.trae-skin-theme-eva-01 .core-finish-card {
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}
body.trae-skin-theme-eva-01 .core-finish-card__code-card,
body.trae-skin-theme-eva-01 [class*="recommendationCard"],
body.trae-skin-theme-eva-01 [class*="card-QNuQ2F"] {
  background: rgba(21, 18, 23, 0.82) !important;
  border: 1px solid rgba(139, 91, 109, 0.28) !important;
  backdrop-filter: blur(14px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(14px) saturate(1.08) !important;
}
body.trae-skin-theme-eva-01 [class*="messageInputContainer"],
body.trae-skin-theme-eva-01 [class*="message-input"] {
  background: rgba(11, 10, 12, 0.84) !important;
  border: 1px solid rgba(182, 245, 44, 0.3) !important;
  backdrop-filter: blur(16px) saturate(1.12) !important;
  -webkit-backdrop-filter: blur(16px) saturate(1.12) !important;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.48), inset 0 1px rgba(255, 255, 255, 0.05) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-input-box-editable,
body.trae-skin-theme-eva-01 .chat-input-v2-input-box-editable p {
  color: var(--trae-skin-text-primary) !important;
  caret-color: var(--trae-skin-accent) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-placeholder {
  color: var(--trae-skin-text-disabled) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container table {
  overflow: hidden !important;
  border: 1px solid rgba(139, 91, 109, 0.3) !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  background: rgba(15, 13, 17, 0.8) !important;
  backdrop-filter: blur(12px) saturate(1.08) !important;
  -webkit-backdrop-filter: blur(12px) saturate(1.08) !important;
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.3) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container th {
  color: var(--trae-skin-text-primary) !important;
  background: rgba(106, 61, 132, 0.34) !important;
  border-color: rgba(157, 98, 189, 0.3) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container td {
  background: rgba(10, 9, 11, 0.18) !important;
  border-color: rgba(139, 91, 109, 0.2) !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container tr:hover td {
  background: rgba(182, 245, 44, 0.06) !important;
}
/* EVA-01 输入控制台：紫色承载结构，绿色只标识可操作状态 */
body.trae-skin-theme-eva-01 .messageInputContainer {
  --eva-console-purple: #9f62c0;
  --eva-console-purple-deep: #3a2048;
  --eva-console-green: #b6f52c;
  --eva-console-black: #0b090d;
  position: relative !important;
  isolation: isolate !important;
}
body.trae-skin-theme-eva-01 .messageInputEditorWrapper {
  position: relative !important;
  box-sizing: border-box !important;
  padding: 2px !important;
  border: 0 !important;
  border-radius: 0 !important;
  background:
    linear-gradient(90deg,
      var(--eva-console-purple) 0 22%,
      rgba(159, 98, 192, 0.2) 22% 66%,
      var(--eva-console-green) 66% 100%) !important;
  clip-path: polygon(0 15px, 15px 0, calc(100% - 48px) 0, calc(100% - 36px) 12px, 100% 12px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 30px 100%, 18px calc(100% - 12px), 0 calc(100% - 12px)) !important;
  filter: drop-shadow(0 16px 32px rgba(0, 0, 0, 0.52)) !important;
  transition: filter 180ms ease, background 180ms ease !important;
}
body.trae-skin-theme-eva-01 .messageInputEditorWrapper::before {
  content: "EVA-01  /  ENTRY LINK";
  position: absolute;
  z-index: 5;
  top: 4px;
  left: 24px;
  color: rgba(229, 206, 239, 0.82);
  font: 650 9px/1 "JetBrains Mono", "SFMono-Regular", monospace;
  letter-spacing: 0.15em;
  pointer-events: none;
}
body.trae-skin-theme-eva-01 .messageInputEditorWrapper::after {
  content: "SYNC";
  position: absolute;
  z-index: 5;
  top: 3px;
  right: 48px;
  padding-left: 13px;
  color: var(--eva-console-green);
  font: 700 9px/1.2 "JetBrains Mono", "SFMono-Regular", monospace;
  letter-spacing: 0.12em;
  background: radial-gradient(circle at 4px 50%, var(--eva-console-green) 0 2px, transparent 2.5px);
  text-shadow: 0 0 10px rgba(182, 245, 44, 0.5);
  pointer-events: none;
}
body.trae-skin-theme-eva-01 .messageInputEditorWrapper:has(.chat-input-v2-input-box-editable:focus) {
  background: linear-gradient(90deg, var(--eva-console-purple) 0 52%, var(--eva-console-green) 52% 100%) !important;
  filter: drop-shadow(0 18px 36px rgba(0, 0, 0, 0.56)) drop-shadow(0 0 10px rgba(182, 245, 44, 0.14)) !important;
}
body.trae-skin-theme-eva-01 .messageInputChatInput {
  overflow: hidden !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: linear-gradient(112deg, rgba(22, 13, 27, 0.98), rgba(10, 9, 12, 0.96) 62%, rgba(27, 18, 31, 0.98)) !important;
  clip-path: polygon(0 14px, 14px 0, calc(100% - 47px) 0, calc(100% - 35px) 12px, 100% 12px, 100% calc(100% - 13px), calc(100% - 13px) 100%, 29px 100%, 17px calc(100% - 12px), 0 calc(100% - 12px)) !important;
  box-shadow: inset 0 0 0 1px rgba(226, 202, 239, 0.05) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-editor-part {
  position: relative !important;
  padding: 24px 16px 0 20px !important;
  background:
    linear-gradient(90deg, rgba(108, 60, 134, 0.26), transparent 18%),
    repeating-linear-gradient(135deg, transparent 0 12px, rgba(159, 98, 192, 0.025) 12px 13px) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-editor-part::before {
  content: "";
  position: absolute;
  top: 30px;
  bottom: 44px;
  left: 8px;
  width: 4px;
  background: linear-gradient(to bottom, var(--eva-console-purple) 0 68%, transparent 68% 76%, var(--eva-console-green) 76% 100%);
  box-shadow: 0 0 12px rgba(159, 98, 192, 0.28);
}
body.trae-skin-theme-eva-01 .chat-input-v2-input-box-wrapper {
  min-height: 52px !important;
  padding: 3px 4px 6px !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-placeholder {
  max-width: calc(100% - 38px) !important;
  color: #918493 !important;
  font-size: 12px !important;
  line-height: 1.5 !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-editor-part-lower-content {
  min-height: 42px !important;
  margin: 0 -16px 0 -20px !important;
  padding: 7px 12px 7px 18px !important;
  border-top: 1px solid rgba(159, 98, 192, 0.32) !important;
  background:
    linear-gradient(90deg, rgba(79, 39, 96, 0.46), rgba(14, 11, 16, 0.84) 38%, rgba(30, 25, 22, 0.82)) !important;
  box-shadow: inset 0 1px rgba(255, 255, 255, 0.025) !important;
}
body.trae-skin-theme-eva-01 .messageInputToolbarIconBtn,
body.trae-skin-theme-eva-01 .rtcVoicePluginButton,
body.trae-skin-theme-eva-01 .voiceCallButton {
  position: relative !important;
  width: 28px !important;
  height: 28px !important;
  border: 1px solid rgba(159, 98, 192, 0.28) !important;
  border-radius: 0 !important;
  color: #cbbbd0 !important;
  background: rgba(40, 25, 47, 0.56) !important;
  clip-path: polygon(0 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%) !important;
  transition: color 150ms ease, background 150ms ease, border-color 150ms ease, transform 150ms ease !important;
}
body.trae-skin-theme-eva-01 .messageInputToolbarIconBtn:hover,
body.trae-skin-theme-eva-01 .rtcVoicePluginButton:hover,
body.trae-skin-theme-eva-01 .voiceCallButton:hover {
  color: var(--eva-console-green) !important;
  border-color: rgba(182, 245, 44, 0.62) !important;
  background: rgba(76, 44, 91, 0.78) !important;
  transform: translateY(-1px) !important;
}
body.trae-skin-theme-eva-01 .core-model-select-trigger {
  min-height: 28px !important;
  padding: 0 10px !important;
  border: 1px solid rgba(159, 98, 192, 0.34) !important;
  border-radius: 0 !important;
  color: #d8cadc !important;
  background: rgba(31, 21, 36, 0.72) !important;
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%) !important;
}
body.trae-skin-theme-eva-01 .core-model-select-trigger:hover,
body.trae-skin-theme-eva-01 .core-model-select-trigger[aria-expanded="true"] {
  color: var(--eva-console-green) !important;
  border-color: rgba(182, 245, 44, 0.54) !important;
  background: rgba(61, 36, 70, 0.86) !important;
}
body.trae-skin-theme-eva-01 .core-model-select-trigger-arrow {
  color: var(--eva-console-purple) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button {
  position: relative !important;
  flex: 0 0 86px !important;
  width: 86px !important;
  height: 36px !important;
  margin-left: 8px !important;
  padding: 0 !important;
  border: 1px solid #b6f52c !important;
  border-radius: 0 !important;
  color: #101505 !important;
  font-size: 0 !important;
  background:
    linear-gradient(110deg, #b6f52c 0 70%, #6e3d83 70% 100%) !important;
  clip-path: polygon(0 11px, 11px 0, 100% 0, 100% 25px, 75px 36px, 0 36px) !important;
  box-shadow:
    inset 0 0 0 2px rgba(11, 9, 13, 0.3),
    inset -25px 0 rgba(22, 11, 28, 0.18),
    0 0 16px rgba(182, 245, 44, 0.24) !important;
  overflow: hidden !important;
  transition: transform 150ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 150ms ease, filter 150ms ease !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button > span,
body.trae-skin-theme-eva-01 .chat-input-v2-send-button > svg {
  opacity: 0 !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button::before {
  content: "LAUNCH";
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #101505;
  font: 800 10px/1 "JetBrains Mono", "SFMono-Regular", monospace;
  letter-spacing: 0.12em;
  text-shadow: 0 1px rgba(255, 255, 255, 0.24);
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button::after {
  content: "";
  position: absolute;
  right: 12px;
  top: 13px;
  width: 8px;
  height: 8px;
  border-top: 2px solid #d8ff7b;
  border-right: 2px solid #d8ff7b;
  transform: rotate(-45deg);
  filter: drop-shadow(0 0 4px rgba(182, 245, 44, 0.7));
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button:hover:not(.disabled) {
  filter: brightness(1.08) saturate(1.08) !important;
  transform: translateY(-2px) !important;
  box-shadow:
    inset 0 0 0 2px rgba(11, 9, 13, 0.22),
    inset -25px 0 rgba(22, 11, 28, 0.12),
    0 7px 0 rgba(59, 31, 70, 0.85),
    0 0 24px rgba(182, 245, 44, 0.42) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button:active:not(.disabled) {
  transform: translateY(2px) scale(0.985) !important;
  box-shadow: inset 0 0 0 2px rgba(11, 9, 13, 0.3), 0 1px 0 rgba(59, 31, 70, 0.9) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button:focus-visible {
  outline: 0 !important;
  box-shadow: 0 0 0 2px #0b090d, 0 0 0 4px #b6f52c, 0 0 22px rgba(182, 245, 44, 0.38) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button.disabled {
  border-color: rgba(159, 98, 192, 0.62) !important;
  background:
    repeating-linear-gradient(135deg, transparent 0 7px, rgba(159, 98, 192, 0.06) 7px 8px),
    #211628 !important;
  box-shadow: inset 0 0 0 2px rgba(8, 7, 9, 0.4), inset -25px 0 rgba(159, 98, 192, 0.12) !important;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button.disabled::before {
  content: "STANDBY";
  color: #b9a7bf;
  text-shadow: none;
}
body.trae-skin-theme-eva-01 .chat-input-v2-send-button.disabled::after {
  right: 15px;
  top: 16px;
  width: 4px;
  height: 4px;
  border: 0;
  border-radius: 50%;
  background: #b6f52c;
  box-shadow: 0 0 7px rgba(182, 245, 44, 0.65);
  transform: none;
  opacity: 0.58;
}
body.trae-skin-theme-eva-01 .messageInputEditorWrapper:has(.chat-input-v2-send-button:not(.disabled))::after {
  content: "ARMED";
}

/* 把紫绿语言延伸到任务和正文交互，模式 Tab 由 V3 components.navigation.modeTabs 驱动 */
body.trae-skin-theme-eva-01 .task-list-panel [class*="selected"],
body.trae-skin-theme-eva-01 .task-list-panel [aria-selected="true"] {
  color: #f0ebec !important;
  background: linear-gradient(90deg, rgba(111, 61, 135, 0.7), rgba(54, 30, 64, 0.5)) !important;
  box-shadow: inset 3px 0 #b6f52c !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container a,
body.trae-skin-theme-eva-01 .core-model-select-trigger-arrow,
body.trae-skin-theme-eva-01 [class*="message-action"] button:hover {
  color: #b6f52c !important;
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container h2::after,
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container h3::after {
  content: "";
  display: inline-block;
  width: 26px;
  height: 3px;
  margin-left: 9px;
  vertical-align: middle;
  background: linear-gradient(90deg, #9f62c0 0 68%, transparent 68% 76%, #b6f52c 76% 100%);
  box-shadow: 0 0 8px rgba(159, 98, 192, 0.18);
}
body.trae-skin-theme-eva-01 .solo-lite-chat-panel-container :not(pre) > code {
  color: #e2d3e8 !important;
  background: rgba(82, 47, 96, 0.48) !important;
  border-bottom: 1px solid rgba(182, 245, 44, 0.42) !important;
  border-radius: 0 !important;
}
body.trae-skin-blur-disabled .task-list-panel,
body.trae-skin-blur-disabled .solo-lite-chat-panel-container,
body.trae-skin-blur-disabled .solo-lite-main-area,
body.trae-skin-blur-disabled .panel-container,
body.trae-skin-blur-disabled .panel-container > .panel-content,
body.trae-skin-blur-disabled .monaco-workbench .part.sidebar,
body.trae-skin-blur-disabled .monaco-workbench .part.activitybar,
body.trae-skin-blur-disabled .monaco-workbench .part.panel,
body.trae-skin-blur-disabled .monaco-workbench .part.statusbar,
body.trae-skin-blur-disabled .monaco-workbench .part.titlebar {
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
@media (prefers-reduced-motion: reduce) {
  body.trae-skin-effects-max::after { animation: none; }
}

`;
  // 管理器（画廊面板/按钮）样式独立于主题样式常驻：
  // “恢复默认”只移除主题样式，管理器布局不受影响
  const uiStyle = document.createElement("style");
  uiStyle.id = UI_STYLE_ID;
  uiStyle.textContent = `
body.trae-skin-effects-max #${PANEL_ID} {
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
}
body.trae-skin-effects-max #${BUTTON_ID} {
  box-shadow:
    0 0 0 2px var(--trae-skin-info),
    0 0 18px var(--trae-skin-accent),
    0 0 36px var(--trae-skin-magenta) !important;
}
/* 画廊入口按钮 */
#${BUTTON_ID} {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483000;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(20, 22, 34, 0.82); color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.28);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
  transition: transform 0.15s ease;
}
body.trae-skin-v2 #${BUTTON_ID} {
  color: var(--trae-skin-accent-on);
  background: var(--trae-skin-accent);
  border-color: var(--trae-skin-border-strong);
  box-shadow: var(--trae-skin-shadow-floating);
}
#${BUTTON_ID}:hover { transform: scale(1.08); }
#${BUTTON_ID} svg { width: 18px; height: 18px; fill: currentColor; }

/* 画廊面板 */
#${PANEL_ID} {
  position: fixed; right: 16px; bottom: 62px; z-index: 2147483000;
  box-sizing: border-box;
  width: min(400px, calc(100vw - 32px));
  height: min(640px, calc(100vh - 110px));
  display: flex; flex-direction: column; overflow: hidden;
  background: rgba(20, 22, 34, 0.88); color: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
  font: 12px/1.5 -apple-system, "PingFang SC", sans-serif;
  animation: trae-skin-panel-in 0.18s cubic-bezier(0.2, 0.8, 0.2, 1);
}
@keyframes trae-skin-panel-in {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes trae-skin-fade-in { from { opacity: 0; } to { opacity: 1; } }
#${PANEL_ID} .ds-header {
  flex: 0 0 auto; display: flex; align-items: center; gap: 6px;
  padding: 10px 10px 9px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
#${PANEL_ID} .ds-header-text { flex: 1 1 auto; min-width: 0; }
#${PANEL_ID} .ds-title { font-size: 13px; font-weight: 600; white-space: nowrap; }
#${PANEL_ID} .ds-current {
  margin-top: 1px; font-size: 10px; opacity: 0.55;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-header-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 5px; }
#${PANEL_ID} .ds-config-toggle,
#${PANEL_ID} .ds-close,
#${PANEL_ID} .ds-reload {
  border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 6px;
  color: inherit; background: rgba(255, 255, 255, 0.08);
  font: inherit; cursor: pointer;
}
#${PANEL_ID} .ds-config-toggle { padding: 3px 7px; }
#${PANEL_ID} .ds-close,
#${PANEL_ID} .ds-reload {
  box-sizing: border-box; width: 23px; height: 23px; padding: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; line-height: 1;
}
#${PANEL_ID} .ds-config-toggle:hover,
#${PANEL_ID} .ds-close:hover,
#${PANEL_ID} .ds-reload:hover { background: rgba(255, 255, 255, 0.14); }
@keyframes trae-skin-spin { to { transform: rotate(360deg); } }
#${PANEL_ID} .ds-reload-icon { display: inline-block; line-height: 1; }
#${PANEL_ID} .ds-reload.ds-reload-loading { pointer-events: none; }
#${PANEL_ID} .ds-reload.ds-reload-loading .ds-reload-icon {
  animation: trae-skin-spin 0.8s linear infinite;
}
#${PANEL_ID} .ds-body {
  flex: 1 1 auto; overflow-y: auto; padding: 12px;
  scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.22) transparent;
}
#${PANEL_ID} .ds-body::-webkit-scrollbar { width: 5px; }
#${PANEL_ID} .ds-body::-webkit-scrollbar-track { background: transparent; }
#${PANEL_ID} .ds-body::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.18); border-radius: 999px; }
#${PANEL_ID} .ds-body::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
#${PANEL_ID} .ds-gallery-view {
  display: grid; grid-template-columns: 1fr; gap: 4px;
}
#${PANEL_ID} .ds-gallery-view,
#${PANEL_ID} .ds-config-view { animation: trae-skin-fade-in 0.15s ease; }
/* 分类 Tab */
#${PANEL_ID} .ds-tabs {
  flex: 0 0 auto; display: flex; gap: 4px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow-x: auto;
}
#${PANEL_ID} .ds-tabs::-webkit-scrollbar { height: 0; }
#${PANEL_ID} .ds-tab {
  flex: 0 0 auto; padding: 3px 9px; border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: inherit; background: transparent;
  font: inherit; font-size: 11px; cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
#${PANEL_ID} .ds-tab:hover { background: rgba(255, 255, 255, 0.08); }
#${PANEL_ID} .ds-tab.ds-tab-active {
  background: #7c9cff; border-color: #7c9cff;
  color: #0a0a0a; font-weight: 600;
}
body.trae-skin-v2 #${PANEL_ID} .ds-tabs { border-bottom-color: var(--trae-skin-border-subtle); }
body.trae-skin-v2 #${PANEL_ID} .ds-tab { border-color: var(--trae-skin-border-subtle); }
body.trae-skin-v2 #${PANEL_ID} .ds-tab:hover { background: var(--trae-skin-info-subtle); }
body.trae-skin-v2 #${PANEL_ID} .ds-tab.ds-tab-active {
  background: var(--trae-skin-accent); border-color: var(--trae-skin-accent);
  color: var(--trae-skin-accent-on);
}
#${PANEL_ID} .ds-footer {
  flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 7px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px;
}
#${PANEL_ID} .ds-footer-text {
  min-width: 0; opacity: 0.5;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-config-view { display: none; }
#${PANEL_ID} .ds-config-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin: 2px 2px 8px;
}
#${PANEL_ID} .ds-config-name {
  min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-weight: 600;
}
#${PANEL_ID} .ds-setting-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin: 0 2px 9px; padding: 8px 9px;
  border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}
#${PANEL_ID} .ds-setting-copy { min-width: 0; }
#${PANEL_ID} .ds-setting-label { font-weight: 600; }
#${PANEL_ID} .ds-setting-desc {
  margin-top: 1px; opacity: 0.58; font-size: 10px; white-space: nowrap;
}
#${PANEL_ID} .ds-switch {
  position: relative; flex: 0 0 auto; width: 34px; height: 19px;
  padding: 0; border-radius: 999px; cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.12);
  transition: background 0.15s ease, border-color 0.15s ease;
}
#${PANEL_ID} .ds-switch::after {
  content: ""; position: absolute; width: 13px; height: 13px;
  left: 2px; top: 2px; border-radius: 50%; background: #fff;
  transition: transform 0.15s ease;
}
#${PANEL_ID} .ds-switch[aria-checked="true"] {
  background: #7c9cff; border-color: #aab7ff;
}
#${PANEL_ID} .ds-switch[aria-checked="true"]::after {
  transform: translateX(15px);
}
#${PANEL_ID} .ds-copy-config {
  flex: 0 0 auto; padding: 3px 7px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: inherit; background: rgba(255, 255, 255, 0.08);
  font: inherit; cursor: pointer;
}
#${PANEL_ID} .ds-copy-config:hover { background: rgba(255, 255, 255, 0.14); }
#${PANEL_ID} .ds-config-code {
  box-sizing: border-box; width: 100%; max-height: 44vh; overflow: auto;
  margin: 0; padding: 9px; border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.86); background: rgba(0, 0, 0, 0.28);
  font: 10px/1.55 "JetBrains Mono", "SFMono-Regular", monospace;
  white-space: pre-wrap; overflow-wrap: anywhere; user-select: text;
}
#${PANEL_ID} .ds-reset-actions {
  display: flex; flex: 0 0 auto; align-items: center; gap: 5px;
}
#${PANEL_ID} .ds-reset-config,
#${PANEL_ID} .ds-reset-cancel {
  flex: 0 0 auto; padding: 4px 8px; border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: inherit; background: rgba(255, 255, 255, 0.08);
  font: inherit; cursor: pointer;
}
#${PANEL_ID} .ds-reset-cancel { display: none; }
#${PANEL_ID} .ds-reset-cancel.ds-reset-cancel-visible { display: block; }
#${PANEL_ID} .ds-reset-cancel:hover {
  background: rgba(255, 255, 255, 0.14);
}
#${PANEL_ID} .ds-reset-config:hover {
  color: #ff8d98; border-color: #ff6675; background: rgba(255, 82, 99, 0.1);
}
#${PANEL_ID} .ds-reset-config.ds-reset-armed {
  color: #ff8d98; border-color: #ff6675; background: rgba(255, 82, 99, 0.13);
}
#${PANEL_ID} .ds-card {
  display: flex; align-items: center; gap: 10px;
  padding: 6px 8px 6px 6px;
  border: 1px solid transparent; border-radius: var(--trae-skin-radius-medium, 10px);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
#${PANEL_ID} .ds-card:hover { background: rgba(255, 255, 255, 0.07); }
#${PANEL_ID} .ds-card.ds-active {
  border-color: #7c9cff;
  background: rgba(124, 156, 255, 0.12);
}
#${PANEL_ID} .ds-preview {
  flex: 0 0 auto; width: 64px; aspect-ratio: 16 / 9;
  border-radius: 6px;
  background-size: cover; background-position: center;
}
#${PANEL_ID} .ds-meta { flex: 1 1 auto; min-width: 0; }
#${PANEL_ID} .ds-name {
  display: block; font-size: 12px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-desc {
  display: block; margin-top: 1px; font-size: 10px; opacity: 0.65;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-badge {
  flex: 0 0 auto;
  display: none; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 999px;
  background: #7c9cff; color: #0a0a0a;
  font-size: 10px; font-weight: 600;
}
#${PANEL_ID} .ds-card.ds-active .ds-badge { display: flex; }
body.trae-skin-v2 #${PANEL_ID} {
  color: var(--trae-skin-text-primary);
  background: var(--trae-skin-popover);
  border-color: var(--trae-skin-border-default);
  border-radius: var(--trae-skin-radius-large);
  box-shadow: var(--trae-skin-shadow-floating);
}
body.trae-skin-v2 #${PANEL_ID} .ds-card.ds-active {
  border-color: var(--trae-skin-accent);
  background: var(--trae-skin-accent-subtle);
}
body.trae-skin-v2 #${PANEL_ID} .ds-badge {
  background: var(--trae-skin-accent);
  color: var(--trae-skin-accent-on);
}
body.trae-skin-v2 #${PANEL_ID} .ds-header { border-bottom-color: var(--trae-skin-border-subtle); }
body.trae-skin-v2 #${PANEL_ID} .ds-footer { border-top-color: var(--trae-skin-border-subtle); }
body.trae-skin-v2 #${PANEL_ID} .ds-body::-webkit-scrollbar-thumb { background: var(--trae-skin-scrollbar-thumb); }
body.trae-skin-v2 #${PANEL_ID} .ds-body::-webkit-scrollbar-thumb:hover { background: var(--trae-skin-scrollbar-hover); }
body.trae-skin-effects-max #${PANEL_ID} .ds-header { padding-right: 16px; }
body.trae-skin-v2 #${PANEL_ID} .ds-config-toggle,
body.trae-skin-v2 #${PANEL_ID} .ds-close,
body.trae-skin-v2 #${PANEL_ID} .ds-reload,
body.trae-skin-v2 #${PANEL_ID} .ds-copy-config,
body.trae-skin-v2 #${PANEL_ID} .ds-reset-config,
body.trae-skin-v2 #${PANEL_ID} .ds-reset-cancel {
  color: var(--trae-skin-text-primary);
  background: var(--trae-skin-info-subtle);
  border-color: var(--trae-skin-border-default);
}
body.trae-skin-v2 #${PANEL_ID} .ds-config-toggle:hover,
body.trae-skin-v2 #${PANEL_ID} .ds-close:hover,
body.trae-skin-v2 #${PANEL_ID} .ds-reload:hover,
body.trae-skin-v2 #${PANEL_ID} .ds-copy-config:hover,
body.trae-skin-v2 #${PANEL_ID} .ds-reset-config:hover,
body.trae-skin-v2 #${PANEL_ID} .ds-reset-cancel:hover {
  color: var(--trae-skin-accent);
  border-color: var(--trae-skin-accent);
}
body.trae-skin-v2 #${PANEL_ID} .ds-reset-config.ds-reset-armed {
  color: var(--trae-skin-error);
  border-color: var(--trae-skin-error);
}
body.trae-skin-v2 #${PANEL_ID} .ds-config-code {
  color: var(--trae-skin-text-secondary);
  background: var(--trae-skin-chat-code);
  border-color: var(--trae-skin-border-subtle);
}
body.trae-skin-v2 #${PANEL_ID} .ds-setting-row {
  background: var(--trae-skin-info-subtle);
  border-color: var(--trae-skin-border-subtle);
}
body.trae-skin-v2 #${PANEL_ID} .ds-switch[aria-checked="true"] {
  background: var(--trae-skin-accent);
  border-color: var(--trae-skin-border-strong);
}
body.trae-skin-v2 #${PANEL_ID} .ds-switch[aria-checked="true"]::after {
  background: var(--trae-skin-accent-on);
}
`;
  (document.head || document.documentElement).appendChild(uiStyle);
  if (!disabled) (document.head || document.documentElement).appendChild(style);

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
    document.getElementById(ICONS_STYLE_ID)?.remove();
    document.getElementById(SCOPE_STYLE_ID)?.remove();
    document.getElementById(PANEL_ID)?.remove();
    panel.style.display = "none";
    panel.querySelectorAll(".ds-card").forEach((card) => card.classList.remove("ds-active"));
    configToggle.style.display = "none";
    showConfig(false);
    if (!uiStyle.isConnected) (document.head || document.documentElement).appendChild(uiStyle);
    ensureSelfHeal();
    button.title = "打开 Dream Skin 主题画廊";
    window.__TRAE_DREAM_SKIN__ = VERSION;
    return { ok: true, disabled: true, controlRetained: true };
  };
  let renderCurrentConfig = () => {};
  let renderBlurControl = () => {};

  // ---------- v3：外观握手 ----------
  // 把 App 自己的主题开关（<html data-theme> + body .light/.vs-dark）翻到与皮肤一致，
  // 让 App 的暗色样式表、icube 别名层、CSS module 颜色全部进入对应语境
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

  // 用户在 App 设置里手动切主题时，v3 皮肤重断言自己的外观
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

  // ---------- v3：--trae-skin-* 自有层（画廊 + 毛玻璃 + 特效），从角色推导 ----------
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

    document.body.classList.toggle("trae-skin-effects-max", effects.mode === "max");

    setVar("--trae-skin-background-color", background.color || surface.base);
    setVar("--trae-skin-background-position", background.position || "center");
    setVar("--trae-skin-background-size", background.size || "cover");
    setVar("--trae-skin-background-repeat", background.repeat || "no-repeat");
    setVar("--trae-skin-background-blur", asLength(background.blur, "0px"));
    setVar("--trae-skin-background-brightness", asNumber(background.brightness, 1, 0, 2));
    setVar("--trae-skin-background-saturation", asNumber(background.saturation, 1, 0, 3));
    setVar("--trae-skin-background-scale", background.blur ? 1.035 : 1);
    setVar("--trae-skin-background-overlay", withAlpha(
      background.overlay?.color || "transparent",
      background.overlay?.opacity ?? 0,
    ));

    setSurface("left", { background: surfacesColors.left ?? surface.secondary, opacity: surfacesOpacity.left ?? 0.72, backdropBlur: surfacesBlur.left ?? 16, backdropSaturation: surfacesSaturation }, surface.secondary, 0.72, 16);
    setSurface("chat", { background: surfacesColors.chat ?? surface.base, opacity: surfacesOpacity.chat ?? 0.72, backdropBlur: surfacesBlur.chat ?? 20, backdropSaturation: surfacesSaturation }, surface.base, 0.72, 20);
    setSurface("main", { background: surfacesColors.main ?? surface.base, opacity: surfacesOpacity.main ?? 0.68, backdropBlur: surfacesBlur.main ?? 18, backdropSaturation: surfacesSaturation }, surface.base, 0.68, 18);
    setSurface("landing", { background: surfacesColors.landing ?? surface.base, opacity: surfacesOpacity.landing ?? 0.68, backdropBlur: surfacesBlur.landing ?? 18, backdropSaturation: surfacesSaturation }, surface.base, 0.68, 18);
    setVar("--trae-skin-layout-gap", surfaces.gap || withAlpha(surface.secondary, 0.35));
    setVar("--trae-skin-divider", surfaces.divider || border.subtle);
    // 静态样式里少数旧容器仍读这三个变量，统一从 chat 表面推导
    setVar("--trae-skin-surface-light", surfacesOpacity.chat ?? 0.72);
    setVar("--trae-skin-surface-dark", surfacesOpacity.chat ?? 0.72);
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
    setVar("--trae-skin-workbench-editor", withAlpha(surface.base, workbenchOpacity.editor ?? 0.76));
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
    if (warnings.length) console.warn("[dream-skin] contrast warnings:", JSON.stringify(warnings));
    if (componentAudit.unverifiable.length) {
      console.warn("[dream-skin] contrast unverifiable:", JSON.stringify(componentAudit.unverifiable));
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
    document.body.classList.add(activeThemeClass);
    setVar("--trae-skin-art", `url("${theme.art}")`);
    const blurEnabled = panelBlurEnabled(theme);
    document.body.classList.toggle("trae-skin-blur-disabled", !blurEnabled);

    const settings = theme.settings || {};
    const v3Result = applyV3Theme(theme, settings);

    try { localStorage.setItem(LS_KEY, id); } catch {}
    panel?.querySelectorAll(".ds-card").forEach((card) => {
      card.classList.toggle("ds-active", card.dataset.themeId === id);
    });
    renderCurrentConfig(theme);
    renderBlurControl(theme, blurEnabled);
    return {
      ok: true,
      id,
      schemaVersion: theme.settings?.schemaVersion || 1,
      panelBlurEnabled: blurEnabled,
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
  configToggle.textContent = "配置";
  configToggle.title = "查看当前主题配置";
  const reloadButton = document.createElement("button");
  reloadButton.className = "ds-reload";
  reloadButton.type = "button";
  reloadButton.innerHTML = '<span class="ds-reload-icon">↻</span>';
  reloadButton.title = "重新加载主题目录（新主题热加载）";
  const closeButton = document.createElement("button");
  closeButton.className = "ds-close";
  closeButton.type = "button";
  closeButton.textContent = "×";
  closeButton.title = "关闭 (Esc)";
  headerActions.append(reloadButton, configToggle, closeButton);
  header.append(headerText, headerActions);
  const panelBody = document.createElement("div");
  panelBody.className = "ds-body";

  const galleryView = document.createElement("div");
  galleryView.className = "ds-gallery-view";
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
  const resetConfig = document.createElement("button");
  resetConfig.className = "ds-reset-config";
  resetConfig.type = "button";
  resetConfig.textContent = "恢复默认";
  resetConfig.title = "移除 Dream Skin，恢复 TRAE 原生主题";
  const resetCancel = document.createElement("button");
  resetCancel.className = "ds-reset-cancel";
  resetCancel.type = "button";
  resetCancel.textContent = "取消";
  const resetActions = document.createElement("div");
  resetActions.className = "ds-reset-actions";
  resetActions.append(resetCancel, resetConfig);
  configHead.append(configName, copyConfig);
  configView.append(configHead, blurRow, configCode);
  panelBody.append(galleryView, configView);

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
  footerText.textContent = `${CATALOG.length} 套主题 · Dream Skin v${VERSION}`;
  footer.append(footerText, resetActions);
  panel.append(header, tabsBar, panelBody, footer);

  let configOpen = false;
  const showConfig = (open) => {
    configOpen = Boolean(open);
    // 用 "" 清掉内联值，让样式表接管：gallery 是 grid，config 默认 none
    galleryView.style.display = configOpen ? "none" : "";
    configView.style.display = configOpen ? "block" : "";
    configToggle.textContent = configOpen ? "主题" : "配置";
    configToggle.title = configOpen ? "返回主题列表" : "查看当前主题配置";
  };
  renderCurrentConfig = (theme = findTheme(
    (() => { try { return localStorage.getItem(LS_KEY); } catch { return null; } })(),
  )) => {
    if (!theme) return;
    const config = publicThemeConfig(theme);
    configName.textContent = `${theme.name} · ${theme.id}`;
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
  configToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    renderCurrentConfig();
    showConfig(!configOpen);
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
    clearTimeout(resetTimer);
    restoreNativeTheme();
  });

  const activateTheme = (id) => {
    if (disabled) {
      try { localStorage.removeItem(DISABLED_KEY); } catch {}
      disabled = false;
      if (!uiStyle.isConnected) (document.head || document.documentElement).appendChild(uiStyle);
      if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
      configToggle.style.display = "";
      button.title = "Dream Skin 主题画廊";
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
    badge.textContent = "✓ 使用中";
    const preview = document.createElement("div");
    preview.className = "ds-preview";
    preview.style.backgroundImage = `url("${theme.art}")`;
    const meta = document.createElement("div");
    meta.className = "ds-meta";
    const name = document.createElement("span");
    name.className = "ds-name";
    name.textContent = theme.name;
    meta.appendChild(name);
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

  const button = document.createElement("button");
  button.id = BUTTON_ID;
  button.title = "Dream Skin 主题画廊";
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
    if (reloadButton.classList.contains("ds-reload-loading")) return;
    reloadButton.classList.add("ds-reload-loading");
    // 守护进程轮询到这个标记后会重建主题目录、重新注入并重新打开面板
    window.__TRAE_DREAM_SKIN_RELOAD_REQUEST__ = Date.now();
    setTimeout(() => reloadButton.classList.remove("ds-reload-loading"), 6000);
  });
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
      const requiredId = disabled ? UI_STYLE_ID : STYLE_ID;
      if (!document.getElementById(requiredId)) {
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
