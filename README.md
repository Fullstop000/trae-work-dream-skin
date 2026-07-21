# TRAE Work Dream Skin

TRAE Work CN（TRAE SOLO CN.app）的主题画廊平台：内置多套主题，App 内画廊面板或命令行一键切换。
思路移植自 [Codex-Dream-Skin](https://github.com/Fei-Away/Codex-Dream-Skin)：本机回环 CDP 注入，
不改官方安装包、不碰代码签名。

## 用法

```bash
./dream-skin.command                 # 应用/刷新皮肤（已在皮肤模式则热更新，不重启 App）
./dream-skin.command themes          # 列出全部主题
./dream-skin.command theme ocean     # 一键切换主题
./dream-skin.command ~/美图.jpg       # 任意图片设为自定义主题
./restore.sh                         # 还原官方外观
```

App 右下角有一个调色盘浮动按钮，点开就是主题画廊，点击卡片即时切换；
面板右上角的“配置”可以查看并复制当前主题的完整 JSON 配置，还可用“面板模糊”
开关在清晰背景与毛玻璃效果之间即时切换。“恢复 TRAE 默认”会在二次确认后移除
全部 Dream Skin 主题和本地配置，恢复 TRAE Work 原生主题，但会保留右下角调色盘
入口；再次点击入口只打开主题画廊，选择某张主题卡片后才会应用。“恢复 TRAE 默认”
的确认态同时提供“取消”和“确认恢复”两个操作。
主题选择存在页面 localStorage，重启 App、切视图都保持；守护进程会把它同步到 `run/theme.conf`。

## 内置主题（themes/）

极光 aurora · 日落 sunset · 深海 ocean · 雾林 forest · 樱夜 sakura · 墨 mono

月苔工坊 moonmoss · 云海观星台 cloudsea · 黑曜机械师 obsidian · 暮沙驿站 duskdune ·
霓虹城区 neon-district · 仙舟「罗浮」 xianzhou-luofu

加新主题：`themes/<id>/` 里放 `background.(svg|png|jpg)` + `theme.json`（`{"id","name","desc"}`），
然后 `./dream-skin.command` 热刷新即可入画廊。

主题 V2 的完整设置范围、逐项验证结果和推荐 schema 见
[THEME_SETTINGS.md](./THEME_SETTINGS.md)。

## 结构

- `injector.mjs` — CDP 客户端。`--watch` 常驻（新 target / 导航 / 样式被清除时自动重注，
  并把页面里的主题选择同步回 `run/theme.conf`）；`--once` 热刷新；`--apply <id>` 切主题；
  `--current` 查当前主题；`--list` / `--eval` / `--shot` 调试用。
- `skin.js` — 页面载荷：背景层（CSS 变量驱动）、面板毛玻璃、画廊 UI、localStorage 持久化。
- `themes/` — 主题库；除主背景外，主题可选提供 `left-sidebar.*` 与 `right-panel.*`
  作为区域装饰背景；`run/` — 日志、pid、`theme.conf`。

## 安全边界

- CDP 只绑 `127.0.0.1`；启动脚本校验端口属于目标 App 进程
- 不修改 `.app` 内容、不碰签名；`restore.sh` 完全还原
- App 升级后 DOM 类名可能变化导致皮肤失效（无副作用），改 `skin.js` 里的选择器即可
