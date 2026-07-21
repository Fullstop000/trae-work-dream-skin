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
| 镜像层 | `--ras-bg-bg-*` | 25 | 设置页等组件消费 |
| 原语色阶 | `--brand-brand-*` (+grey) | 22 | 50~950 色阶 |
| 组件令牌 | `--popup-menu-*` | 22 | 下拉/浮层菜单 |
| 主题开关 | `<html data-theme>` + `body.light/.vs-dark` | — | App 自己的 light/dark 语境（210 条规则依赖） |

## 一、主题文件结构（themes/&lt;id&gt;/）

```
themes/<id>/
├── theme.json        # 协议文件
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
    "settings": { "overlay": "…", "panel": "…", "sidebar": "…", "card": "…", "control": "…", "active": "…" }
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

## 三、引擎行为保证

1. **外观握手**：`appearance: "dark"` 时引擎把 `<html data-theme>` 置为 dark、body 换成 `.vs-dark`（light 同理），
   App 自带的暗色样式表、icube 别名层、CSS module 颜色全部进入对应语境——tooltip 黑字、用户名黑字这类问题在握手后自愈。
   用户在 App 设置里手动切主题时引擎监听 `data-theme` 并重断言。恢复默认时，App 原始外观被精确还原。

2. **全命名空间扇出**：角色被写到 `<html>` 的内联样式上（优先级高于 `:root` 和 `[data-theme]` 定义），覆盖：
   `--bg-bg-*`(29) `--text-text-*`(15) `--icon-icon-*`(15) `--border-border-*`(6)
   `--vscode-icube--*`(bg/text/icon/border/status 30/diff 5)
   `--ras-bg-bg-*`(25) `--brand-brand-*`+grey(22，用 `color-mix` 从 accent 派生整条色阶)
   `--popup-menu-*`(18)。
   未覆盖：固定分类色板（accent-accent-9 色）、code-code、gradient、solo-title、special——保持 App 原值。

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

## 四、硬编码登记表（逃生舱）

握手 + 扇出之后仍漏色的真·硬编码组件，集中登记在 `skin.js` 静态样式区（选择器用 `[class*="module__semantic"]`
属性子串抵御哈希后缀漂移）。原则：**补丁集中在引擎一处，不写进 theme.json**；TRAE 升级后只改一行。
新增条目先跑对比度审计确认确为硬编码再登记。
