#!/bin/bash
# TRAE Work Dream Skin 一键安装器（自解压单文件，由 scripts/build-installer.sh 生成）
set -euo pipefail

APP_BUNDLE_ID="cn.trae.solo.app"
APP_PROC_MATCH="TRAE SOLO CN"
INSTALL_DIR="$HOME/.trae-work-dream-skin"
LAUNCHER="$HOME/Desktop/TRAE Dream Skin.command"
AUTO_YES="false"
LAUNCH_AFTER="true"
for arg in "$@"; do
  case "$arg" in
    --yes|-y) AUTO_YES="true" ;;
    --no-launch) LAUNCH_AFTER="false" ;;
  esac
done

say() { printf '%s\n' "$*"; }
fail() { printf '安装失败：%s\n' "$*" >&2; exit 1; }

[ "$(uname -s)" = "Darwin" ] || fail "仅支持 macOS"

# 1. 检测 TRAE Work CN
APP_BUNDLE="/Applications/TRAE SOLO CN.app"
if [ ! -d "$APP_BUNDLE" ]; then
  found="$(/usr/bin/mdfind "kMDItemCFBundleIdentifier == '$APP_BUNDLE_ID'" 2>/dev/null | /usr/bin/head -n 1 || true)"
  [ -n "$found" ] && APP_BUNDLE="$found"
fi
[ -d "$APP_BUNDLE" ] || fail "未找到 TRAE Work CN（TRAE SOLO CN.app），请先到 trae.cn 下载安装"

# 2. 检测 Node.js（injector 的运行时，v18+）
NODE_BIN="${NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  for c in "$(command -v node || true)" /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.openagents/nodejs/bin/node"; do
    [ -n "$c" ] && [ -x "$c" ] && NODE_BIN="$c" && break
  done
fi
if [ -z "$NODE_BIN" ] && [ -d "$HOME/.nvm/versions/node" ]; then
  latest="$(/bin/ls -1 "$HOME/.nvm/versions/node" | /usr/bin/sort -V | /usr/bin/tail -n 1)"
  [ -n "$latest" ] && NODE_BIN="$HOME/.nvm/versions/node/$latest/bin/node"
fi
[ -n "$NODE_BIN" ] || fail "未找到 Node.js（需要 v18+），请先安装 Node.js 后重试"
node_ver="$("$NODE_BIN" --version)"
major="$(printf '%s' "$node_ver" | /usr/bin/sed 's/^v//; s/\..*//')"
case "$major" in ''|*[!0-9]*) fail "无法解析 Node.js 版本：$node_ver" ;; esac
[ "$major" -ge 18 ] || fail "Node.js 版本过低（$node_ver），需要 v18+"

say "→ TRAE Work CN: $APP_BUNDLE"
say "→ Node.js: $NODE_BIN ($node_ver)"

# 3. 自解压并安装到 ~/.trae-work-dream-skin
tmp="$(/usr/bin/mktemp -d)"
trap '/bin/rm -rf "$tmp"' EXIT
/usr/bin/sed -n '/^__PAYLOAD_BELOW__$/,$p' "$0" | /usr/bin/tail -n +2 | /usr/bin/base64 -D | /usr/bin/tar -xz -C "$tmp" || fail "安装包损坏（解压失败）"
/bin/mkdir -p "$INSTALL_DIR"
/usr/bin/rsync -a --delete --exclude 'run/' "$tmp/trae-work-dream-skin/" "$INSTALL_DIR/" 2>/dev/null || {
  /bin/cp -R "$tmp/trae-work-dream-skin/"* "$INSTALL_DIR/"
}
/bin/chmod +x "$INSTALL_DIR"/*.command "$INSTALL_DIR"/*.sh 2>/dev/null || true
say "→ 已安装到 $INSTALL_DIR"

# 4. 桌面启动器（固化检测到的路径，以后双击即用）
/bin/mkdir -p "$HOME/Desktop"
/usr/bin/printf '%s\n' '#!/bin/bash' '# TRAE Work Dream Skin 启动器' \
  "export APP_BUNDLE=\"$APP_BUNDLE\" APP_BUNDLE_ID=\"$APP_BUNDLE_ID\" APP_PROC_MATCH=\"$APP_PROC_MATCH\" NODE_BIN=\"$NODE_BIN\"" \
  "exec \"$INSTALL_DIR/dream-skin.command\" \"\$@\"" > "$LAUNCHER"
/bin/chmod +x "$LAUNCHER"
say "→ 桌面启动器: $LAUNCHER"

# 5. 首次启用（退出并带皮肤重启 App）
if [ "$LAUNCH_AFTER" = "true" ] && [ "$AUTO_YES" != "true" ]; then
  printf '现在启用皮肤吗？将会退出并重启 TRAE Work CN。[Y/n] '
  read -r answer
  case "$answer" in n|N|no|NO) LAUNCH_AFTER="false" ;; esac
fi
if [ "$LAUNCH_AFTER" = "true" ]; then
  export APP_BUNDLE APP_BUNDLE_ID APP_PROC_MATCH NODE_BIN
  exec "$INSTALL_DIR/start.sh"
else
  say "完成。以后双击桌面「TRAE Dream Skin.command」即可启用/刷新皮肤。"
fi
exit 0

__PAYLOAD_BELOW__
