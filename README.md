# TRAE Work Dream Skin

TRAE Work CN（TRAE SOLO CN.app）的主题画廊平台：内置多套主题，App 内画廊面板或命令行一键切换。
思路移植自 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)：本机回环 CDP 注入，
不改官方安装包、不碰代码签名。

## 安装（开箱即用）

把 `dist/trae-work-dream-skin-install.command` 发给用户，双击即可：

1. 自动检测 TRAE Work CN 与 Node.js（v18+，缺啥报啥）
2. 自解压安装到 `~/.trae-work-dream-skin`（只含运行时文件，主题源文件不打包）
3. 创建桌面启动器「TRAE Dream Skin.command」
4. 询问是否立即启用（退出并带皮肤重启 App）

以后双击桌面启动器 = 启用/刷新；App 右下角调色盘 = 换主题；`~/.trae-work-dream-skin/restore.sh` = 还原。
重复运行安装器即升级（`run/` 里的主题选择会保留）。本仓库内构建：`bash scripts/build-installer.sh`。

**v3 主题协议**（当前唯一支持的 schema）：主题只声明角色（tokens），引擎把角色扇出到
TRAE 全部设计令牌命名空间，并把 App 自己的 `data-theme` 外观开关握手到与皮肤一致——
组件在任何页面自动一致。协议文档：[docs/schema-v3.md](docs/schema-v3.md)。
（v1/v2 引擎路径已移除，全部主题均为 v3；迁移前的 v2 设置范围存档见 [THEME_SETTINGS.md](./THEME_SETTINGS.md)。）

## 用法

```bash
./dream-skin.command                 # 应用/刷新皮肤（已在皮肤模式则热更新，不重启 App）
./dream-skin.command themes          # 列出全部主题
./dream-skin.command theme ocean     # 一键切换主题
./dream-skin.command ~/美图.jpg       # 任意图片设为自定义主题
./restore.sh                         # 还原官方外观
```

App 右下角有一个调色盘浮动按钮，点开就是主题画廊，点击卡片即时切换；
面板右上角的"配置"可以查看并复制当前主题的完整 JSON 配置，还可用"启用毛玻璃效果"
开关在清晰背景与毛玻璃效果之间即时切换；↻ 按钮用于加入新主题后热重载目录。
"恢复 TRAE 默认"会在二次确认后移除全部 Dream Skin 主题和本地配置，
恢复 TRAE Work 原生主题（含 App 原始 data-theme 外观），但会保留右下角调色盘入口；
再次点击入口只打开主题画廊，选择某张主题卡片后才会应用。
主题选择存在页面 localStorage，重启 App、切视图都保持；守护进程会把它同步到 `run/theme.conf`。

## 内置主题（themes/）

极光 aurora · 日落 sunset · 深海 ocean · 雾林 forest · 樱夜 sakura · 墨 mono

月苔工坊 moonmoss · 云海观星台 cloudsea · 黑曜机械师 obsidian · 暮沙驿站 duskdune ·
霓虹城区 neon-district(v3) · 仙舟「罗浮」 xianzhou-luofu(v3) · EVA 初号机 eva-01(v3)

加新主题：`themes/<id>/` 里放 `background.(svg|png|jpg)` + `theme.json`（`{"id","name","desc"}`），
然后 `./dream-skin.command` 热刷新或在画廊里点 ↻ 即可入画廊。

主题 V2 的完整设置范围、逐项验证结果和推荐 schema 见
[THEME_SETTINGS.md](./THEME_SETTINGS.md)；**v3 协议见 [docs/schema-v3.md](docs/schema-v3.md)**。

## 开发

```bash
node --test "tests/*.test.mjs"   # token-map 映射单测（角色→命名空间扇出、对比度护栏）
```

- `token-map.mjs` — 角色→全命名空间扇出的纯函数映射（普查驱动，UMD 文本）
- `fixtures/` — v0.3.4 黄金基线（v1/v2 回归对照）+ icube 别名层普查（107 vars）
- `injector.mjs` — CDP 客户端。`--watch` 常驻（新 target / 导航 / 样式被清除时自动重注，
  并把页面里的主题选择同步回 `run/theme.conf`，pid 文件单实例约定）；`--once` 热刷新；
  `--apply <id>` 切主题；`--current` 查当前主题；`--list` / `--eval` / `--shot` 调试用
- `skin.js` — 页面载荷：背景层（CSS 变量驱动）、面板毛玻璃、画廊 UI、v1/v2/v3 主题引擎、
  外观握手、图标 mask 引擎、localStorage 持久化
- `themes/` — 主题库；除主背景外，主题可选提供 `left-sidebar.*` 与 `right-panel.*`
  作为区域装饰背景、`icons/` 作为图标替换素材；`run/` — 日志、pid、`theme.conf`

## 安全边界

- CDP 只绑 `127.0.0.1`；启动脚本校验端口属于目标 App 进程
- 不修改 `.app` 内容、不碰签名；`restore.sh` 完全还原（含 App 原始 data-theme 外观）
- App 升级后 DOM 类名可能变化导致皮肤失效（无副作用），硬编码补丁集中登记在 `skin.js` 一处
