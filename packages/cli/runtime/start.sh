#!/bin/bash
# TRAE Work Skin — 启动脚本
# 退出目标 App → 带 CDP 调试参数重启 → 启动注入守护进程
set -euo pipefail

SRC="${BASH_SOURCE[0]}"
while [ -L "$SRC" ]; do SRC="$(/usr/bin/readlink "$SRC")"; done
DIR="$(cd "$(dirname "$SRC")" && pwd -P)"
PORT="${PORT:-19527}"
APP_BUNDLE="${APP_BUNDLE:-/Applications/TRAE SOLO CN.app}"
APP_BUNDLE_ID="${APP_BUNDLE_ID:-cn.trae.solo.app}"
APP_PROC_MATCH="${APP_PROC_MATCH:-TRAE SOLO CN}"
NODE_BIN="${NODE_BIN:-node}"
TWSKIN_DATA_ROOT="${TWSKIN_DATA_DIR:-${HOME}/.trae-work-skin}"
RUN_DIR="${TWSKIN_STATE_DIR:-$TWSKIN_DATA_ROOT/run}"
THEMES_DIR="${TWSKIN_THEMES_DIR:-$TWSKIN_DATA_ROOT/themes}"

fail() { printf 'twskin: %s\n' "$*" >&2; exit 1; }

[ -d "$APP_BUNDLE" ] || fail "app not found: $APP_BUNDLE"
mkdir -p "$RUN_DIR"

EXE_NAME="$(/usr/bin/plutil -extract CFBundleExecutable raw -o - "$APP_BUNDLE/Contents/Info.plist")"
EXE_PATH="$APP_BUNDLE/Contents/MacOS/$EXE_NAME"
[ -x "$EXE_PATH" ] || fail "executable missing: $EXE_PATH"

# 1. 退出正在运行的实例（调试参数只在启动时生效）
if /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1; then
  printf 'Quitting %s ...\n' "$APP_BUNDLE"
  /usr/bin/osascript -e "tell application id \"$APP_BUNDLE_ID\" to quit" >/dev/null 2>&1 || true
  deadline=$((SECONDS + 20))
  while /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1 && [ "$SECONDS" -lt "$deadline" ]; do
    /bin/sleep 0.5
  done
  /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1 && fail "app did not quit in time"
fi

# 2. 带 CDP 参数启动（只绑回环地址）
printf 'Launching %s with CDP on 127.0.0.1:%s ...\n' "$APP_BUNDLE" "$PORT"
/usr/bin/open -na "$APP_BUNDLE" --args \
  --remote-debugging-address=127.0.0.1 \
  --remote-debugging-port="$PORT" || true

cdp_ready() {
  /usr/bin/curl --noproxy '*' --silent --fail --max-time 1 \
    "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1
}

deadline=$((SECONDS + 45))
until cdp_ready || [ "$SECONDS" -ge "$deadline" ]; do /bin/sleep 0.5; done

# 兜底：open 传参失败时直接执行二进制
if ! cdp_ready; then
  printf 'open(1) did not bring up CDP, falling back to direct exec ...\n'
  /usr/bin/pgrep -f "$EXE_PATH" >/dev/null 2>&1 || true
  /usr/bin/nohup "$EXE_PATH" \
    --remote-debugging-address=127.0.0.1 \
    --remote-debugging-port="$PORT" \
    >>"$RUN_DIR/app.log" 2>&1 &
  deadline=$((SECONDS + 45))
  until cdp_ready || [ "$SECONDS" -ge "$deadline" ]; do /bin/sleep 0.5; done
fi
cdp_ready || fail "CDP endpoint never came up on port $PORT"

# 3. 确认端口确实属于目标 App 进程
port_pid="$(/usr/sbin/lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | /usr/bin/head -n 1)"
[ -n "$port_pid" ] || fail "no listener on port $PORT"
port_cmd="$(/bin/ps -p "$port_pid" -o command= 2>/dev/null || true)"
case "$port_cmd" in
  *"$APP_PROC_MATCH"*) ;;
  *) fail "port $PORT is owned by an unexpected process: $port_cmd" ;;
esac

# 4. 启动注入守护进程（主题目录 ./themes，默认主题记于 run/theme.conf）
[ -f "$RUN_DIR/theme.conf" ] || echo "aurora" > "$RUN_DIR/theme.conf"
if [ -f "$RUN_DIR/injector.pid" ]; then
  old_pid="$(/bin/cat "$RUN_DIR/injector.pid")"
  [ -n "$old_pid" ] && /bin/kill "$old_pid" >/dev/null 2>&1 || true
fi
/usr/bin/nohup "$NODE_BIN" "$DIR/injector.mjs" --watch --port "$PORT" \
  --themes "$THEMES_DIR" \
  >>"$RUN_DIR/injector.log" 2>&1 &
echo "$!" > "$RUN_DIR/injector.pid"
echo "$PORT" > "$RUN_DIR/port"
printf 'Dream skin running: injector pid %s, CDP port %s\n' "$(/bin/cat "$RUN_DIR/injector.pid")" "$PORT"
