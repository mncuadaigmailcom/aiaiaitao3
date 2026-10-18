--[[ ===== RALO.METHODS:BEGIN =====
	Các phương pháp được TRIỂN KHAI TRONG TỆP NÀY (khớp với Shared/Methods.luau):
	  START-001, START-003, START-004 
	===== RALO.METHODS:END ===== --]]

--[[
	Client/Bootstrap.luau
	===== RALO.METHODS:START-001, START-003, START-004 =====

	ĐIỂM KHỞI ĐỘNG DUY NHẤT của hệ thống.

	MÔI TRƯỜNG ĐÍCH: Roblox Studio, game do chính bạn sở hữu.
	Không dùng executor, không loadstring, không setrbxsetting.

	CÁCH CHẠY (xem docs/03-huong-dan-cai-dat.md để có hướng dẫn đầy đủ):

	A) Rojo — cách khuyến nghị, giữ nguyên cấu trúc thư mục:
	   default.project.json đã map:
	     src/Shared -> ReplicatedStorage.RALO.Shared
	     src/Client -> StarterPlayer.StarterPlayerScripts.RALO
	   Sau đó tạo một LocalScript trong StarterPlayerScripts:
	     require(script.Parent.RALO.Bootstrap).Start()

	B) Bundle một tệp — dán dist/roblox-anti-lag-optimizer.luau vào một
	   LocalScript. Bundle tự cài __RALO_REQUIRE nên không cần Rojo.

	LocalScript sẽ TỰ CHẠY khi được nạp. Nếu bạn muốn tự gọi Start() với
	cấu hình riêng, đặt  _G._RALO_NO_AUTORUN = true  TRƯỚC khi script chạy
	(hoặc đặt Bootstrap.__noAutoRun = true trong bundle).

	GIỚI HẠN THẬT CỦA MỘT LocalScript (Part 2) — nêu rõ để không hứa hão:
	  * không điều khiển được server, không đổi được replicated state
	  * không đổi được thiết bị (CPU/GPU) hay bộ nhớ của hệ điều hành
	  * không đổi được thiết lập client của Roblox (FrameRateMax, ...)
	  * chỉ ảnh hưởng phiên chơi của CHÍNH người chơi đang chạy script
]]

local Client_Env = __RALO_REQUIRE("Client/Core/Env")
local Client_Guard = __RALO_REQUIRE("Client/Core/Guard")
local Client_Pipeline = __RALO_REQUIRE("Client/Core/Pipeline")
local Client_Scheduler = __RALO_REQUIRE("Client/Core/Scheduler")
local Client_Registry = __RALO_REQUIRE("Client/Core/Registry")
local Shared_Config = __RALO_REQUIRE("Shared/Config")
local Shared_Log = __RALO_REQUIRE("Shared/Log")
local Shared_Safe = __RALO_REQUIRE("Shared/Safe")

local SCOPE = "Bootstrap"

local Bootstrap = {}

Bootstrap.started = false
Bootstrap.result = nil

-- Gán sink log để mọi thao tác property đều có dấu vết trong Log.
Shared_Safe.Sink = function(level, scope, message)
	if level == "warn" then
		Shared_Log.Warn(scope, message)
	else
		Shared_Log.Debug(scope, message)
	end
end

--[[
	options = {
		profile = { ... }   -- ghi đè Shared_Config.PROFILE, ví dụ:
		                    -- { gui = { durationSeconds = 60 }, graphics = { qualityLevel = 6 } }
		buildUi = true      -- mặc định true
		instant = false     -- true = bỏ qua lấy mẫu khung hình (nhanh, kém chính xác)
		restoreFirst = false-- true = hoàn tác thay đổi của lần chạy trước rồi mới chạy
	}

	Trả về: result (bảng), error (chuỗi hoặc nil)
	KHÔNG throw.
]]
function Bootstrap.Start(options)
	options = options or {}

	if Bootstrap.started and not options.force then
		Shared_Log.Warn(SCOPE, "đã chạy rồi — bỏ qua. Truyền force = true nếu muốn chạy lại.")
		return Bootstrap.result, nil
	end
	Bootstrap.started = true

	if options.profile then
		Shared_Config.Apply(options.profile)
	end

	-- Chuẩn hoá cấu hình: sai kiểu thì dùng mặc định + cảnh báo (REC-004)
	local normalized, warnings = Client_Guard.NormalizeConfig(Shared_Config.PROFILE, Shared_Config.PROFILE)
	for _, warning in ipairs(warnings) do
		Shared_Log.Warn(SCOPE, warning)
	end

	Client_Env.Init({})

	Shared_Log.Info(SCOPE, ("%s v%s — bắt đầu (chế độ: %s)")
		:format(Shared_Config.NAME, Shared_Config.VERSION, Shared_Config.Mode()))

	if options.restoreFirst then
		local restored, failed = Client_Pipeline.Restore()
		Shared_Log.Info(SCOPE, ("hoàn tác lần chạy trước: %d property (lỗi %d)"):format(restored, failed))
	end

	-- Scheduler tự khởi động khi tác vụ thật sự được đăng ký; không giữ
	-- Heartbeat rỗng trong trường hợp không có GUI/GC nền.
	local ok, result = Client_Guard.Run(SCOPE .. ":Pipeline", function()
		return Client_Pipeline.Run({
			profile = normalized,
			buildUi = options.buildUi,
			instant = options.instant,
		})
	end)

	if not ok then
		Shared_Log.Error(SCOPE, "pipeline lỗi: " .. tostring(result))
		return nil, tostring(result)
	end

	Bootstrap.result = result
	Shared_Log.Info(SCOPE, ("xong. phán quyết: %s, %d thay đổi, %d mục có thể hoàn tác")
		:format(tostring(result.verdict), result.tally and result.tally.changes or 0,
			result.restoreEntries or 0))
	return result, nil
end

-- Hoàn tác mọi thay đổi mà hệ thống đã thực hiện.
function Bootstrap.Restore()
	return Client_Pipeline.Restore()
end

--[[
	Tắt hẳn hệ thống: ngắt kết nối, huỷ GUI, dừng bộ lập lịch.
	Dùng khi bạn muốn gỡ hoàn toàn mà không cần chạy lại game.
]]
function Bootstrap.Shutdown()
	Client_Pipeline.Shutdown()
	Client_Scheduler.Shutdown()
	local disconnected, released = Client_Registry.Shutdown()
	Bootstrap.started = false
	Shared_Log.Info(SCOPE, ("đã tắt: ngắt %d connection, huỷ %d instance"):format(disconnected, released))
	return true
end

-- Trạng thái hiện tại — dùng cho test và chẩn đoán.
function Bootstrap.State()
	return {
		started = Bootstrap.started,
		hasResult = Bootstrap.result ~= nil,
		-- `and` đã trả về nil khi result = nil; không cần `or nil`
		verdict = Bootstrap.result and Bootstrap.result.verdict,
		scheduler = Client_Scheduler.Stats(),
		registry = Client_Registry.Stats(),
	}
end

--[[
	TỰ CHẠY khi LocalScript được nạp.
	Đặt _G._RALO_NO_AUTORUN = true trước đó nếu bạn muốn tự gọi Start().
]]
local globalEnv = Client_Env.GlobalEnv()

if not Bootstrap.__noAutoRun and not globalEnv._RALO_NO_AUTORUN then
	-- task.spawn để không chặn luồng nạp script; task có thể không có trong harness
	if task ~= nil and task.spawn ~= nil then
		task.spawn(function()
			Bootstrap.Start()
		end)
	else
		Bootstrap.Start()
	end
end

return Bootstrap
