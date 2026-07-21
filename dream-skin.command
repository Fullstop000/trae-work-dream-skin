#!/bin/bash
# TRAE Work Dream Skin — 一键入口
#
#   ./dream-skin.command                 应用/刷新皮肤（已在皮肤模式则热更新，不重启 App）
#   ./dream-skin.command themes          列出全部主题
#   ./dream-skin.command theme <id>      一键切换主题（如 theme ocean）
#   ./dream-skin.command /path/图.jpg    把任意图片设为自定义主题并生效
#
# 也可以直接在 App 右下角点调色盘按钮，打开主题画廊点击切换。
# 还原官方外观：./restore.sh
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$DIR"
RUN_DIR="$DIR/run"
PORT="$(cat "$RUN_DIR/port" 2>/dev/null || echo 19527)"
mkdir -p "$RUN_DIR"

fail() { printf 'dream-skin: %s\n' "$*" >&2; exit 1; }

cdp_up() {
  /usr/bin/curl --noproxy '*' --silent --fail --max-time 1 \
    "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1
}

hot_inject() {  # 热更新 payload（不重启 App），并重启守护进程
  node "$DIR/injector.mjs" --once --port "$PORT"
  if [ -f "$RUN_DIR/injector.pid" ]; then
    old_pid="$(cat "$RUN_DIR/injector.pid")"
    [ -n "$old_pid" ] && kill "$old_pid" >/dev/null 2>&1 || true
  fi
  nohup node "$DIR/injector.mjs" --watch --port "$PORT" \
    >>"$RUN_DIR/injector.log" 2>&1 &
  echo "$!" > "$RUN_DIR/injector.pid"
}

list_themes() {
  for t in "$DIR"/themes/*/theme.json; do
    [ -f "$t" ] || continue
    node -e 'const m=require(process.argv[1]);console.log(`  ${m.id.padEnd(10)} ${m.name}  ${m.desc||""}`)' "$t"
  done
}

case "${1:-}" in
  themes)
    list_themes
    ;;
  theme)
    theme_id="${2:-}"
    [ -n "$theme_id" ] || fail "usage: ./dream-skin.command theme <id>（用 themes 子命令看列表）"
    [ -d "$DIR/themes/$theme_id" ] || fail "unknown theme: $theme_id（用 themes 子命令看列表）"
    echo "$theme_id" > "$RUN_DIR/theme.conf"
    if cdp_up; then
      node "$DIR/injector.mjs" --apply "$theme_id" --port "$PORT"
      printf 'Theme switched to %s (hot update).\n' "$theme_id"
    else
      printf 'First run: restarting the app with CDP ...\n'
      exec "$DIR/start.sh"
    fi
    ;;
  "")
    if cdp_up; then
      hot_inject
      printf 'Skin refreshed (hot update, app not restarted).\n'
    else
      printf 'First run: restarting the app with CDP ...\n'
      exec "$DIR/start.sh"
    fi
    ;;
  *)
    img="$1"
    [ -f "$img" ] || fail "image not found: $img"
    ext="$(echo "${img##*.}" | tr '[:upper:]' '[:lower:]')"
    case "$ext" in svg) out=svg;; png) out=png;; jpg|jpeg) out=jpg;; *) fail "unsupported image type: .$ext (use svg/png/jpg)";; esac
    mkdir -p "$DIR/themes/custom"
    rm -f "$DIR"/themes/custom/background.*
    /bin/cp "$img" "$DIR/themes/custom/background.$out"
    printf '{"id":"custom","name":"自定义","desc":"%s"}\n' "$(basename "$img")" > "$DIR/themes/custom/theme.json"
    echo "custom" > "$RUN_DIR/theme.conf"
    printf 'Custom theme installed from %s\n' "$img"
    if cdp_up; then
      hot_inject   # 重建目录后再切，否则旧 payload 里没有 custom
      node "$DIR/injector.mjs" --apply custom --port "$PORT"
      printf 'Custom theme applied (hot update).\n'
    else
      printf 'First run: restarting the app with CDP ...\n'
      exec "$DIR/start.sh"
    fi
    ;;
esac
