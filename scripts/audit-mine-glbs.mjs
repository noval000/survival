// Run: node scripts/audit-mine-glbs.mjs
// Reads glTF JSON chunks directly from binary GLBs; no rendering dependencies.
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const names = ['mine_entrance_01', 'mine_decline_01', 'mine_tunnel_01',
  'mine_junction_01', 'mine_corner_01'];
let failed = false;
for (const name of names) {
  const path = resolve('public/assets/models/mines', name + '_lod0.glb');
  if (!existsSync(path)) {
    console.error('MISSING', path);
    failed = true;
    continue;
  }
  try {
    const data = readFileSync(path);
    if (data.toString('ascii', 0, 4) !== 'glTF' || data.readUInt32LE(4) !== 2) {
      throw Error('Not a glTF 2.0 binary');
    }
    if (data.readUInt32LE(8) !== data.length) throw Error('Invalid GLB length');
    if (data.readUInt32LE(16) !== 0x4e4f534a) throw Error('Missing JSON chunk');
    const jsonLength = data.readUInt32LE(12);
    const gltf = JSON.parse(data.subarray(20, 20 + jsonLength).toString('utf8'));
    const primitives = (gltf.meshes ?? []).flatMap(mesh => mesh.primitives ?? []);
    const accessors = primitives.map(p => gltf.accessors?.[p.attributes?.POSITION])
      .filter(Boolean);
    const bounds = accessors.filter(a => a.min && a.max).reduce((b, a) => {
      for (let axis = 0; axis < 3; axis++) {
        b.min[axis] = Math.min(b.min[axis], a.min[axis]);
        b.max[axis] = Math.max(b.max[axis], a.max[axis]);
      }
      return b;
    }, { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] });
    const localBounds = Number.isFinite(bounds.min[0])
      ? bounds.max.map((n, i) => +(n - bounds.min[i]).toFixed(3))
      : null;
    console.log(JSON.stringify({ name, bytes: data.length, nodes: gltf.nodes?.length ?? 0,
      meshes: gltf.meshes?.length ?? 0, primitives: primitives.length,
      localAccessorSize: localBounds, note: 'Accessor bounds do not include node transforms.' }));
    if (!primitives.length) failed = true;
  } catch (error) {
    failed = true;
    console.error(name, error);
  }
}
if (failed) process.exitCode = 1;
