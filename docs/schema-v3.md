# Dream Skin 主题描述协议 v3（schemaVersion 3）

v3 的核心思想：**主题作者只声明"角色"（tokens），引擎负责把角色扇出到 TRAE Work 的全部设计令牌命名空间**。
一致性由架构保证——任何组件、在任何页面，只要读设计系统令牌，拿到的都是同一组值。

> 当前唯一支持的 schema 版本。

## 设计依据（实地普查，2026-07）

TRAE Work 的令牌架构（详见 `fixtures/`）：

| 层 | 命名空间 | 数量 | 说明 |
|---|---|---|---|
| 语义令牌 | `--bg-bg-*` `--text-text-*` `--icon-icon-*` `--border-border-*` | 29/15/15/6 | 组件直接消费 |
| 别名层 | `--vscode-icube--*` | 107 | **大量组件实际消费这层**，:root 静态值，随 `data-theme` 切换 |
| VS Code 核心兼容层 | `--vscode-*` | 59 | IM Channel 等非 Workbench 页面仍直接消费的通用表面、文本、控件与状态色 |
| 镜像层 | `--ras-bg-bg-*` | 25 | 设置页等组件消费 |
| 原语色阶 | `--brand-brand-*` (+grey) | 22 | 50~950 色阶 |
| 组件令牌 | `--popup-menu-*` | 22 | 下拉/浮层菜单 |
| 主题开关 | `<html data-theme>` + `body.light/.vs-dark` | — | App 自己的 light/dark 语境（210 条规则依赖） |

## 一、主题文件结构（themes/&lt;id&gt;/）

```
themes/<id>/
├── theme.json        # 协议文件
├── theme.css         # 可选：主题独有组件造型与动效，切换时动态注入
├── background.*      # 主背景图（svg/png/jpg）
├── icons/*.svg       # 可选：图标 glyph 替换素材
├── left-sidebar.*    # 可选：左侧栏装饰图
└── right-panel.*     # 可选：右栏装饰图
```

## 二、theme.json 字段

```jsonc
{
  "schemaVersion": 3,
  "id": "neon-district",
  "version": "1.0.0",             // 主题内容版本，使用 SemVer
  "engines": { "twskin": ">=0.5.4 <1.0.0" }, // 兼容的 Theme Manager 范围
  "name": "霓虹城区 MAX",
  "desc": "一句话描述",
  "category": "科幻",              // 可选：画廊分类 Tab 归类，缺省归入「其他」
  "appearance": "dark",          // dark | light —— 触发外观握手（见三-1）

  "background": {                 // 背景层（Dream Skin 自有）
    "color": "#080b12", "position": "center center", "size": "cover",
    "repeat": "no-repeat", "blur": 0, "brightness": 1, "saturation": 1.24,
    "overlay": { "color": "#05070c", "opacity": 0.02 }
  },

  "surfaces": {                   // 毛玻璃面板层（Dream Skin 自有）
    "colors":   { "left": "#0b1d23", "chat": "#10272c", "main": "#132b30", "landing": "#132b30" },  // 可选，默认取 surface.secondary/base
    "opacity":  { "left": 0.74, "chat": 0.64, "main": 0.44, "landing": 0.5 },
    "blurPx":   { "left": 10, "chat": 10, "main": 7, "landing": 8 },
    "saturation": 1.16,
    "gap": "#07171ba3", "divider": "#9d493b70"
  },

  "tokens": {                     // ★ 核心：角色。缺省项全部由引擎推导
    "accent":  { "base": "#f4e900", "hover": "#fff96b", "active": "#c9bf00",
                 "subtle": "#f4e90033", "onAccent": "#0a0d12", "disabled": "…" },
    "surface": { "base": "#070b11", "secondary": "#0b121c", "tertiary": "#122334",
                 "card": "#09131e", "cardHover": "#102b3b", "input": "#030810",
                 "menu": "#0b111a", "tooltip": "#121b25", "invert": "#f5f5f5" },
    "text":    { "primary": "#edf4f7", "secondary": "#b4c6cd", "tertiary": "#728891", "disabled": "#4e6068" },
    "icons":   { "primary": "#dffcff", "secondary": "#47e8f2", "tertiary": "#ff52dc", "disabled": "#46575f" },
    "border":  { "subtle": "#00f0ff33", "default": "#00f0ff73", "strong": "#f4e900b8", "contrast": "#f4e900" },
    "state":   { "success": "#60f59a", "warning": "#f4e900", "error": "#ff244d", "info": "#00f0ff" }
  },

  "typography": { "ui": {"family": "…"}, "heading": {"family": "…", "weight": 600, "letterSpacing": "0.06em"}, "code": {"family": "…"} },
  "shape":      { "radius": { "small": 0, "medium": 2, "large": 4, "pill": 999 }, "borderWidth": 1 },
  "elevation":  { "card": "…", "floating": "…", "focusRing": "…" },
  "scrollbar":  { "track": "…", "thumb": "…", "thumbHover": "…", "width": 7 },
  "workbench":  { "opacity": { "sidebar": 0.82, "editor": 0.76, "panel": 0.8 } },

  "components": {                 // 可选：自有层组件槽位（默认从角色推导）
    "chat":     { "userBubble": "…", "userBubbleBorder": "…", "assistantMessage": "…",
                  "assistantMessageBorder": "…", "assistantMessageShadow": "none", "code": "…", "card": "…" },
    "popover":  { "background": "…", "itemHover": "…", "itemSelected": "…" },
    "settings": { "overlay": "…", "panel": "…", "sidebar": "…", "card": "…", "control": "…", "active": "…" },
    "landing": {
      "banner": {
        "variant": "system-plate", // default | system-plate
        "colors": {
          "surface": "#151217ee", "border": "#9f62c0", "accent": "#b6f52c",
          "text": "#f0ebec", "muted": "#8b8084", "status": "#b6f52c"
        },
        "metrics": { "cornerCutPx": 14, "maxWidthPx": 620, "iconSizePx": 48 },
        "effects": { "shadow": "0 16px 40px #00000070" },
        "content": {
          "statusText": "ONLINE",
          "modes": {
            "work": { "code": "01", "label": "OPERATIONS" },
            "code": { "code": "02", "label": "SYSTEMS" },
            "design": { "code": "03", "label": "SYNTHESIS" }
          }
        }
      }
    },
    "navigation": {
      "modeTabs": {
        "variant": "launch-rail", // default | launch-rail
        "colors": {
          "track": "#1b111f", "border": "#9f62c080", "indicator": "#59346c",
          "accent": "#b6f52c", "activeText": "#dfff91", "inactiveText": "#c5b7ca",
          "hover": "#382142"
        },
        "metrics": { "heightPx": 42, "tabWidthPx": 92, "gapPx": 3, "cornerCutPx": 8 },
        "effects": { "shadow": "0 8px 24px #00000066" },
        "content": {
          "iconPolicy": "always", // active | always | never
          "showModeCode": true,
          "modes": {
            "work": { "code": "01" }, "code": { "code": "02" }, "design": { "code": "03" }
          }
        }
      }
    }
  },

  "effects": {                    // 特效
    "mode": "max",                // max = 扫描线/网格/发光
    "panelBlurEnabled": false,
    "scanlineColor": "#00f0ff14", "gridColor": "#00f0ff12",
    "magenta": "#ff2bd6", "glow": "0 0 10px #00f0ff99"
  },

  "decorations": {                // 侧栏装饰图
    "leftSidebar": { "asset": "leftSidebar", "position": "center top", "size": "cover",
                     "overlay": { "color": "#061820", "opacity": 0.4 } },
    "rightPanel":  { "asset": "rightPanel", "position": "center", "size": "cover",
                     "overlay": { "color": "#071b25", "opacity": 0.26 } }
  },

  "icons": {                      // 图标
    "overrides": {                // glyph 替换：key = trae-icon-<key> 或 codicon-<name>
      "chatNew": "terminal.svg",
      "marketplace": { "src": "bag.svg", "selector": "svg.trae-icon-marketplace" }
    }
  }
}
```

`schemaVersion` 描述 JSON 协议，`version` 描述主题内容，两者不能混用。修改
图片、颜色、描述或主题 CSS 时递增 `version`；只有主题 JSON 的破坏性结构变化
才递增 `schemaVersion`。`engines.twskin` 使用 `>=x.y.z <a.b.c` 范围，主题若
依赖新的运行时能力，应提高下限。没有 `version` 的旧本地主题按 `0.0.0` 处理，
但官方主题必须声明这两个分发字段。

### 布局表面所有权（必须遵守）

`surfaces` 不是仅供主题挑选的颜色集；它是运行时拥有的布局表面契约。运行时
负责把下列宿主节点和对应的颜色、透明度、模糊组合起来，确保主背景只在根层
绘制，而长文本始终有稳定的阅读底。

| 布局表面 | 宿主节点 | 主题配置 | 典型内容 |
|---|---|---|---|
| 左栏 | `.task-list-panel` | `surfaces.left` | 任务、导航、Skills |
| 对话 | `.solo-lite-chat-panel-container` | `surfaces.chat` | Work 对话和输入区 |
| 主工作区 | `.solo-lite-main-area` | `surfaces.main` | Task Summary、Markdown 预览、Code/Design 工作区 |
| 落地页 | `.panel-container > .panel-content` | `surfaces.landing` | Work、Code、Design 初始页 |
| IDE 编辑器 | `.monaco-workbench …` | `workbench.opacity.*` | 文件编辑器、终端、侧栏 |

特别地，`surfaces.main` 负责右侧工作区的可读性；`workbench.opacity.editor`
只负责其中已挂载的 Monaco 编辑器，不能替代 `main` 表面。主题 CSS 不得在前四个
宿主节点上设置 `background`、任何 `background-*`、`backdrop-filter` 或
`-webkit-backdrop-filter`，否则会绕过协议并让根背景穿透内容层。

如需在表面上加纸纹、边缘渐变或网格，主题在自己的根类上声明装饰变量，而不是
重写宿主节点。例如：

```css
body.trae-skin-theme-example {
  --trae-skin-main-decoration: linear-gradient(90deg, #ffffff12, transparent);
  --trae-skin-left-decoration: repeating-linear-gradient(0deg, transparent 0 23px, #268bd210 23px 24px);
  --trae-skin-left-decoration-size: 100% 24px;
  --trae-skin-left-decoration-repeat: repeat-y;
}
```

可用槽位为 `left`、`chat`、`main`、`landing`；每个槽位支持
`--trae-skin-<slot>-decoration`，以及可选的 `-position`、`-size`、`-repeat`。
运行时把装饰图层叠在语义表面之上，仍由 `surfaces.*` 保留底色和模糊。官方主题
在 CI 中会检查这条限制；第三方主题也应遵守，避免升级时出现表面不连续或正文失读。

### 映射链与组件槽位准入

协议只描述可复用的设计语义，不按功能或页面重复开辟配置模块。映射关系由以下三层
共同维护：

| 层 | 唯一来源 | 负责的映射 |
|---|---|---|
| 通用角色 | `token-map.mjs` | `tokens.*` → App 全命名空间设计令牌 |
| 可配置组件 | `component-map.mjs` | `components.*` → 经过校验的组件角色与变量 |
| 宿主适配 | `base.css` | 稳定宿主选择器 → 上述通用语义变量 |

若一个功能或页面只需要已有的表面、文字、边框、状态与交互 token，必须在宿主适配层
消费这些 token，不得新增 `components.*` 字段，也不在本 schema 增加功能专章。只有当
它具有通用 token 无法表达、并且确实需要主题作者配置的结构变体、内容、尺寸或独立
视觉语义时，才允许新增组件槽位，并同步加入 `component-map.mjs` 的校验、fallback、
对比度配对和测试。

运行时测试会检查 `base.css` 使用的必需内部变量都有映射生产者，并阻止官方主题重复
覆盖运行时拥有的宿主适配。这样功能覆盖关系留在实现与测试中，schema 保持为稳定的
配置协议。

### Landing banner 与模式 Tab

- `components.landing.banner` 控制 Work / Code / Design 初始页共用的欢迎标识。`default` 完全保留 App 原生外观；`system-plate` 提供结构化模式牌、图标舱、模式编号与状态标识。
- `components.navigation.modeTabs` 控制左栏顶部的 Work / Code / Design 切换器。`default` 保留原生 segmented control；`launch-rail` 提供机械轨道、移动指示片和模式编号。
- `content.modes.*.code/label` 只改变装饰性文本；App 原始标签和 ARIA 语义保持不变。
- 模式集与顺序 `work → code → design` 是当前协议常量；宿主改变顺序时由 `skin.js` 适配层修复，不要求主题迁移。
- 未声明组件或未知 `variant` 均回退原生 `default`；旧引擎可忽略这些字段，主题其余部分继续生效，不提供 `minEngine` 式整主题阻断。
- `colors` 的主题显式值只接受 `#RGB`、`#RRGGBB`、`#RRGGBBAA`、数值型 `rgb()/rgba()` 或 `transparent`。非法值回退到角色颜色；主题不能传入 `url()`、`var()` 或 `color-mix()`。
- `effects.shadow` 是受限的声明式 `box-shadow` 值：支持 `none`、可选前置 `inset`、2–4 个 `px/rem/em` 长度与可选末尾安全颜色；拒绝 `url/var/attr/expression`、分号、花括号和注释。
- 通用布局表面的 DOM 选择器和合成规则集中维护在运行时；主题 CSS 只为主题特有组件使用稳定选择器，并通过表面装饰变量叠加纹理，避免越过 `surfaces` 契约。

### 尺寸与文本限制

| 槽位 | 字段 | 范围/上限 | 消费变体 |
|---|---|---:|---|
| Banner | `metrics.cornerCutPx` | 0–40 px | `system-plate` |
| Banner | `metrics.maxWidthPx` | 320–960 px | `system-plate` |
| Banner | `metrics.iconSizePx` | 24–80 px | `system-plate` |
| Banner | `content.statusText` | 20 字符 | `system-plate` |
| Banner | `content.modes.*.code/label` | 各 24 字符 | `system-plate` |
| Mode tabs | `metrics.heightPx` | 32–56 px | `launch-rail` |
| Mode tabs | `metrics.tabWidthPx` | 64–120 px | `launch-rail` |
| Mode tabs | `metrics.gapPx` | 0–12 px | `launch-rail` |
| Mode tabs | `metrics.cornerCutPx` | 0–18 px | `launch-rail` |
| Mode tabs | `content.modes.*.code` | 24 字符 | `launch-rail` |

数字越界时钳制到最近边界；文本会清洗控制字符并截断。未被当前 `variant` 消费的字段无视觉效果。

### 协议债务登记

- 旧槽位 `components.chat/popover/settings`、`elevation.*` 与通用长度值仍沿用 V3 早期的属性值入口，后续应迁入统一的组件映射与安全校验层。
- 当前对比度数学不合成半透明背景；`color-mix()` 等无法纯函数解析的派生色会明确报告为 `contrastUnverifiable`，不会伪装成已通过。
- Mode tabs 的 DOM 适配目前依赖协议固定顺序；宿主若提供稳定的 `data-mode/aria-label`，再迁移到身份属性绑定。

## 三、引擎行为保证

1. **外观握手**：`appearance: "dark"` 时引擎把 `<html data-theme>` 置为 dark、body 换成 `.vs-dark`（light 同理），
   App 自带的暗色样式表、icube 别名层、CSS module 颜色全部进入对应语境——tooltip 黑字、用户名黑字这类问题在握手后自愈。
   用户在 App 设置里手动切主题时引擎监听 `data-theme` 并重断言。恢复默认时，App 原始外观被精确还原。

2. **全命名空间扇出**：角色被写到 `<html>` 的内联样式上（优先级高于 `:root` 和 `[data-theme]` 定义），覆盖：
   `--bg-bg-*`(29) `--text-text-*`(15) `--icon-icon-*`(15) `--border-border-*`(6)
   `--vscode-icube--*`(bg/text/icon/border/status 30/diff 5)
   `--vscode-*` 核心兼容层（59 个通用表面、文本、控件与状态变量）
   `--ras-bg-bg-*`(25) `--brand-brand-*`+grey(22，用 `color-mix` 从 accent 派生整条色阶)
   `--popup-menu-*`(18)。
   未覆盖：固定分类色板（accent-accent-9 色）、code-code、gradient、solo-title、special，以及旧版核心层中的尺寸、字体、ANSI 终端色——保持 App 原值。

   VS Code 核心兼容层不是独立的主题配置入口；它把遗留变量桥接回已有 V3 角色。例如
   `--vscode-sideBar-background → tokens.surface.secondary`、
   `--vscode-foreground → tokens.text.primary`、
   `--vscode-widget-border → tokens.border.subtle`、
   `--vscode-testing-iconPassed → tokens.state.success`。
   因此主题作者无需为 IM Channel 或其他遗留页面声明专用组件槽位。

   此外，App 还会在 `body` / `.solo-theme` / `body.icube-chat-next` 上按"最近祖先优先"重定义部分令牌
   （典型如 `--bg-bg-overlay-l1`），会遮蔽 `<html>` 内联值。引擎额外生成一份带 `!important` 的
   作用域样式（`trae-dream-skin-scope-style`），把全部扇出变量在这三个作用域上再声明一遍，
   保证任何嵌套层级的组件都拿到主题值（修复 Code 落地页输入框与 Work 不一致的问题）。

3. **角色推导**：缺省角色自动补全——hover/active 用 `color-mix` 派生、subtle 用透明度、
   `onAccent` 按 WCAG 亮度自动选黑/白、text/icons/border/state 有完整默认链。

4. **对比度护栏**：应用主题时引擎对 9 组关键 fg/bg 角色对做 WCAG 对比度审计，
   不达标在控制台告警并在 apply 返回值里带 `contrastWarnings` 计数（单测里同类审计拦截了浅主题 tooltip 事故）。

5. **图标 glyph 替换**：CSS mask 方案（`background: currentColor` + mask），颜色自动跟随 `--icon-icon-*`；
   93% 的 App 内联 SVG 带 `trae-icon-*` 语义类名（抽查 107 个），漏网的用 `selector` 逃生舱。

## 四、主题专属 CSS 与硬编码登记表（逃生舱）

只属于单套主题的组件造型与动效写入该主题的 `theme.css`，并以
`body.trae-skin-theme-<id>` 限定作用域。注入器把它与主题目录一同打包，切换主题时动态替换
`trae-dream-skin-theme-style`，恢复默认时完整移除。`theme.json` 仍只保存声明式角色与组件配置。

握手 + 扇出之后仍影响所有主题的真·硬编码组件，才集中登记在 `skin.js` 静态样式区（选择器用
`[class*="module__semantic"]` 属性子串抵御哈希后缀漂移）。新增条目先跑对比度审计确认确为硬编码再登记。
