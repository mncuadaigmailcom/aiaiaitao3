#!/usr/bin/env python3
"""Trích code THẬT từ file hub ra từng khối để test được ngoài Roblox.

- tests/.build/embed_block.lua : khối nhúng GUI (ScanNewGuis / ForceStretchToParent /
  S.RegisterEmbed / S.EmbedGui ...) + prologue khai báo S, New, gui giả.
- tests/.build/wrapper.lua     : đúng đoạn code mà nút "📏 Code Tự Co Giãn" sinh ra
  (chèn code người dùng giả vào giữa) để kiểm tra nó không phá GUI của game.

Vì test chạy trên code ĐƯỢC TRÍCH, không phải bản chép tay, nên sửa hub mà quên sửa test
thì test vẫn phản ánh đúng hành vi thật.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HUB = os.path.join(ROOT, "aiaiaitao3")
BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".build")
os.makedirs(BUILD, exist_ok=True)

src = open(HUB, encoding="utf-8").read()

# Luau dùng a += 1 (không có trong Lua 5.1-5.3) -> đổi sang dạng tương đương cho VM test.
STOP = r"\b(?:then|else|elseif|end|do|break|return|local|function)\b"
COMPOUND = re.compile(
    r"\b([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)\s*([-+*/]|//)=\s*"
    r"((?:(?!" + STOP + r")[^;\n])+)")


def to_lua5(text):
    return COMPOUND.sub(
        lambda m: f"{m.group(1)} = {m.group(1)} {'/' if m.group(2) == '//' else m.group(2)} ({m.group(3).strip()})",
        text)


def cut(start_marker, end_marker):
    i = src.index(start_marker)
    j = src.index(end_marker, i)
    return src[i:j]


PROLOGUE = '''local function New(cls, props, parent)
    local obj = Instance.new(cls)
    for k, v in pairs(props or {}) do obj[k] = v end
    if parent then obj.Parent = parent end
    return obj
end
local C = {GREEN = {}, GRAY = {}, BLUE = {}, PURPLE = {}}
local S = {embedEnabled = true, embeds = {}, embedGuessNew = false}
local gui = HUBGUI   -- ScreenGui của hub, để test `scr == gui`
'''

block = to_lua5(cut("local GAME_OWNED_GUI_NAMES = {", "local function RunFeatureScript"))
open(os.path.join(BUILD, "embed_block.lua"), "w", encoding="utf-8").write(
    PROLOGUE + block + "\nreturn S, ScanNewGuis, ForceStretchToParent\n")

# wrapper sinh ra từ nút "Lấy Code Kích Thước"
i = src.index('local wrappedCode = [[')
mid = src.index("]] .. currentCode .. [[", i)
k = src.index("\n]]", mid)
head = src[i + len('local wrappedCode = [[') + 1:mid]
tail = src[mid + len("]] .. currentCode .. [[") + 1:k]
dummy = '\nlocal x = 1\nprint("user code", x)\nfor i = 1, 10 do task.wait(0.1) end\n'
open(os.path.join(BUILD, "wrapper.lua"), "w", encoding="utf-8").write(head + dummy + tail)

print("đã trích: tests/.build/embed_block.lua + wrapper.lua")

# 3) S.SanitizeCode — trích nguyên hàm (kèm 2 marker) để test migration
m = re.search(r"S\.WRAP_MARK_OLD = .*\nS\.WRAP_MARK_NEW = .*\nfunction S\.SanitizeCode\(c\)\n(.*?)\nend", src, re.S)
if not m:
    print("CẢNH BÁO: không tìm thấy S.SanitizeCode để test", file=sys.stderr)
    sys.exit(0)
open(os.path.join(BUILD, "sanitize_body.lua"), "w", encoding="utf-8").write(m.group(0) + "\n")
print("đã trích: tests/.build/sanitize_body.lua")
