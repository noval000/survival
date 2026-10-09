import * as THREE from 'three';

export class OceanSurface {
  private readonly time = { value: 0 };
  private readonly sunDirection = { value: new THREE.Vector3(.5, .8, .2).normalize() };
  readonly material: THREE.ShaderMaterial;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: this.time,
        uSunDirection: this.sunDirection,
        uDeep: { value: new THREE.Color(0x0a4054) },
        uShallow: { value: new THREE.Color(0x3b9b9e) },
        uSky: { value: new THREE.Color(0xa6c9d2) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorld;
        varying vec3 vView;
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec3 displaced = position;
          displaced.z += sin(position.x * .07 + uTime * .7) * .19;
          displaced.z += sin(position.y * .12 - uTime * 1.2) * .11;
          displaced.z += sin((position.x + position.y) * .19 + uTime * 1.4) * .07;
          vec4 world = modelMatrix * vec4(displaced, 1.0);
          vWorld = world.xyz;
          vView = cameraPosition - world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uSunDirection;
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        varying vec3 vWorld;
        varying vec3 vView;
        varying vec2 vUv;
        void main() {
          float a = sin(vWorld.x * .31 + uTime * 1.3 + sin(vWorld.z * .09));
          float b = cos(vWorld.z * .39 - uTime * 1.1);
          float c = sin((vWorld.x + vWorld.z) * .14 + uTime * .6);
          vec3 normal = normalize(vec3(a * .16 + c * .07, 1.0, b * .17 + c * .06));
          vec3 viewDir = normalize(vView);
          float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
          float wave = .5 + .5 * sin(vWorld.x * .18 + uTime + sin(vWorld.z * .15));
          vec3 water = mix(uDeep, uShallow, wave * .5 + .18);
          water = mix(water, uSky, fresnel * .64);
          vec3 halfDir = normalize(uSunDirection + viewDir);
          float specular = pow(max(dot(normal, halfDir), 0.0), 160.0);
          float sparkle = pow(max(dot(normal, halfDir), 0.0), 420.0);
          water += vec3(1.0, .89, .68) * (specular * .43 + sparkle * .35);
          float foam = smoothstep(.84, .98, wave) * .07;
          water += foam;
          gl_FragColor = vec4(water, .94);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });
  }

  update(dt: number, sun: THREE.DirectionalLight) {
    this.time.value += dt;
    this.sunDirection.value.copy(sun.position).normalize();
  }
}
