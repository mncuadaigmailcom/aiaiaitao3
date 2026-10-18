--[[
	Util/Hsv.luau
	Chuyển HSV -> RGB (mọi giá trị 0..1). Dùng để tạo dải màu cầu vồng
	cho UIGradient của menu, và được UNIT TEST kiểm chứng bằng các mốc
	màu đã biết (đỏ / lục / lam / vàng / tím).

	Thuần logic, không phụ thuộc API Roblox -> chạy được trên Lua 5.3 (fengari).
]]

local Hsv = {}

local function clamp01(x: number): number
	if x ~= x then return 0 end            -- NaN
	if x < 0 then return 0 end
	if x > 1 then return 1 end
	return x
end

--[[
	h: hue 0..1 (0 và 1 đều là đỏ)
	s: saturation 0..1
	v: value 0..1
	trả về r, g, b mỗi giá trị 0..1
]]
function Hsv.ToRgb(h: number, s: number, v: number): (number, number, number)
	h = clamp01(h) % 1
	s = clamp01(s)
	v = clamp01(v)

	if s <= 0 then
		return v, v, v
	end

	local i = math.floor(h * 6)
	local f = (h * 6) - i
	local p = v * (1 - s)
	local q = v * (1 - s * f)
	local t = v * (1 - s * (1 - f))

	local mod = i % 6
	if mod == 0 then
		return v, t, p
	elseif mod == 1 then
		return q, v, p
	elseif mod == 2 then
		return p, v, t
	elseif mod == 3 then
		return p, q, v
	elseif mod == 4 then
		return t, p, v
	else
		return v, p, q
	end
end

-- Bảng 8 mốc cầu vồng dùng cho UIGradient (đỏ -> cam -> vàng -> lục -> lam -> chàm -> tím -> đỏ)
function Hsv.RainbowStops(count: number): { number }
	local out = {}
	local n = math.max(2, math.floor(count or 8))
	for i = 0, n - 1 do
		-- Bao gồm cả 1 để màu cuối khép vòng về đỏ như màu đầu.
		out[#out + 1] = i / (n - 1)
	end
	return out
end

return Hsv
