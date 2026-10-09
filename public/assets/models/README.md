# Real 3D models

The world supports optional GLB replacements for harvestable trees and rocks.
The first Meshy pine is stored at `trees/pine_01.glb` using Git LFS.

## Active assets

- `trees/pine_01.glb`: Meshy pine, enabled by `manifest.json`.
- Other asset kinds continue to use procedural fallback until their models and manifest entries are added.

The manifest entry `"pine": {}` enables automatic height normalization to
approximately 6.5 game units. An optional `scale` overrides that normalization;
`yOffset` adjusts the base position.

Run `npm run dev` to view the pine. Harvesting interactions are retained on the
existing resource root. ResourceLOD uses a simple distant proxy beyond 22 units.

**Performance warning:** The original Meshy pine is about 300 MiB. This is a
temporary integration asset, not production-ready. Before shipping, reduce
triangle count, texture sizes and file weight; inspect foliage transparency,
shadows and frame rate in a browser. Git LFS stores the large source file but
does not make runtime downloads smaller. CI/build environments must fetch Git
LFS objects or the deployed GLB will be an LFS pointer rather than a model.
