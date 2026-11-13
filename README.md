# Crossroads — Web Edition

This independent browser adaptation uses the archived Roblox Crossroads map. Classic Mode has six selectable tools, solo AI rivals, destructible bricks, and jumping. Arcade Mode keeps automatic firing. Both modes have four arena missions, medals, and local checkpoints.

Open `index.html` or `standalone.html` in a WebGL browser. Drag to move and tap the world to aim and use your tool in Classic. Use the arrow button to jump. Keyboard controls are WASD or arrows, 1–6 for tools, and Space to jump. Arcade supports tap to move. The intro and outro can be skipped.

## Original place and license

`roblox/Crossroads.rbxl` is the unmodified place archived at [Roblox/Old-Open-Source-Levels](https://github.com/Roblox/Old-Open-Source-Levels/blob/ab6927b221ab4a91a5664f69b5be64b98e782e75/ROBLOX/Miscellaneous/Crossroads.rbxl). The archive's MIT notice is in `roblox/LICENSE.txt`. The 1,760 exported parts include the original landmarks, overhead ramp, teleporter structures and armor stand. The export reads supported shapes, part transforms, brick colors and collision flags. The web edition has recreated tool models and effects, solo AI and local matches. External teleports and Roblox services require the Roblox edition.

Open `roblox/Crossroads-Studio.rbxl` to edit the copy saved by Roblox Studio. The map was verified by reopening the saved file. Studio could not load some legacy LinkedSource weapon scripts, so those tools may not work in local play and the migration prompt may reappear on open. Choose Cancel to continue editing the map if prompted.

The browser controller, AI, models, audio synthesis and interface are independent implementations. Three.js is distributed under its included MIT license.

## Build

Run `python build.py` to export the map, bundle both self-contained HTML entries and generate the two ZIP files. `CROSSROADS-GAMEWAVE.zip` is the compact GameWave import package. `CROSSROADS-WEB.zip` adds the source and Studio archives. Run `node --test tests.mjs` for controller and SDK mock checks.
