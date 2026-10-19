# DOORS ENTITY RADAR

Roblox Luau project for a **developer-owned experience / Studio test place**. It provides a modern catalog UI and an honest, client-side observer for exact configured `Instance.Name` matches under `Workspace`.

## Important scope and verification

- This is **not** an exploit or a script for the public DOORS experience. It uses no executor APIs, remotes, hidden state, through-wall overlay, or anti-cheat bypass.
- The project does **not** claim that the listed names match the current internal names in DOORS. Catalog entries have `verified = false` until you verify them in a place you own. Exact visible `Workspace` name matching is generic, not a validated DOORS integration.
- `Đã phát hiện` means an exact configured name was observed as a replicated Workspace instance and a valid position was read. It does not mean a catalog label was guessed.
- `Không phát hiện` means no exact configured name was found during the completed scan of client-visible Workspace. A different internal name, StreamingEnabled, or server-only object can explain the absence.
- `Không hỗ trợ` means the match has no usable position or the character root/camera needed for derived information is unavailable.
- `Chưa xác minh` means the scan has not completed, the radar is stopped/paused, or the catalog's mapping to the target experience is not verified.
- No coordinate or distance is rendered unless a live matched Instance yields a Roblox `Vector3` position and the local character root exists. Distance is in studs. Bearing is relative to the camera.

## Architecture

`Catalog` owns the eight areas and item classifications. `Config` contains scan limits and optional owner-approved exact internal-name aliases. `Detector` performs one bounded initial scan, listens for additions/removals, tracks only selected names and computes position/distance/bearing from live Instances. `Controller` renders and manages UI controls; it does not query hidden game state. `Bootstrap.client.luau` joins the modules and cleans them up when removed.

## Tree

```text
doors-entity-radar/
├── default.project.json
├── README.md
├── src/
│   ├── Shared/
│   │   ├── Catalog.luau
│   │   └── Config.luau
│   └── Client/
│       ├── Bootstrap.client.luau
│       ├── Controller.luau
│       └── Detector.luau
└── tests/
    └── StudioSmokeTest.client.luau
```

## Install in Roblox Studio using Rojo

1. Use a **test place you own**. Install Rojo and its Studio plugin.
2. From this directory, run `rojo serve default.project.json`, then connect with the Studio plugin.
3. Rojo maps `src/Shared` to `ReplicatedStorage.DoorsEntityRadar.Shared`; `src/Client` maps to `StarterPlayer.StarterPlayerScripts.DoorsEntityRadar`.
4. Press **Play**. The GUI appears and automatically starts scanning all catalog names in the default area, The Hotel. Choose another area to automatically select and scan that area's names. Click rows to include/exclude individual names. `Refresh` scans again; `Pause` stops event tracking; `Resume` rebinds and scans; `Stop` clears live matches. The close button hides the panel without stopping detection; the floating `Radar` button reopens it.
5. Use the Studio **View → Output** window for `[DoorsEntityRadar]` diagnostics.

## Exact name aliases

The default aliases are the display names in the catalog and are deliberately unverified. For your own place, inspect the actual replicated instance names in Explorer and configure them in `src/Shared/Config.luau`:

```lua
aliases = {
    Rush = {"RushMoving", "Rush"},
    ["A-60"] = {"A60"},
}
```

Aliases are exact after lowercasing and removing punctuation/whitespace. Do not add a guessed alias and then describe it as confirmed; verify it against your own place. Duplicate display names can share one alias by name, so avoid selecting duplicate labels across multiple areas in one session unless the actual target is unambiguous.

## Manual Studio smoke test

1. In a **test copy** of the mapped project, disable `Bootstrap.client.luau` temporarily.
2. Add `tests/StudioSmokeTest.client.luau` as a LocalScript next to `Detector` under `StarterPlayerScripts.DoorsEntityRadar`.
3. Press Play and read Output. The test creates one local temporary Part named `RadarSmokeEntity_001`, checks exact-name detection and position reporting, removes it, and checks that stale matches disappear. It destroys only its own test Part.
4. Remove/disable the test LocalScript and re-enable Bootstrap after testing.

This test validates the generic detector in Studio, **not** the DOORS experience's object names or networking. Also manually test search, changing areas, selecting multiple items, Start/Pause/Resume/Refresh/Stop, hiding/reopening, and shutdown. Check that the UI does not alter Lighting, sound, physics, or game scripts.

## Status matrix

| Capability | Implemented | Automated/Studio checked | Limitation |
|---|---|---|---|
| Eight-area searchable catalog and type labels | Yes | Source/syntax checks; Studio UI checklist | Names/types reflect supplied list; not official DOORS schema |
| Exact alias match in client-visible Workspace | Yes | Studio smoke test included, must be run by developer | No hidden/server-only/streamed-out objects |
| Match add/remove updates | Yes | Studio smoke test included | Only for currently replicated descendants |
| Live position, distance and camera-relative direction | Yes | Conditional Studio smoke test | Requires matched position, HumanoidRootPart and CurrentCamera |
| Genuine DOORS entity-name integration | No | Not verified | Must be implemented with owner-approved, verified instance names |
| Events without a position-bearing Instance | Unsupported by this generic observer | Not verified | No fake coordinates; status explains limitation |

## Local repository checks

From the repository root run `npm run check`. It runs the existing repository checks; Luau syntax parsing also includes this subproject. The Studio smoke test is separate and must be run manually in Studio as described above. Passing local tests does not certify the Roblox Studio runtime or the DOORS game.