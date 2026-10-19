# Doors Entity Locator (Roblox Studio)

`src/Client/DoorsLocator.luau` is an opt-in visual locator for a **Doors-like experience you own**. It draws an occluded `Highlight` and a name label for matching instances in the client-visible Workspace. It is not an executor/cheat script and does not access other players' private data, bypass anti-cheat, or find objects that have not replicated/streamed in.

## Use with Rojo

The project maps `src/Client` into `StarterPlayerScripts.RALO`. From a Studio LocalScript in that folder, require the module and choose one section:

```lua
local Locator = require(script.Parent.RALO.DoorsLocator)
local stop = Locator.Start(workspace, "The Hotel")
-- To switch section or turn it off later:
-- stop()
-- stop = Locator.Start(workspace, "The Mines")
```

Supported sections are `The Hotel`, `The Mines`, `The Backdoor`, `The Archives`, `The Outdoors`, `The Stairwell`, `The Rooms`, and `Special & Events`. The GUI has a name search and an entity picker: click a listed name to toggle that name on/off, and choose multiple names. Matching uses exact instance names (case-insensitive); models and parts are supported, and named folders can be marked when they contain a model/part. If the game uses different internal names, add those names to the catalog in `DoorsLocator.luau`. Customize color and label distance with the third argument, e.g. `{ color = Color3.fromRGB(80, 200, 255), maxDistance = 200 }`.

The module does not start itself. Call the returned stop function to disconnect the live-added-instance listener and remove all locator visuals. Use this only in Studio or your own Roblox experience, and ensure your game's policies permit diagnostic overlays.
