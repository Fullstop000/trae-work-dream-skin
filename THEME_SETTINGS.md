# TRAE Dream Skin 主题设置审计

> 审计对象：TRAE SOLO CN 1.107.1  
> 审计日期：2026-07-20  
> 目的：确定 `theme.json` 除背景图之外，哪些视觉属性确实有稳定的应用落点。

## 结论

目前 `theme.json` 只有背景图和三项面板参数，远远不够表达一个完整主题。

这次审计确认了 **15 组可主题化能力**：背景、整体布局、面板、语义颜色、文字、图标、边框圆角、阴影、动效、滚动条、控件状态、聊天内容、浮层、三种模式专属区域，以及 Code 工作台。

这里的“完整”指：

- 覆盖 TRAE 1.107.1 当前页面中实际出现的 Work、Code、Design 界面；
- 覆盖已加载样式表中可以确认的条件性界面；
- 不把窗口尺寸、业务文案、交互逻辑等非主题职责塞进主题配置。

它不是永久不变的全集。TRAE 升级、实验功能或尚未进入过的页面仍可能增加新组件。因此实现时应保留 `extensions` 和版本化的适配层。

## 验证标记

| 标记 | 含义 |
| --- | --- |
| A | 当前 DOM 中存在，并检查过尺寸、颜色或交互状态 |
| B | 当前未挂载，但在已加载 CSS 规则或语义变量中有明确落点 |
| C | 属于合理扩展位，但本次没有足够证据，不应进入第一版公开配置 |

本次页面快照包含约 3,384 个元素、242 个 SVG、230 个 TRAE 图标实例、35 个可滚动容器。样式中发现 4,303 个 CSS 变量，其中 3,779 个是 `--vscode-*` 工作台变量。

## 已验证设置清单

### 1. 主题元数据

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `id` | A | 稳定主题标识 |
| `name` | A | 画廊显示名 |
| `description` | A | 画廊说明 |
| `author` | C | 可选的主题作者 |
| `version` | C | 主题自身版本 |
| `appearance` | A | `light`、`dark` 或 `auto`；TRAE 本身存在明暗两套语义色 |
| `preview` | A | 画廊缩略图；可默认复用背景图 |

### 2. 背景画面

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `background.image` | A | 主背景图 |
| `background.position` | A | 例如 `center center` |
| `background.size` | A | `cover`、`contain` 或明确尺寸 |
| `background.repeat` | A | 默认 `no-repeat` |
| `background.color` | A | 图片未加载和透明区域的底色 |
| `background.overlay.color` | A | 全局蒙层色 |
| `background.overlay.opacity` | A | 提高文字可读性 |
| `background.blur` | A | 背景本身的模糊，不等同于面板毛玻璃 |
| `background.brightness` | A | 背景亮度 |
| `background.saturation` | A | 背景饱和度 |
| `background.scale` | A | 模糊时防止边缘露白 |
| `background.parallax` | C | 当前没有稳定交互落点，第一版不做 |

### 3. 整体布局区域

Work 模式实际存在三个独立区域：左侧任务栏约 300px、聊天区约 520px、右侧主区占剩余空间。当前实现只处理了前两者，遗漏了 `.solo-lite-main-area`。

| 建议配置 | 验证 | 作用区域 |
| --- | --- | --- |
| `layout.app` | A | 根容器 |
| `layout.leftSidebar` | A | 任务列表、账户区、模式入口 |
| `layout.chatPanel` | A | 对话区 |
| `layout.mainArea` | A | Work 的 Task Summary / 状态与产物区域 |
| `layout.codeLanding` | A | Code 未打开文件夹时的落地页 |
| `layout.designLanding` | A | Design 落地页 |
| `layout.titlebar` | B | 打开 Code 工作台后出现 |
| `layout.activityBar` | B | Code 工作台活动栏 |
| `layout.secondarySidebar` | B | Code 工作台条件性右侧栏 |
| `layout.bottomPanel` | B | Terminal / Problems / Output 等 |
| `layout.statusbar` | B | Code 工作台状态栏 |
| `layout.gap` | A | 面板间隙的颜色和透明度 |
| `layout.divider` | A | 分隔线与拖拽条 |

每个区域统一接受：

- `background`
- `opacity`
- `backdropBlur`
- `backdropSaturation`
- `border`
- `shadow`

不建议让主题修改区域宽度、收起逻辑或拖拽行为；这些属于布局和交互设置。

### 4. 语义颜色

TRAE Solo UI 已有清晰的语义变量，主题应覆盖语义角色，而不是为每个组件硬编码颜色。

| 建议配置 | 验证 | 已确认的状态 |
| --- | --- | --- |
| `colors.background.base` | A | 主底色 |
| `colors.background.secondary` | A | 次级区域 |
| `colors.background.tertiary` | A | 更弱层级 |
| `colors.background.card` | A | 卡片 |
| `colors.background.input` | A | 输入区 |
| `colors.background.menu` | A | 菜单与列表框 |
| `colors.background.tooltip` | B | Tooltip |
| `colors.background.overlay` | B | l0-l4 多层遮罩 |
| `colors.text.primary` | A | 主文字 |
| `colors.text.secondary` | A | 次文字 |
| `colors.text.tertiary` | A | 辅助文字 |
| `colors.text.disabled` | A | 禁用文字 |
| `colors.text.onAccent` | A | 强调色上的文字 |
| `colors.icon.primary` | A | 主图标 |
| `colors.icon.secondary` | A | 次图标 |
| `colors.icon.tertiary` | A | 弱图标 |
| `colors.icon.disabled` | A | 禁用图标 |
| `colors.border.subtle` | A | l1 弱边框 |
| `colors.border.default` | A | l2 常规边框 |
| `colors.border.strong` | A | l3 强边框 |
| `colors.accent.default` | A | 品牌/主操作色 |
| `colors.accent.hover` | B | 悬停 |
| `colors.accent.active` | B | 按下 |
| `colors.accent.subtle` | A | 浅强调背景 |
| `colors.success.*` | B | 文字、图标、背景、边框 |
| `colors.warning.*` | B | 文字、图标、背景、边框 |
| `colors.error.*` | A | 文字、图标、背景、边框 |
| `colors.info.*` | B | 文字、图标、背景、边框 |

明暗模式必须允许两套值。实测切换后，Solo UI 的背景和文字变量会变化；仅修改 `body.vs-dark` 不会自动替换 3,779 个 `--vscode-*` 变量，所以 Code 工作台必须单独处理。

### 5. 字体与排版

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `typography.ui.family` | A | UI 字体 |
| `typography.ui.size` | A | 常规字号 |
| `typography.ui.weight` | A | 常规字重 |
| `typography.heading.family` | A | 标题字体 |
| `typography.heading.weight` | A | 标题字重 |
| `typography.code.family` | A | 编辑器、命令和代码块 |
| `typography.code.size` | A | 代码字号 |
| `typography.lineHeight` | A | 正文行高 |
| `typography.letterSpacing` | B | 标题或特殊风格主题 |
| `typography.fontFaces` | B | 自带字体文件 |

当前可见 UI 主要使用 SF Pro Text 系统栈，代码使用 JetBrains Mono。页面还加载了 codicon、seti、icube 和 KaTeX 字体。实现时只能覆盖 UI、标题、正文和代码角色，不能把图标字体或数学字体一并替换。

### 6. 图标

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `icons.color.*` | A | 复用语义图标色 |
| `icons.opacity` | A | 全局图标强弱 |
| `icons.strokeWidth` | B | 仅对可安全覆盖的 SVG 生效 |
| `icons.decorative` | A | 模式入口、空状态、完成卡片等装饰图 |
| `icons.file.added` | A | 文件新增状态 |
| `icons.file.modified` | A | 文件修改状态 |
| `icons.status.*` | B | 成功、警告、错误、运行中 |
| `icons.functionalReplacement` | C | 第一版不开放 |

242 个 SVG 中有 236 个使用 `currentColor`，因此绝大多数图标只需改变语义颜色。替换复制、删除、发送、折叠等功能图标会破坏识别一致性，不应作为普通主题能力；只开放装饰性插画和少量状态图标。

### 7. 边框、圆角和阴影

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `shape.radius.small` | A | 标签、小按钮 |
| `shape.radius.medium` | A | 输入框、普通卡片 |
| `shape.radius.large` | A | 大卡片、弹层 |
| `shape.radius.pill` | A | 胶囊按钮 |
| `shape.border.width` | A | 默认边框宽度 |
| `shape.divider.width` | A | 区域分隔线 |
| `elevation.card` | A | 卡片阴影 |
| `elevation.floating` | A | 菜单、Popover |
| `elevation.modal` | B | 对话框 |
| `elevation.focusRing` | B | 键盘焦点环 |

### 8. 动效

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `motion.duration.fast` | B | hover 等即时反馈 |
| `motion.duration.normal` | A | 卡片和菜单 |
| `motion.duration.slow` | B | 大区域过渡 |
| `motion.easing.standard` | B | 标准曲线 |
| `motion.hoverLift` | A | 主题卡片等 |
| `motion.reduce` | B | 遵循 reduced-motion |

主题只能改变视觉节奏，不能改变业务动画的状态机。

### 9. 滚动条与拖拽条

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `scrollbar.track` | A | 35 个实际滚动容器 |
| `scrollbar.thumb` | A | 默认滑块 |
| `scrollbar.thumbHover` | B | 悬停 |
| `scrollbar.thumbActive` | B | 拖动 |
| `scrollbar.width` | A | 宽度 |
| `splitter.color` | A | 分隔拖拽条 |
| `splitter.hoverColor` | B | 可拖拽提示 |

### 10. 通用控件与状态

已加载样式规则中发现：hover 2,011 条、active 213 条、focus 429 条、focus-visible 86 条、disabled 864 条，以及 checked、selected、open/closed 等状态规则。

| 建议配置 | 验证 | 覆盖内容 |
| --- | --- | --- |
| `controls.button.primary.*` | A | 默认、hover、active、disabled、focus |
| `controls.button.secondary.*` | A | 同上 |
| `controls.button.ghost.*` | A | 工具栏图标按钮 |
| `controls.input.*` | A | 默认、hover、focus、disabled、placeholder |
| `controls.tab.*` | A | 默认、selected、hover |
| `controls.chip.*` | A | 模型、工具等胶囊项 |
| `controls.listItem.*` | A | 默认、hover、selected |
| `controls.checkbox.*` | B | 未在当前页面挂载，样式存在 |
| `controls.radio.*` | B | 同上 |
| `controls.switch.*` | B | 同上 |
| `controls.progress.*` | B | 加载和执行进度 |
| `controls.skeleton.*` | B | 加载占位 |

状态值至少需要：

- `background`
- `foreground`
- `icon`
- `border`
- `outline`

### 11. Work 聊天内容

| 建议配置 | 验证 | 作用对象 |
| --- | --- | --- |
| `chat.header` | A | 任务名、时间、固定和更多操作 |
| `chat.userBubble` | A | 用户消息气泡 |
| `chat.assistantMessage` | A | 助手消息 |
| `chat.avatar.user` | A | 用户头像的装饰边框/背景 |
| `chat.avatar.assistant` | A | 助手头像 |
| `chat.thoughtBlock` | A | 思考折叠块 |
| `chat.planBlock` | A | 计划与待办 |
| `chat.markdown` | A | 标题、正文、列表、链接 |
| `chat.code.inline` | A | 行内代码 |
| `chat.code.block` | B | 代码块 |
| `chat.table.header` | A | Markdown 表头 |
| `chat.table.cell` | A | Markdown 单元格 |
| `chat.fileCard.added` | A | 新增文件 |
| `chat.fileCard.modified` | A | 修改文件 |
| `chat.finishCard` | A | 完成结果卡片 |
| `chat.actionBar` | A | 赞、踩、复制、重试 |
| `chat.navigator` | A | 消息位置导航 |
| `chat.input` | A | 编辑区、占位文字、工具栏 |
| `chat.mention` | A | 文件或上下文引用 |
| `chat.streaming` | A | 生成中 |
| `chat.error` | A | 错误状态 |

### 12. 浮层与反馈

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `overlay.scrim` | B | 模态遮罩 |
| `popover.surface` | A | 实际打开过模型选择框 |
| `popover.border` | A | 同上 |
| `popover.shadow` | A | 同上 |
| `popover.groupLabel` | A | 模型分组标题 |
| `popover.item.*` | A | 默认、highlighted、selected、checked |
| `menu.*` | B | 普通菜单和右键菜单 |
| `tooltip.*` | B | 页面有容器，当前为隐藏状态 |
| `toast.default.*` | B | Sonner 规则已加载 |
| `toast.success.*` | B | 成功通知 |
| `toast.warning.*` | B | 警告通知 |
| `toast.error.*` | B | 错误通知 |
| `dialog.*` | B | 对话框、标题、正文、按钮区 |

### 13. Work 主区

这是当前实现最明显的缺口。`.solo-lite-main-area` 当前为不透明白色，会大面积盖住背景。

| 建议配置 | 验证 | 作用对象 |
| --- | --- | --- |
| `work.mainArea` | A | 主区整体表面 |
| `work.tabBar` | A | Task Summary 标签栏 |
| `work.statusSidebar` | A | 进度、产物、上下文侧栏 |
| `work.artifactCard` | A | 产物文件 |
| `work.contextCard` | A | Reference / Skill 上下文 |
| `work.emptyState` | A | 空状态图标、标题和说明 |

### 14. Code 与 Design 模式

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `code.hero.title` | A | “Code with TRAE” |
| `code.hero.subtitle` | A | 落地页说明 |
| `code.input` | A | 初始输入框 |
| `code.folderAction` | A | Local / Select folder |
| `code.toolChip` | A | Automation Tools |
| `design.hero.title` | A | “Design with TRAE” |
| `design.hero.subtitle` | A | 落地页说明 |
| `design.input` | A | 设计输入框 |
| `design.recommendationCard` | A | 推荐卡片 |
| `design.recommendationImage` | A | 推荐卡片图片区 |
| `design.recommendationTitle` | A | 卡片标题 |
| `design.recommendationDescription` | A | 卡片说明 |

### 15. Code 工作台与编辑器

本次 Code 模式处于“未打开文件夹”的落地页，`.monaco-workbench` 没有挂载，因此这一组是源码/变量验证，不是当前屏幕的像素验证。

已确认样式覆盖编辑器、行号槽、当前行、选区、标签页、面包屑、文件树、活动栏、侧栏、面板、终端、状态栏、命令中心、菜单、Quick Input、通知、Diff、Minimap、Notebook、Debug、SCM 和 Testing。

第一版不要在自定义 schema 中重新发明这 3,779 个字段。推荐直接支持标准 VS Code color theme：

| 建议配置 | 验证 | 说明 |
| --- | --- | --- |
| `workbench.colorTheme` | B | 指向单独的 VS Code 主题 JSON |
| `workbench.colors` | B | 对 `--vscode-*` 的少量覆盖 |
| `workbench.tokenColors` | B | 代码语法颜色 |
| `workbench.semanticTokenColors` | B | 语义高亮 |
| `workbench.editorFont` | B | 编辑器字体 |
| `workbench.terminalFont` | B | 终端字体 |
| `workbench.opacity.sidebar` | B | 额外的皮肤透明层 |
| `workbench.opacity.editor` | B | 编辑器透明层 |
| `workbench.opacity.panel` | B | 底部面板透明层 |

## 推荐的 `theme.json` V2 结构

下面是字段结构，不代表每个主题都必须填写全部值。省略项应继承基础主题。

```json
{
  "schemaVersion": 2,
  "id": "moonmoss",
  "name": "月苔工坊",
  "description": "小熊猫的月下温室工作室",
  "appearance": "dark",
  "preview": "background.jpg",
  "background": {
    "image": "background.jpg",
    "color": "#101914",
    "position": "center center",
    "size": "cover",
    "repeat": "no-repeat",
    "blur": 0,
    "brightness": 0.9,
    "saturation": 0.95,
    "overlay": {
      "color": "#07100b",
      "opacity": 0.08
    }
  },
  "layout": {
    "leftSidebar": {
      "background": "#101914",
      "opacity": 0.58,
      "backdropBlur": 16
    },
    "chatPanel": {
      "background": "#101914",
      "opacity": 0.68,
      "backdropBlur": 20
    },
    "mainArea": {
      "background": "#101914",
      "opacity": 0.64,
      "backdropBlur": 20
    },
    "gap": "#17251d",
    "divider": "#47615166"
  },
  "colors": {
    "accent": {
      "default": "#a8d59b",
      "hover": "#bce8af",
      "active": "#8fbd84",
      "subtle": "#a8d59b24"
    },
    "text": {
      "primary": "#edf5ea",
      "secondary": "#bdcdb8",
      "tertiary": "#8fa08a",
      "disabled": "#687464",
      "onAccent": "#122011"
    },
    "icon": {
      "primary": "#dcebd7",
      "secondary": "#aabaa5",
      "tertiary": "#7f917a",
      "disabled": "#657060"
    },
    "border": {
      "subtle": "#d8edd21f",
      "default": "#d8edd238",
      "strong": "#d8edd25c"
    },
    "success": "#8bd18b",
    "warning": "#e6c779",
    "error": "#ef8f83",
    "info": "#8fc5d6"
  },
  "typography": {
    "ui": {
      "family": "-apple-system, BlinkMacSystemFont, \"PingFang SC\", sans-serif"
    },
    "heading": {
      "family": "\"Instrument Serif\", \"Songti SC\", serif",
      "weight": 500
    },
    "code": {
      "family": "\"JetBrains Mono\", monospace"
    }
  },
  "shape": {
    "radius": {
      "small": 6,
      "medium": 10,
      "large": 14,
      "pill": 999
    }
  },
  "elevation": {
    "card": "0 8px 24px #00000024",
    "floating": "0 14px 40px #00000052",
    "focusRing": "0 0 0 2px #a8d59b66"
  },
  "scrollbar": {
    "track": "transparent",
    "thumb": "#cfe7c94d",
    "thumbHover": "#cfe7c975",
    "width": 8
  },
  "components": {
    "chat": {},
    "work": {},
    "code": {},
    "design": {},
    "popover": {},
    "toast": {}
  },
  "workbench": {
    "colorTheme": "workbench-color-theme.json",
    "opacity": {
      "sidebar": 0.58,
      "editor": 0.76,
      "panel": 0.64
    }
  },
  "extensions": {}
}
```

## 实现边界

以下内容不应成为主题设置：

- 左右栏宽度、窗口大小和面板显隐；
- 按钮功能、快捷键和菜单内容；
- 任务文案、推荐内容和模型列表；
- 文件图标所表达的文件类型；
- 焦点顺序、键盘行为和可访问性语义；
- OS 文件选择器、原生窗口菜单和系统通知；
- iframe、webview 或第三方扩展内部没有公开变量的页面。

## 实现建议

1. 将主题配置分为 **语义 token** 和 **TRAE 适配器**。主题只声明“主文字色、侧栏表面”等含义，适配器负责映射当前版本的变量和选择器。
2. 先实现背景、三大布局面板、语义颜色、字体、形状、滚动条、控件状态、Work 聊天、浮层九组；它们已经有 A 级验证。
3. Code 工作台直接兼容标准 VS Code 主题文件，并另外叠加透明度，不逐项复制 3,779 个变量。
4. 对哈希类名只作为最后手段；优先使用语义变量、稳定类名、ARIA role 和 `data-state`。
5. 每次 TRAE 升级后运行一次同样的 DOM/token 审计，并记录 `adapterVersion`。

## 尚未完成像素验证的条件性界面

- 打开真实项目后的完整 Monaco 工作台；
- Terminal、Problems、Output、Debug、SCM、Testing、Notebook；
- 实际弹出的模态对话框、Toast、Tooltip；
- 只在特定任务状态出现的错误、权限、更新和审批页面；
- 第三方扩展或远端页面。

这些项目已有 B 级证据，可以预留适配，但在进入 V2 的“保证兼容”范围前还应逐屏截图验证。
