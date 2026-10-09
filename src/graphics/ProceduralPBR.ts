import * as THREE from 'three';

export type Surface = 'bark' | 'stone' | 'metal' | 'wood' | 'fabric' | 'leather';
const colors: Record<Surface, [number, number, number, number, number, number]> = {
  bark: [43, 32, 25, 113, 82, 57],
  stone: [75, 81, 79, 169, 174, 161],
  metal: [75, 91, 102, 187, 198, 201],
  wood: [78, 48, 31, 173, 120, 73],
  fabric: [42, 54, 44, 89, 112, 91],
  leather: [52, 37, 27, 122, 83, 53],
};
const cache = new Map<Surface, THREE.MeshStandardMaterial>();
export function surfaceMaterial(surface: Surface) {
  const existing = cache.get(surface);
  if (existing) return existing;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d')!;
  const data = context.createImageData(size, size);
  const palette = colors[surface];
  let seed = 1009 + Object.keys(colors).indexOf(surface) * 239;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const stripes = surface === 'bark' || surface === 'wood'
      ? Math.sin(x * .16 + Math.sin(y * .04) * 2) * .18 : 0;
    const grain = Math.sin(x * .43 + y * .11) * .07;
    const value = THREE.MathUtils.clamp(.42 + random() * .28 + stripes + grain, 0, 1);
    const offset = (y * size + x) * 4;
    for (let c = 0; c < 3; c++)
      data.data[offset + c] = palette[c] * (1 - value) + palette[c + 3] * value;
    data.data[offset + 3] = 255;
  }
  context.putImageData(data, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({
    map, bumpMap: map, bumpScale: surface === 'bark' ? .035 : .012,
    roughness: surface === 'metal' ? .36 : .91,
    metalness: surface === 'metal' ? .76 : 0,
  });
  cache.set(surface, material);
  return material;
}
