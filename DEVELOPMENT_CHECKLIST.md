# Survival development checklist

Branch: `feature/walkable-mines`. A checkbox is checked only when the functionality is implemented AND verified (TypeScript build + gameplay check where applicable). Existing prototypes are not accepted as finished features.

## 1. Foundation
- [x] First-person camera implementation (visually confirmed by player)
- [x] Automatic GLB registry generation (verified from user's dev log)
- [x] Mine GLB bounding-box debug (F8, code committed; browser validation pending)
- [ ] Repository architecture audit and inventory of implemented mechanics
- [ ] Model registry/placement: pivot, orientation, dimensions, terrain alignment
- [ ] GLB asset inspection: real meshes, openings, dimensions, local axes
- [ ] Robust static and dynamic collision system with debug display
- [ ] Prevent walking through trees, rocks, walls, and structures
- [ ] Mine entrance matched to actual mesh and terrain
- [ ] Walkable decline, tunnels, junction and corner aligned to meshes
- [ ] Mine route validated end-to-end, including entrance and exit
- [ ] Automated geometry and movement tests; clean TypeScript build

## 2. World
- [ ] Seeded island terrain and coherent biomes (beach, forest, meadow, mountain)
- [ ] Rivers, lakes, sea, roads and appropriate placement of vegetation
- [ ] Geological rock and ore deposits; building sites
- [ ] World chunk streaming and unloading

## 3. Mines and POI
- [ ] Underground rooms, branching paths, support beams, rails, minecarts
- [ ] Mine ore, hazards, lighting, loot and surface exit
- [ ] Gas station, supermarket, warehouse, factory
- [ ] Military base, radio tower, harbor, village
- [ ] Power plant, mine complex, bunker, laboratory
- [ ] Accessible interiors, doors, collision, loot tables and containers

## 4. Survival and building
- [ ] Trees and ores: tools, hits, damage stages, animations, depletion, respawn
- [ ] Inventory: stacks, drag/drop, pickup, equipment, splitting, dropping
- [ ] Crafting: tools, clothes, furnace, workbench, storage, weapons
- [ ] Building: foundations, walls, doors, floors, stairs, roofs and structural checks
- [ ] Health, hunger, thirst, stamina, temperature, fall damage, swimming
- [ ] Death, respawn, loot drops, food, water and healing
- [ ] Day/night cycle verified

## 5. NPC and persistence
- [ ] NPC patrol, perception, pursuit, combat, damage, death and loot
- [ ] NPC navigation around real obstacles
- [ ] Dangerous areas and progression
- [ ] Versioned persistence of player, inventory, world resources, buildings and loot

## 6. Graphics, mobile and QA
- [ ] PBR assets, shadows, lighting, fog, sky, weather, realistic water
- [ ] LOD0/1/2, frustum culling, instancing, adaptive graphics
- [ ] Chunk load/unload, memory and draw-call profiling
- [ ] Mobile controls and real iOS/Android device testing
- [ ] Critical-system automated tests
- [ ] End-to-end survival loop from spawn to saved base
- [ ] Measured mobile FPS and optimization report

## Execution log
- First-person camera: existing commits `24d3b3b`, `c283b16`; user confirmed visibility during descent.
- GLB discovery: user confirmed generated registry contains all five mine models.
- Mine bounds debug: `dce4fd5`; requires runtime validation.
- Mine aisle constraints: `99b5340`, `f231f1d`; requires build and runtime validation.
- Earlier mine screenshots showed procedural portal and terrain intersections; full GLB alignment NOT verified.
