# ISLAND Survival v0.3

## Run
Requires Node.js >= 20.19 or >= 22.12.

```bash
npm install
npm run build
npm run dev
```

Open the URL printed by Vite.

## Controls
WASD movement, Shift sprint, mouse look, left click harvest, 1 axe, 2 pickaxe, I inventory, B build menu, E place, Esc unlock cursor.

## Structure
- `src/game/Game.ts` game loop and gameplay integration
- `src/world/Environment.ts` island, beach, sea, instanced grass and pebbles
- `src/items/Tools.ts` procedural tool models
- `src/building/Placement.ts` placement snapping, wall anchors and ghost preview
- `src/ui/style.css` HUD and full-screen backpack

## Limitations
This is a procedural WebGL prototype, not photorealistic production art. Realistic rigged character animations, PBR scanned terrain, high-resolution assets, realistic fracture physics and mobile controls require dedicated art/animation assets and further work. Tree falls and rock breaks are approximated. Saves use the same localStorage key as v0.2.
