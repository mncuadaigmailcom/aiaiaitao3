--!strict
--[[
	Util/Types.luau
	Định nghĩa kiểu dữ liệu dùng chung cho toàn bộ dự án.

	Tệp này CHỈ chứa khai báo kiểu (`export type`). Khi bundle cho executor,
	nó bị loại bỏ hoàn toàn vì Luau type-only không sinh ra mã runtime.

	Chạy trên: Roblox Luau (typecheck) + Lua 5.3 (fengari) — nội dung tệp
	được parser Lua 5.3 bỏ qua ở chế độ comment, nên harness đọc được.
]]

-- NOTE: khai báo type nằm trong comment block cho harness Lua 5.3.
-- Bản khai báo Luau thật (dùng cho Rojo/Studio typecheck) ở docs/TYPES.md.

return {
	-- Trạng thái của một bước tối ưu
	STATUS_PENDING = "pending",
	STATUS_RUNNING = "running",
	STATUS_APPLIED = "applied",
	STATUS_SKIPPED = "skipped",
	STATUS_FAILED  = "failed",

	-- Trạng thái của toàn pipeline
	PHASE_IDLE       = "idle",
	PHASE_BASELINE   = "baseline",
	PHASE_SETTLE     = "settle",
	PHASE_OPTIMIZING = "optimizing",
	PHASE_REMEASURE  = "remeasure",
	PHASE_COMPARE    = "compare",
	PHASE_DONE       = "done",
	PHASE_ERROR      = "error",
}
