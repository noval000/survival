import * as THREE from 'three';
import type { Quality } from './Quality';

export class PerformanceGovernor {
  private elapsed = 0;
  private frames = 0;
  private slowWindows = 0;
  private fastWindows = 0;
  private lastChange = 0;
  private fps = 60;
  private readonly label: HTMLDivElement;
  private quality: Quality;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly sun: THREE.DirectionalLight,
    quality: Quality,
    private readonly apply: (quality: Quality) => void,
  ) {
    this.quality = quality;
    this.label = document.createElement('div');
    this.label.id = 'performance-meter';
    Object.assign(this.label.style, {
      position: 'fixed', bottom: '8px', left: '8px',
      zIndex: '30', padding: '5px 8px',
      color: '#e1e9e4', background: '#13231ecc',
      font: '12px monospace', pointerEvents: 'none',
    });
    document.body.append(this.label);
  }

  setQuality(quality: Quality) {
    this.quality = quality;
    this.lastChange = 0;
    this.slowWindows = 0;
    this.fastWindows = 0;
  }

  update(dt: number) {
    if (document.hidden || dt <= 0) return;
    this.elapsed += dt;
    this.lastChange += dt;
    this.frames++;
    if (this.elapsed < 1.5) return;
    this.fps = this.frames / this.elapsed;
    this.frames = 0;
    this.elapsed = 0;
    const calls = this.renderer.info.render.calls;
    const triangles = this.renderer.info.render.triangles;
    this.label.textContent = Math.round(this.fps) + ' FPS | ' +
      calls + ' draw calls | ' + Math.round(triangles / 1000) + 'k tris | ' +
      this.quality.toUpperCase();
    if (this.fps < 35) {
      this.slowWindows++;
      this.fastWindows = 0;
    } else if (this.fps > 57) {
      this.fastWindows++;
      this.slowWindows = 0;
    } else {
      this.fastWindows = 0;
      this.slowWindows = 0;
    }
    if (this.lastChange < 15) return;
    if (this.slowWindows >= 3 && this.quality !== 'low') {
      const next: Quality = this.quality === 'high' ? 'medium' : 'low';
      this.setQuality(next);
      this.apply(next);
      this.lastChange = 0;
    }
    // Do not automatically increase quality: repeated upgrades cause stutter.
    void this.sun;
  }
}
