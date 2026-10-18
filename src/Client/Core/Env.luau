--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  CPU-002 
	===== RALO.METHODS:END ===== --]]

--[[
	Core/Env.luau
	Lớp thích ứng runtime. Toàn bộ dự án KHÔNG gọi thẳng `game`, `Instance`,
	`task`, `os.clock` mà luôn đi qua Env. Nhờ vậy:

	  * Trong Roblox: Env trỏ tới API Luau thật.
	  * Trong harness (fengari + mock): Env trỏ tới mock Roblox.
	  * Trong test: Env.now() và Env.task.delay là thời gian ẢO -> test
	    được logic auto-hide 30 giây mà không phải chờ 30 giây thật.

	Env KHÔNG giả lập bất kỳ kết quả hiệu năng nào. Nó chỉ cung cấp
	"đồng hồ" và "cổng vào thế giới game". Số đo luôn đến từ thế giới thật
	(roblox) hoặc từ mô hình thế giới khai báo rõ ràng (harness).
]]

local Env = {}

Env.mode = "unknown"        -- "roblox" | "harness"
Env.game = nil              -- DataModel (hoặc mock)
Env.Root = nil              -- nơi chứa source tree (dùng cho __require gốc)

-- Đồng hồ: hàm trả về giây (float). Mặc định là os.clock() — có thật trong Luau.
Env.now = os.clock

-- Bộ lập lịch: mặc định là `task` thật của Luau.
Env.task = task

--[[
	Khởi động: tự nhận diện runtime.
	options = { game = <DataModel>, task = <bảng giống task>, now = <hàm>, mode = "roblox"|"harness" }
]]
function Env.Init(options)
	options = options or {}

	Env.mode = options.mode
	if Env.mode == nil then
		-- Tự nhận diện: có DataModel + RunService thật thì là Roblox.
		local ok, runService = pcall(function()
			return game:GetService("RunService")
		end)
		Env.mode = (ok and runService ~= nil) and "roblox" or "unknown"
	end

	Env.game = options.game
	if Env.game == nil then
		local ok, g = pcall(function() return game end)
		if ok then Env.game = g end
	end

	if options.now then Env.now = options.now end
	if options.task then Env.task = options.task end

	return Env.mode, Env.game ~= nil
end

--[[
	Trả về bảng toàn cục của runtime hiện tại.

	Dự án chạy trong Roblox Studio bình thường (không executor), nên đây
	chỉ là `_G`. Tách ra thành hàm để RequireShim có một chỗ duy nhất cần
	thay đổi nếu môi trường nạp bundle khác đi.
]]
function Env.GlobalEnv(): any
	return _G
end

-- Đặt biến toàn cục (RequireShim dùng để cài __RALO_REQUIRE khi nạp bundle).
function Env.SetGlobal(name: string, value: any)
	local g = Env.GlobalEnv()
	g[name] = value
end

function Env.GetService(name: string): any
	if Env.game == nil then return nil end
	local ok, service = pcall(function()
		return Env.game:GetService(name)
	end)
	if ok then return service end
	return nil
end

-- Chờ n giây theo đồng hồ của runtime (task.wait thật trong Roblox).
function Env.Wait(seconds: number)
	if Env.task and Env.task.wait then
		return Env.task.wait(seconds)
	end
	-- Fallback (không bao giờ xảy ra trong Roblox): xoay vòng theo os.clock
	local target = Env.now() + seconds
	while Env.now() < target do end
end

-- Trì hoãn có thể huỷ; trả về handle { cancel = function() end }
function Env.Delay(seconds: number, callback: () -> ())
	if Env.task and Env.task.delay then
		local thread = Env.task.delay(seconds, callback)
		return {
			cancel = function()
				if Env.task.cancel and thread then
					pcall(Env.task.cancel, thread)
				end
			end,
			thread = thread,
		}
	end
	return { cancel = function() end }
end

return Env
