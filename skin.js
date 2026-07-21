// TRAE Work Dream Skin — 页面内载荷（背景层 + 主题画廊面板）
// injector.mjs 替换 __CATALOG__ / __DEFAULT_THEME__ / __VERSION__ 后经 Runtime.evaluate 执行。
// 幂等：重复执行先移除旧节点再重新挂载；主题选择存 localStorage，重启/导航后保持。
(() => {
  const CATALOG = __CATALOG__;
  const DEFAULT_THEME = __DEFAULT_THEME__;
  const VERSION = __VERSION__;
  const LS_PREFIX = "trae-dream-skin:";
  const LS_KEY = `${LS_PREFIX}theme`;
  const BLUR_LS_PREFIX = `${LS_PREFIX}panel-blur:`;
  const DISABLED_KEY = `${LS_PREFIX}disabled`;
  const STYLE_ID = "trae-dream-skin-style";
  const UI_STYLE_ID = "trae-dream-skin-ui-style";
  const PANEL_ID = "trae-dream-skin-panel";
  const BUTTON_ID = "trae-dream-skin-button";

  window.__TRAE_DREAM_SKIN_OBS__?.disconnect();
  window.__TRAE_DREAM_SKIN_OBS__ = null;
  document.getElementById(STYLE_ID)?.remove();
  document.getElementById(UI_STYLE_ID)?.remove();
  document.getElementById(PANEL_ID)?.remove();
  document.getElementById(BUTTON_ID)?.remove();
  if (document.body) {
    for (const className of [...document.body.classList]) {
      if (className.startsWith("trae-skin-theme-")) {
        document.body.classList.remove(className);
      }
    }
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
  width: min(680px, calc(100vw - 32px));
  aspect-ratio: 4 / 3;
  max-height: calc(100vh - 110px);
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
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
#${PANEL_ID} .ds-gallery-view,
#${PANEL_ID} .ds-config-view { animation: trae-skin-fade-in 0.15s ease; }
#${PANEL_ID} .ds-footer {
  flex: 0 0 auto; padding: 7px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 10px; opacity: 0.5;
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
#${PANEL_ID} .ds-reset-row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; margin: 9px 2px 1px;
}
#${PANEL_ID} .ds-reset-desc {
  min-width: 0; opacity: 0.58; font-size: 10px;
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
  position: relative; overflow: hidden;
  border: 2px solid transparent; border-radius: var(--trae-skin-radius-medium, 10px);
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
}
#${PANEL_ID} .ds-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}
#${PANEL_ID} .ds-card.ds-active {
  border-color: #7c9cff;
  box-shadow: 0 0 0 3px rgba(124, 156, 255, 0.25);
}
#${PANEL_ID} .ds-preview {
  width: 100%; aspect-ratio: 16 / 9;
  background-size: cover; background-position: center;
  transition: transform 0.3s ease;
}
#${PANEL_ID} .ds-card:hover .ds-preview { transform: scale(1.04); }
#${PANEL_ID} .ds-meta {
  position: absolute; inset: auto 0 0 0; padding: 22px 9px 7px;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.85));
}
#${PANEL_ID} .ds-name {
  display: block; font-size: 12px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-desc {
  display: block; margin-top: 1px; font-size: 10px; opacity: 0.72;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#${PANEL_ID} .ds-badge {
  position: absolute; top: 6px; left: 6px; z-index: 1;
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
  box-shadow: 0 0 0 3px var(--trae-skin-accent-subtle);
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
    const defaultValue = theme.settings?.extensions?.effects?.panelBlurEnabled ?? true;
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
    document.body.classList.remove(
      "trae-skin-v2",
      "trae-skin-appearance-dark",
      "trae-skin-effects-max",
      "trae-skin-blur-disabled",
    );
    if (activeThemeClass) document.body.classList.remove(activeThemeClass);
    activeThemeClass = null;
    document.getElementById(STYLE_ID)?.remove();
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

  const apply = (id) => {
    const theme = findTheme(id);
    if (!theme) return { ok: false, error: `unknown theme: ${id}` };
    clearManagedVars();
    document.body.classList.remove(
      "trae-skin-v2",
      "trae-skin-appearance-dark",
      "trae-skin-effects-max",
      "trae-skin-blur-disabled",
    );
    if (activeThemeClass) document.body.classList.remove(activeThemeClass);
    activeThemeClass = `trae-skin-theme-${theme.id.replace(/[^a-z0-9_-]/gi, "-")}`;
    document.body.classList.add(activeThemeClass);
    setVar("--trae-skin-art", `url("${theme.art}")`);
    setVar("--trae-skin-surface-light", theme.surfaceLight ?? 0.78);
    setVar("--trae-skin-surface-dark", theme.surfaceDark ?? 0.72);
    setVar("--trae-skin-blur", `${theme.blurPx ?? 24}px`);
    const blurEnabled = panelBlurEnabled(theme);
    document.body.classList.toggle("trae-skin-blur-disabled", !blurEnabled);

    const settings = theme.settings || {};
    if (asNumber(settings.schemaVersion, 1) >= 2) {
      document.body.classList.add("trae-skin-v2");
      document.body.classList.toggle(
        "trae-skin-appearance-dark",
        settings.appearance === "dark",
      );

      const background = settings.background || {};
      const layout = settings.layout || {};
      const colors = settings.colors || {};
      const bg = colors.background || {};
      const accent = colors.accent || {};
      const text = colors.text || {};
      const icon = colors.icon || {};
      const border = colors.border || {};
      const typography = settings.typography || {};
      const shape = settings.shape || {};
      const radius = shape.radius || {};
      const elevation = settings.elevation || {};
      const scrollbar = settings.scrollbar || {};
      const components = settings.components || {};
      const chat = components.chat || {};
      const popover = components.popover || {};
      const settingsPanel = components.settings || {};
      const workbench = settings.workbench || {};
      const workbenchOpacity = workbench.opacity || {};
      const effects = settings.extensions?.effects || {};
      const decorations = settings.extensions?.decorations || {};
      document.body.classList.toggle(
        "trae-skin-effects-max",
        effects.mode === "max",
      );

      setVar("--trae-skin-background-color", background.color || bg.base || "#10121a");
      setVar("--trae-skin-background-position", background.position || "center");
      setVar("--trae-skin-background-size", background.size || "cover");
      setVar("--trae-skin-background-repeat", background.repeat || "no-repeat");
      setVar("--trae-skin-background-blur", asLength(background.blur, "0px"));
      setVar(
        "--trae-skin-background-brightness",
        asNumber(background.brightness, 1, 0, 2),
      );
      setVar(
        "--trae-skin-background-saturation",
        asNumber(background.saturation, 1, 0, 3),
      );
      setVar(
        "--trae-skin-background-scale",
        background.blur ? 1.035 : 1,
      );
      setVar(
        "--trae-skin-background-overlay",
        withAlpha(
          background.overlay?.color || "transparent",
          background.overlay?.opacity ?? 0,
        ),
      );

      setSurface("left", layout.leftSidebar, bg.base || "#10121a", 0.72, 16);
      setSurface("chat", layout.chatPanel, bg.base || "#10121a", 0.72, 20);
      setSurface("main", layout.mainArea, bg.base || "#10121a", 0.68, 18);
      setSurface("landing", layout.landing, bg.base || "#10121a", 0.68, 18);
      setVar("--trae-skin-layout-gap", layout.gap || withAlpha(bg.secondary || "#151925", 0.35));
      setVar("--trae-skin-divider", layout.divider || border.subtle || "#ffffff1f");

      const semanticVars = {
        "--bg-bg-base-default": bg.base,
        "--bg-bg-base-secondary": bg.secondary,
        "--bg-bg-base-tertiary": bg.tertiary,
        "--bg-bg-card": bg.card,
        "--bg-bg-card-hover": bg.cardHover,
        "--bg-bg-input": bg.input,
        "--bg-bg-menu": bg.menu,
        "--bg-bg-tooltip": bg.tooltip,
        "--bg-bg-overlay-l0": bg.overlay,
        "--bg-bg-overlay-l1": bg.overlay,
        "--bg-bg-overlay-l2": bg.overlay,
        "--bg-bg-overlay-l3": border.subtle,
        "--bg-bg-overlay-l4": border.default,
        "--bg-bg-brand": accent.default,
        "--bg-bg-brand-sub": accent.default,
        "--bg-bg-brand-hover": accent.hover,
        "--bg-bg-brand-hover-sub": accent.hover,
        "--bg-bg-brand-active": accent.active,
        "--bg-bg-brand-popup": accent.subtle,
        "--bg-bg-brand-popup-sub": accent.subtle,
        "--text-text-default": text.primary,
        "--text-text-default-hover": text.primary,
        "--text-text-default-active": text.primary,
        "--text-text-secondary": text.secondary,
        "--text-text-secondary-hover": text.primary,
        "--text-text-secondary-active": text.primary,
        "--text-text-tertiary": text.tertiary,
        "--text-text-disabled": text.disabled,
        "--text-text-onaccent": text.onAccent || accent.onAccent,
        "--text-text-onbrand": text.onAccent || accent.onAccent,
        "--text-text-brand": accent.default,
        "--text-text-brand-sub": accent.default,
        "--text-text-brand-hover": accent.hover,
        "--text-text-brand-hover-sub": accent.hover,
        "--icon-icon-default": icon.primary,
        "--icon-icon-default-hover": text.primary,
        "--icon-icon-default-active": accent.default,
        "--icon-icon-secondary": icon.secondary,
        "--icon-icon-secondary-hover": icon.primary,
        "--icon-icon-secondary-active": accent.default,
        "--icon-icon-tertiary": icon.tertiary,
        "--icon-icon-disabled": icon.disabled,
        "--icon-icon-onaccent": text.onAccent || accent.onAccent,
        "--icon-icon-onbrand": text.onAccent || accent.onAccent,
        "--icon-icon-brand": accent.default,
        "--icon-icon-brand-sub": accent.default,
        "--icon-icon-brand-hover": accent.hover,
        "--icon-icon-brand-hover-sub": accent.hover,
        "--border-border-neutral-l1": border.subtle,
        "--border-border-neutral-l2": border.default,
        "--border-border-neutral-l3": border.strong,
        "--border-border-brand": accent.default,
        "--border-border-brand-sub": accent.default,
      };
      for (const [name, value] of Object.entries(semanticVars)) setVar(name, value);

      setVar("--trae-skin-text-primary", text.primary || "#f5f5f5");
      setVar("--trae-skin-text-secondary", text.secondary || "#b8bdc7");
      setVar("--trae-skin-text-tertiary", text.tertiary || "#7c8491");
      setVar("--trae-skin-text-disabled", text.disabled || "#555d69");
      setVar("--trae-skin-accent", accent.default || "#7c9cff");
      setVar("--trae-skin-accent-hover", accent.hover || accent.default || "#9bb2ff");
      setVar("--trae-skin-accent-subtle", accent.subtle || withAlpha(accent.default || "#7c9cff", 0.18));
      setVar("--trae-skin-accent-on", accent.onAccent || text.onAccent || "#0a0a0a");
      setVar("--trae-skin-info", colors.info || accent.default || "#7c9cff");
      setVar("--trae-skin-info-subtle", withAlpha(colors.info || accent.default || "#7c9cff", 0.12));
      setVar("--trae-skin-error", colors.error || "#ff5263");
      setVar("--trae-skin-warning", colors.warning || "#f5bf42");
      setVar("--trae-skin-success", colors.success || "#57d38c");
      setVar("--trae-skin-input", bg.input || bg.base || "#10121a");
      setVar("--trae-skin-menu", bg.menu || bg.card || "#151925");
      setVar("--trae-skin-border-subtle", border.subtle || "#ffffff1f");
      setVar("--trae-skin-border-default", border.default || "#ffffff38");
      setVar("--trae-skin-border-strong", border.strong || "#ffffff5c");
      setVar("--trae-skin-scanline-color", effects.scanlineColor || "transparent");
      setVar("--trae-skin-grid-color", effects.gridColor || "transparent");
      setVar("--trae-skin-magenta", effects.magenta || colors.error || "#ff2bd6");
      setVar("--trae-skin-neon-glow", effects.glow || "none");

      const setDecoration = (name, asset, config, fallbackOverlay) => {
        if (!asset || !config) return;
        const overlay = withAlpha(
          config.overlay?.color || fallbackOverlay,
          config.overlay?.opacity ?? 0.42,
        );
        setVar(
          `--trae-skin-${name}-art-layer`,
          `linear-gradient(${overlay}, ${overlay}), url("${asset}")`,
        );
        setVar(`--trae-skin-${name}-art-position`, config.position || "center");
        setVar(`--trae-skin-${name}-art-size`, config.size || "cover");
      };
      setDecoration(
        "left",
        theme.assets?.leftSidebar,
        decorations.leftSidebar,
        layout.leftSidebar?.background || bg.base || "#071a27",
      );
      setDecoration(
        "right",
        theme.assets?.rightPanel,
        decorations.rightPanel,
        layout.mainArea?.background || bg.base || "#071a27",
      );

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
      setVar("--trae-skin-focus-ring", elevation.focusRing || `0 0 0 2px ${accent.default || "#7c9cff"}`);

      setVar("--trae-skin-scrollbar-track", scrollbar.track || "transparent");
      setVar("--trae-skin-scrollbar-thumb", scrollbar.thumb || border.default || "#ffffff38");
      setVar("--trae-skin-scrollbar-hover", scrollbar.thumbHover || accent.default || "#7c9cff");
      setVar("--trae-skin-scrollbar-width", asLength(scrollbar.width, "8px"));

      setVar("--trae-skin-chat-user-bubble", chat.userBubble || bg.card || "#151925");
      setVar("--trae-skin-chat-user-border", chat.userBubbleBorder || border.subtle || "#ffffff1f");
      setVar("--trae-skin-chat-assistant-message", chat.assistantMessage || chat.card || bg.card || "#151925");
      setVar("--trae-skin-chat-assistant-border", chat.assistantMessageBorder || border.subtle || "#ffffff1f");
      setVar("--trae-skin-chat-assistant-shadow", chat.assistantMessageShadow || elevation.card || "none");
      setVar("--trae-skin-chat-code", chat.code || bg.input || "#10121a");
      setVar("--trae-skin-chat-card", chat.card || bg.card || "#151925");
      setVar("--trae-skin-popover", popover.background || bg.menu || "#151925");
      setVar("--trae-skin-popover-hover", popover.itemHover || withAlpha(colors.info || accent.default || "#7c9cff", 0.1));
      setVar("--trae-skin-popover-selected", popover.itemSelected || accent.subtle || withAlpha(accent.default || "#7c9cff", 0.18));
      setVar("--trae-skin-settings-overlay", settingsPanel.overlay || "#00000080");
      setVar("--trae-skin-settings-panel", settingsPanel.panel || popover.background || bg.menu || "#151925");
      setVar("--trae-skin-settings-sidebar", settingsPanel.sidebar || bg.secondary || bg.card || "#151925");
      setVar("--trae-skin-settings-card", settingsPanel.card || bg.card || "#151925");
      setVar("--trae-skin-settings-control", settingsPanel.control || bg.input || "#10121a");
      setVar("--trae-skin-settings-active", settingsPanel.active || popover.itemSelected || accent.subtle || withAlpha(accent.default || "#7c9cff", 0.18));

      const workbenchBase = bg.base || "#10121a";
      setVar("--trae-skin-workbench-sidebar", withAlpha(bg.secondary || workbenchBase, workbenchOpacity.sidebar ?? 0.72));
      setVar("--trae-skin-workbench-editor", withAlpha(workbenchBase, workbenchOpacity.editor ?? 0.76));
      setVar("--trae-skin-workbench-panel", withAlpha(bg.secondary || workbenchBase, workbenchOpacity.panel ?? 0.72));
    }

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
  const resetRow = document.createElement("div");
  resetRow.className = "ds-reset-row";
  const resetDesc = document.createElement("div");
  resetDesc.className = "ds-reset-desc";
  resetDesc.textContent = "移除 Dream Skin，恢复 TRAE 原生主题";
  const resetConfig = document.createElement("button");
  resetConfig.className = "ds-reset-config";
  resetConfig.type = "button";
  resetConfig.textContent = "恢复 TRAE 默认";
  const resetCancel = document.createElement("button");
  resetCancel.className = "ds-reset-cancel";
  resetCancel.type = "button";
  resetCancel.textContent = "取消";
  const resetActions = document.createElement("div");
  resetActions.className = "ds-reset-actions";
  resetActions.append(resetCancel, resetConfig);
  resetRow.append(resetDesc, resetActions);
  configHead.append(configName, copyConfig);
  configView.append(configHead, blurRow, configCode, resetRow);
  panelBody.append(galleryView, configView);
  const footer = document.createElement("div");
  footer.className = "ds-footer";
  footer.textContent = `${CATALOG.length} 套主题 · Dream Skin v${VERSION}`;
  panel.append(header, panelBody, footer);

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
    resetConfig.textContent = "恢复 TRAE 默认";
    resetDesc.textContent = "移除 Dream Skin，恢复 TRAE 原生主题";
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
      resetDesc.textContent = "将移除全部主题与本地配置";
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
    card.append(badge, preview, meta);
    card.addEventListener("click", () => activateTheme(theme.id));
    galleryView.appendChild(card);
  }

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
