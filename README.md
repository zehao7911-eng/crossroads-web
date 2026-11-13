# Crossroads — Web Edition

This independent browser adaptation loads real map geometry from the archived Roblox Crossroads place. Four arena missions use solo AI rivals, automatic blasts, destructible bricks, medals and local checkpoints.

Open `index.html` or `standalone.html` in a WebGL browser. On a phone, drag to run or tap the ground. On a keyboard, use WASD or arrows. Firing is automatic when a rival is nearby. The intro and outro can be skipped.

## Original place and license

`roblox/Crossroads.rbxl` is the unmodified place archived at [Roblox/Old-Open-Source-Levels](https://github.com/Roblox/Old-Open-Source-Levels/blob/ab6927b221ab4a91a5664f69b5be64b98e782e75/ROBLOX/Miscellaneous/Crossroads.rbxl). The archive's MIT notice is in `roblox/LICENSE.txt`. The 1,676 exported parts come from the main map, including four landmarks and the overhead ramp. The export includes supported shapes, part transforms, brick colors and collision flags. External Roblox assets, Lua execution, teleporters, multiplayer services and original weapons are outside the browser port. The original file retains the archived content for Roblox Studio.

The browser controller, AI, models, audio synthesis and interface are independent implementations. Three.js is distributed under its included MIT license.

## Build

Run `python build.py` to export the map, bundle both self-contained HTML entries and create the root-index ZIP. Run `node --test tests.mjs` for controller and SDK mock checks. The GameWave adapter is optional and stores a namespaced game profile.
