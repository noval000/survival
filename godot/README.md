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
