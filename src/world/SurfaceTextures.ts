import * as THREE from 'three';

type Palette = [number, number, number];

function texture(base: Palette, accent: Palette, seed: number, scale: number) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(size, size);
  let state = seed;
  function random() {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  }
  const coarse = new Float32Array(32 * 32);
  for (let i = 0; i < coarse.length; i++) coarse[i] = random();
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / 8, gy = y / 8;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const tx = gx - ix, ty = gy - iy;
    const smooth = (v: number) => v * v * (3 - 2 * v);
    const a = smooth(tx), b = smooth(ty);
    const sample = (px: number, py: number) => coarse[(py % 32) * 32 + (px % 32)];
    const n = (sample(ix, iy) * (1 - a) + sample((ix + 1) % 32, iy) * a) * (1 - b)
      + (sample(ix, (iy + 1) % 32) * (1 - a)
        + sample((ix + 1) % 32, (iy + 1) % 32) * a) * b;
    const detail = random() * .24;
    const blend = Math.min(1, Math.max(0, n * .7 + detail));
    const i = (y * size + x) * 4;
    for (let c = 0; c < 3; c++)
      image.data[i + c] = base[c] * (1 - blend) + accent[c] * blend;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(scale, scale);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return map;
}

export function createSurfaceTextures() {
  return {
    sand: texture([194, 172, 122], [231, 211, 159], 4821, 16),
    grass: texture([60, 91, 45], [108, 132, 67], 9127, 22),
    stone: texture([102, 109, 107], [161, 163, 149], 1239, 8),
  };
}
