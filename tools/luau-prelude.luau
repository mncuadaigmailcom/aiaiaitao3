--[[
	tools/luau-prelude.luau
	Polyfill để mã nguồn Luau chạy được trên Lua 5.3 (fengari) khi kiểm thử.
	Trong Roblox Luau, các hàm này ĐÃ CÓ SẴN nên tệp này không bao giờ
	được nạp ở runtime thật — nó chỉ là cầu nối cho harness.

	Harness nạp tệp này TRƯỚC khi nạp dist bundle.
]]

if table.clear == nil then
	function table.clear(t)
		for k in pairs(t) do
			t[k] = nil
		end
	end
end

if table.create == nil then
	function table.create(count, value)
		local t = {}
		if value ~= nil then
			for i = 1, count do
				t[i] = value
			end
		end
		return t
	end
end

if table.find == nil then
	function table.find(haystack, needle, init)
		for i = init or 1, #haystack do
			if haystack[i] == needle then
				return i
			end
		end
		return nil
	end
end

if table.unpack == nil then
	table.unpack = unpack
end

if math.clamp == nil then
	function math.clamp(value, min, max)
		if value < min then return min end
		if value > max then return max end
		return value
	end
end

-- Luau cho phép `continue`; harness không chạy mã có `continue`
-- (đã kiểm bằng grep trong tools/syntax-check). Ở đây chỉ ghi chú.
return true
