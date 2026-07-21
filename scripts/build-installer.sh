#!/bin/bash
# 打包一键安装器：dist/trae-work-dream-skin-install.command
# 只包含运行时被引用的文件（主题源文件 *-source.* 不打包）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIST="$ROOT/dist"
STAGE="$DIST/.stage"
PAYLOAD="$DIST/.payload.tar.gz"
OUT="$DIST/trae-work-dream-skin-install.command"

/bin/rm -rf "$STAGE" "$OUT" "$PAYLOAD"
/bin/mkdir -p "$STAGE/trae-work-dream-skin"

for f in injector.mjs skin.js token-map.mjs start.sh restore.sh dream-skin.command README.md; do
  /bin/cp "$ROOT/$f" "$STAGE/trae-work-dream-skin/"
done
for d in docs tests fixtures; do
  [ -d "$ROOT/$d" ] && /bin/cp -R "$ROOT/$d" "$STAGE/trae-work-dream-skin/$d"
done

/bin/mkdir -p "$STAGE/trae-work-dream-skin/themes"
for dir in "$ROOT/themes"/*/; do
  id="$(/usr/bin/basename "$dir")"
  dest="$STAGE/trae-work-dream-skin/themes/$id"
  /bin/mkdir -p "$dest"
  for f in theme.json \
    background.svg background.png background.jpg background.jpeg \
    left-sidebar.png left-sidebar.jpg left-sidebar.jpeg \
    right-panel.png right-panel.jpg right-panel.jpeg; do
    [ -f "$dir/$f" ] && /bin/cp "$dir/$f" "$dest/"
  done
  [ -d "$dir/icons" ] && /bin/cp -R "$dir/icons" "$dest/"
done

/usr/bin/tar -czf "$PAYLOAD" -C "$STAGE" trae-work-dream-skin
/bin/cp "$ROOT/scripts/install-template.sh" "$OUT"
/usr/bin/base64 -i "$PAYLOAD" >> "$OUT"
/bin/chmod +x "$OUT"
/bin/rm -rf "$STAGE" "$PAYLOAD"

printf 'installer: %s\n' "$OUT"
printf '  themes: %s\n' "$(/usr/bin/du -sh "$ROOT/themes" | /usr/bin/cut -f1) total in repo"
printf '  installer size: %s\n' "$(/usr/bin/du -sh "$OUT" | /usr/bin/cut -f1)"
