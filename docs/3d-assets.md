# High-fidelity 3D asset pipeline

The game supports local **glTF 2.0 / GLB** assets via `src/graphics/AssetLibrary.ts`.
Procedural geometry remains the fallback; the repository does **not** yet
contain photogrammetry scans, professionally rigged characters, or licensed
PBR asset packs.

## Expected asset layout

```text
public/
  assets/
    models/
      pine.glb
      spruce.glb
      oak.glb
      boulder.glb
      log.glb
      axe.glb
      pickaxe.glb
      survivor.glb
    textures/
      terrain/
      foliage/
      rock/
```

## Authoring specification

- **Coordinates:** metres, Y up; forward direction negative Z.
- **glTF:** export glTF 2.0 binary (.glb), embedded materials/textures.
- **Textures:** baseColor, normal, metallicRoughness and AO where applicable.
  Use KTX2/Basis compression when adding a decoder/transcoder.
- **LOD:** 3 versions for trees and rocks; impostors for very distant scenery.
  Current procedural instancing is retained until a real LOD manager exists.
- **Tree scale:** approximately 5–10 m tall, roots at origin.
- **Character:** approximately 1.8–2 m tall, humanoid skeleton and
  idle/walk/run/attack animations; animation retargeting is not yet implemented.
- **Mobile:** budget 1–2K triangles for small distant objects and 1K–2K
  texture maps on close hero objects; profile on actual devices.
- **Licensing:** import only assets with a licence that permits distribution
  in the game; retain attribution where required.

## Integration

`AssetLibrary.instantiate(kind)` returns a clone of the model or `null`
when unavailable. Do not remove the procedural fallback until the corresponding
asset and animation integration are complete. Currently this is an **asset
loading API**, not automatic replacement of all game objects.

## Performance validation

Use `npm run build` and browser performance tools. Track frame time, GPU
memory, draw calls and shadow passes. A passing TypeScript build does not
prove visual fidelity or mobile frame rate.
