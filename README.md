# TRAE Work Dream Skin

TRAE Work CN 的主题引擎：内置多套主题、图标替换、深浅色自动适配。
通过本机 CDP（仅 127.0.0.1）在运行中的客户端注入主题样式，不修改官方安装包与代码签名。

## 安装

双击 `dist/trae-work-dream-skin-install.command`，或终端执行：

```bash
bash trae-work-dream-skin-install.command   # 与双击等价
# 可选：--yes 跳过确认直接启用；--no-launch 只安装不启用
```

安装器自动完成：环境检测（TRAE Work CN + Node.js 18+）→ 安装到 `~/.trae-work-dream-skin` →
创建桌面启动器和 `twds` 短命令（PATH 符号链接）→ 询问是否启用（重启 App 生效）。
重新运行安装器即升级，主题选择保留。

## 使用

- App 右下角调色盘按钮 → 主题画廊：分类 Tab 筛选、点卡片即切（无需重启）、
  ↻ 重载新主题、配置（主题 JSON / 毛玻璃开关）、底部「恢复默认」
- 桌面启动器或命令行完成全部操作：

| 操作 | 命令 |
|---|---|
| 启用 / 刷新 | `twds` |
| 切换主题 | `twds theme <id>` |
| 主题列表 | `twds themes` |
| 图片设为自定义主题 | `twds /path/to/图片.jpg` |
| 还原官方外观 | `~/.trae-work-dream-skin/restore.sh` |

## 主题

极光 aurora · 日落 sunset · 深海 ocean · 雾林 forest · 樱夜 sakura · 墨 mono ·
云海观星台 cloudsea · 暮沙驿站 duskdune · 月苔工坊 moonmoss · 黑曜机械师 obsidian ·
霓虹城区 neon-district · 仙舟「罗浮」 xianzhou-luofu

主题按 `themes/<id>/` 组织（`theme.json` + `background.*` + 可选 `icons/`、侧栏装饰图），
分类 Tab 取自 `theme.json` 的 `category` 字段。主题协议（schema v3）：[docs/schema-v3.md](docs/schema-v3.md)。

## 开发

```bash
node --test "tests/*.test.mjs"     # token-map 单测
bash scripts/build-installer.sh    # 重建安装器到 dist/
```

- `injector.mjs` — CDP 客户端（`--watch` 常驻注入 / `--once` 热刷新 / `--apply` 切主题 / `--eval` `--shot` 调试）
- `skin.js` — 页面载荷：背景层、毛玻璃面板、画廊 UI、主题引擎、外观握手、图标 mask
- `token-map.mjs` — 主题角色 → TRAE 设计令牌全命名空间扇出（纯函数）
- `fixtures/` — 设计令牌普查存档（映射表的数据依据）

## 安全边界

- CDP 仅绑 127.0.0.1；启动脚本校验端口属于目标 App 进程
- 不修改 `.app` 内容与签名；`restore.sh` 完全还原（含 App 原始外观）
- App 升级导致皮肤失效时无副作用，重新运行启动器或 `dream-skin.command` 即可

## License

MIT © Fullstop000 · [github.com/Fullstop000/trae-work-dream-skin](https://github.com/Fullstop000/trae-work-dream-skin)
