# TRAE Work Skin

TRAE Work CN 的非官方社区主题引擎：内置多套主题、图标替换、深浅色自动适配。
通过本机 CDP（仅 127.0.0.1）在运行中的客户端注入主题样式，不修改官方安装包与代码签名。

> **非官方声明：** TRAE Work Skin 是由社区开发的 TRAE Work 非官方主题管理器，
> 与 TRAE 或字节跳动不存在隶属、授权或赞助关系。

## 安装

推荐通过 npm 安装正式 CLI（仅支持 macOS，需要 Node.js 22+）：

```bash
npm install --global twskin
twskin start
```

npm 包只包含经过 SHA-256 清单约束的 CLI 与注入运行时。主题从
`~/.trae-work-skin/themes` 加载，也可用 `TWSKIN_THEMES_DIR` 指定其他目录。
首次执行 `twskin start` 时，如果主题目录为空，CLI 会询问是否从最新 GitHub Release
下载并校验官方主题包；后续启动直接使用本地主题。自动化安装可使用
`twskin start --yes` 显式同意下载。
CLI package 的发布说明、贡献规范与主题分发决策位于 [`packages/cli`](packages/cli/README.md)。

## 使用

- App 右下角调色盘按钮 → 主题画廊：分类 Tab 筛选、点卡片即切（无需重启）、
  ↻ 重载新主题、配置（主题 JSON / 毛玻璃开关）、底部「恢复默认」
- 使用命令行完成全部操作：

| 操作 | 命令 |
|---|---|
| 安装 / 启动 Theme Manager 与守护进程 | `twskin start` |
| 查看运行状态 | `twskin status` |
| 检查运行环境 | `twskin doctor` |
| 切换主题 | `twskin theme <id>` |
| 下载全部或指定官方主题 | `twskin theme download [id]` |
| 从本地目录加载主题 | `twskin theme load <directory>` |
| 主题列表 | `twskin themes` |
| 还原官方外观 | `twskin restore` |
| 卸载 | `twskin uninstall` |
| 查看版本 / 帮助 | `twskin version` / `twskin help` |

`twskin theme <id>` 在 Theme Manager 运行时立即热切换；未运行时保存选择，
下次执行 `twskin start` 时生效。`status`、`themes`、`doctor` 也支持 `--json`。

## 主题

极光 aurora · 日落 sunset · 深海 ocean · 雾林 forest · 樱夜 sakura · 墨 mono ·
云海观星台 cloudsea · 暮沙驿站 duskdune · 月苔工坊 moonmoss · 黑曜机械师 obsidian ·
霓虹城区 neon-district · 仙舟「罗浮」 xianzhou-luofu · 鬼灭之刃「墨刃日轮」 kimetsu-no-yaiba

主题按 `themes/<id>/` 组织（`theme.json` + `background.*` + 可选 `theme.css`、`icons/`、侧栏装饰图），
分类 Tab 取自 `theme.json` 的 `category` 字段。主题协议（schema v3）：[docs/schema-v3.md](docs/schema-v3.md)。
`theme.css` 用于主题独有的组件造型和动效，切换主题时由注入器动态替换，不进入核心 `skin.js`。
源码开发时默认直接读取本仓库的 `themes/`；npm 安装默认读取
`~/.trae-work-skin/themes/`。官方主题通过 GitHub Release 独立发布，CLI 包中不内嵌图片。

## 开发

```bash
node --test "tests/*.test.mjs"                           # token/component 映射单测
(cd packages/cli && npm run prepare:runtime && npm test) # CLI 与发布包测试
(cd packages/cli && npm run build:themes)                # 构建独立 GitHub Release 主题包
```

- `packages/cli/src/*.ts` — `twskin` 的严格 TypeScript 命令层，使用 Clack 提供交互提示与进度反馈
- `packages/cli/runtime/` — 单一运行时源目录：CDP 注入器、页面逻辑、共享/Manager 样式、令牌/组件映射与 macOS 启停脚本
- `fixtures/` — 设计令牌普查存档（映射表的数据依据）

## 安全边界

- CDP 仅绑 127.0.0.1；启动脚本校验端口属于目标 App 进程
- 不修改 `.app` 内容与签名；`packages/cli/runtime/restore.sh` 完全还原（含 App 原始外观）
- App 升级导致皮肤失效时无副作用，重新运行 `twskin start` 即可

## License

MIT © Fullstop000 · [github.com/Fullstop000/trae-work-dream-skin](https://github.com/Fullstop000/trae-work-dream-skin)
