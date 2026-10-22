# Island Survival — Godot MVP

This is the **new Godot 4 project**, isolated from the old Vite/Three.js prototype in the repository root.

## Start

1. Install Godot 4.x (4.3 or later).
2. Open Godot Project Manager → Import → select `godot/project.godot`.
3. Press F6 on `scenes/Main.tscn` or F5 to run.
4. WASD to move, Shift to sprint, Space to jump, mouse to look, Esc to release mouse.

## Current milestone

**Foundation only**: first-person physics controller, basic collision floor, camera, lighting, and project boot scene. It is **not yet** a visually finished island or an MVP.

## Asset migration

Existing Meshy GLBs live in `../public/assets/models`. Import selected GLBs into `godot/assets/` only after checking geometry, orientation, and license. For walkable mine pieces, define entrance/exit markers and collision separately; do not use bounding boxes as solid tunnel blockers.

## Two-week vertical slice scope

One polished island zone; one fully traversable mine; wood/stone/coal/iron gathering; inventory; basic crafting; buildable shelter; save/load; audio/animations; performance pass. Mobile native exports are a later validation gate and require device testing.

## Import Meshy GLBs safely

1. **Close Godot first.** Do not copy all 20 MB GLBs at once if the editor has crashed during import.
2. Copy only `public/assets/models/trees/pine_01_lod0.glb` to `godot/assets/models/trees/pine_01_lod0.glb`.
3. Open Godot, wait for the Import task to finish, and run the scene. If stable, add `spruce_01_lod0.glb` similarly.
4. The world automatically scales imported trees to about 5.5–8.5 metres, adjusts their ground pivot and gives trunks a simple physics collider. Missing assets use procedural fallback trees.
5. For mountains the configured path is `godot/assets/models/rocks/rocky_mountain_01.glb`. Add this only after trees import reliably.
6. If the editor crashes during import, move the new GLB out of `godot/` with Godot closed and retry. For production, reduce source texture resolution and triangle count before reimporting. **LOD0 (200k triangles) is not a suitable repeated mobile tree asset**; use optimized LOD1/LOD2 after validating appearance.
