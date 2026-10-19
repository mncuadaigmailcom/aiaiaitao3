return {
	-- Exact Roblox Instance.Name comparison after removing spaces/punctuation/case.
	-- This is a generic Workspace scan, not a verified map of DOORS internals.
	scanBatchSize = 180,
	maxTrackedMatchesPerName = 32,
	maxDistance = 10000,
	-- Put game-owner-approved internal Instance.Name aliases here, keyed by display name.
	-- Example: aliases = { Rush = {"RushMoving", "Rush"} }.
	aliases = {},
}
