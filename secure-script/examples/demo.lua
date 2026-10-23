-- Script Lua mẫu (Roblox/Luau hoặc Lua 5.3)
local function tinhTong(a, b)
    return a + b
end

local ketQua = 0
for i = 1, 10 do
    ketQua = tinhTong(ketQua, i)
end

print("Tổng 1..10 =", ketQua)
