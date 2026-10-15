import { readdir, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
const root = 'public/assets/models';
const registry = {};
async function scan(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) { await scan(path); continue; }
    const match = entry.name.match(/^(.+)_lod([012])\.glb$/);
    if (!match) continue;
    const name = match[1];
    registry[name] ??= [];
    registry[name][Number(match[2])] = '/assets/models/' + relative(root, path).split(sep).join('/');
  }
}
await scan(root);
for (const name of Object.keys(registry)) {
  if (!registry[name][0]) delete registry[name];
}
await writeFile(join(root, 'world-registry.json'), JSON.stringify(registry, null, 2) + '\n');
console.log('GLB models:', Object.keys(registry).join(', '));
