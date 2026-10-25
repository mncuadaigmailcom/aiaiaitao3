#!/usr/bin/env bash
# Chạy toàn bộ kiểm thử roblox-chat bằng Luau CLI + mock Roblox (không cần Studio).
#   bash roblox-chat/tests/run.sh
# Cần: node, curl, luau (đặt biến LUAU=/đường/dẫn/luau nếu không có trong PATH).
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$(dirname "$HERE")"
WORK="$HERE/.cache"
mkdir -p "$WORK"
LUAU="${LUAU:-$(command -v luau || true)}"
if [ -z "$LUAU" ]; then
  echo "Không tìm thấy luau. Tải ở https://github.com/luau-lang/luau/releases rồi đặt LUAU=..." >&2
  exit 1
fi
if [ ! -s "$WORK/api_data.luau" ]; then
  echo "Tải Roblox API dump..."
  curl -fsSL -o "$WORK/API-Dump.json" \
    https://raw.githubusercontent.com/MaximumADHD/Roblox-Client-Tracker/roblox/API-Dump.json
  node "$HERE/gen_api.js" "$WORK/API-Dump.json" "$WORK/api_data.luau"
fi

# build <tên> <test> <noserver|notevn|github> [setup] [nodemo] [sed cho server]
build() {
  local out="$WORK/$1.luau" drv="$HERE/$2" mode="$3" setup="${4:-}" nodemo="${5:-}" sedx="${6:-}"
  {
    echo "API_DATA = (function()"; cat "$WORK/api_data.luau"; echo "end)()"
    cat "$HERE/mock.luau" "$HERE/mock_server.luau" "$HERE/mock_github.luau"
    [ -n "$setup" ] && cat "$HERE/$setup"
    if [ "$mode" = notevn ]; then
      echo "task.spawn(function()"; sed 's/^--!nonstrict//' "$SRC/NotevnChatServer.server.luau"; echo "end)"
    elif [ "$mode" = github ]; then
      echo "task.spawn(function()"; sed -e 's/^--!nonstrict//' ${sedx:+-e "$sedx"} "$SRC/GitHubChatServer.server.luau"; echo "end)"
    fi
    echo "task.spawn(function()"
    if [ -n "$nodemo" ]; then
      sed -e 's/^--!nonstrict//' -e 's/^\tDemoMode = true,/\tDemoMode = false,/' "$SRC/ChatMenu.client.luau"
    else
      sed 's/^--!nonstrict//' "$SRC/ChatMenu.client.luau"
    fi
    echo "end)"
    cat "$drv"
  } > "$out"
  echo "$out"
}

status=0
run() {
  local name="$1"; shift
  echo "== $name"
  local file; file="$(build "$name" "$@")"
  local log; log="$("$LUAU" "$file" 2>&1)" || true
  echo "$log" | grep -E "FAIL|RESULT|SCRIPT ERROR|text faded after" || true
  if echo "$log" | grep -qE "FAIL|SCRIPT ERROR| [1-9][0-9]* failed|faded after 35s:.false"; then status=1; fi
}
run ui        test_ui.luau        noserver
run fade      test_fade.luau      noserver "" nodemo
run notevn    test_notevn.luau    notevn setup_notevn.luau
run http_off  test_http_off.luau  notevn setup_http_off.luau
run github    test_github.luau    github
run github_owner test_github_owner.luau github setup_github_owner.luau "" 's/^\tRepoOwner = "",/\tRepoOwner = "chatowner",/'
run github_clear test_github_clear.luau github "" "" 's/^\tClearOnShutdown = false,/\tClearOnShutdown = true,/' 
exit $status
