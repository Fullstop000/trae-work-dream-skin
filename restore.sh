#!/bin/bash
# TRAE Work Dream Skin — 一键还原
# 停掉注入守护进程，不带调试参数正常重启 App（注入的 CSS 随页面生命周期消失）
set -euo pipefail

SRC="${BASH_SOURCE[0]}"
while [ -L "$SRC" ]; do SRC="$(/usr/bin/readlink "$SRC")"; done
DIR="$(cd "$(dirname "$SRC")" && pwd -P)"
APP_BUNDLE="${APP_BUNDLE:-/Applications/TRAE SOLO CN.app}"
APP_BUNDLE_ID="${APP_BUNDLE_ID:-cn.trae.solo.app}"
RUN_DIR="$DIR/run"

if [ -f "$RUN_DIR/injector.pid" ]; then
  pid="$(/bin/cat "$RUN_DIR/injector.pid")"
  if [ -n "$pid" ] && /bin/kill -0 "$pid" 2>/dev/null; then
    /bin/kill "$pid" 2>/dev/null || true
    printf 'Injector %s stopped.\n' "$pid"
  fi
  /bin/rm -f "$RUN_DIR/injector.pid" "$RUN_DIR/port"
fi

EXE_NAME="$(/usr/bin/plutil -extract CFBundleExecutable raw -o - "$APP_BUNDLE/Contents/Info.plist")"
EXE_PATH="$APP_BUNDLE/Contents/MacOS/$EXE_NAME"
if /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1; then
  /usr/bin/osascript -e "tell application id \"$APP_BUNDLE_ID\" to quit" >/dev/null 2>&1 || true
  deadline=$((SECONDS + 20))
  while /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1 && [ "$SECONDS" -lt "$deadline" ]; do
    /bin/sleep 0.5
  done
fi
/usr/bin/open -na "$APP_BUNDLE"
printf 'Restored official appearance; %s relaunched without debug flags.\n' "$APP_BUNDLE"
