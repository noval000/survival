# Real 3D models

The game now supports replacing procedural trees and boulders with real GLB
meshes. These files are not included yet: adding an empty manifest will NOT
make the game photorealistic.

1. Obtain properly licensed, game-ready glTF 2.0 models (for example, CC0
   assets from Poly Haven or another verified asset library).
2. Place `pine.glb` and `boulder.glb` in this directory.
3. Create `manifest.json` alongside them:

```json
{
  "pine": { "scale": 1, "yOffset": 0 },
  "boulder": { "scale": 1, "yOffset": 0 }
}
```

4. Run `npm run dev`. The loader automatically replaces the harvestable
   tree/rock visuals while retaining the harvesting interaction roots.
   Omit entries for missing files; the game uses procedural fallback meshes.

**Important:** glTF scale must be verified visually. `scale` controls
the model's native units, not automatic size normalization. High-resolution
textures alone do not turn a low-poly model into a realistic one. For
production, source professionally authored/scanned geometry, PBR normal
and roughness maps, and several LODs. Do not download arbitrary copyrighted
models into this repository.
