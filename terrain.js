import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WORLD, ASSETS } from './config.js';

const seed = WORLD.seed | 0;

function fade(t) {
  return t * t * (3 - 2 * t);
}

function hash2(ix, iz, extra = 0) {
  let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iz | 0, 668265263) ^ Math.imul((seed + extra) | 0, 1442695041);
  h = (h ^ (h >>> 13)) | 0;
  h = Math.imul(h, 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function valueNoise(x, z, extra = 0) {
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const tx = fade(x - x0);
  const tz = fade(z - z0);
  const a = hash2(x0, z0, extra);
  const b = hash2(x0 + 1, z0, extra);
  const c = hash2(x0, z0 + 1, extra);
  const d = hash2(x0 + 1, z0 + 1, extra);
  const ab = THREE.MathUtils.lerp(a, b, tx);
  const cd = THREE.MathUtils.lerp(c, d, tx);
  return THREE.MathUtils.lerp(ab, cd, tz);
}

function fbm(x, z, octaves = 5, extra = 0) {
  let amplitude = 0.5;
  let frequency = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += valueNoise(x * frequency, z * frequency, extra + i * 17) * amplitude;
    norm += amplitude;
    amplitude *= 0.5;
    frequency *= 2.02;
  }
  return sum / norm;
}

export function terrainHeight(x, z) {
  const broad = (fbm(x * 0.00155, z * 0.00155, 5, 11) - 0.5) * 32;
  const rolling = (fbm(x * 0.0043 + 17, z * 0.0043 - 29, 4, 71) - 0.5) * 8;
  const fine = (fbm(x * 0.013 - 13, z * 0.013 + 5, 3, 131) - 0.5) * 1.2;

  const dist = Math.hypot(x, z);
  const spawnBlend = THREE.MathUtils.smoothstep(dist, 35, 150);
  const natural = broad + rolling + fine;
  return THREE.MathUtils.lerp(natural * 0.32, natural, spawnBlend);
}

export function terrainNormal(x, z, out = new THREE.Vector3()) {
  const e = 0.75;
  const hL = terrainHeight(x - e, z);
  const hR = terrainHeight(x + e, z);
  const hD = terrainHeight(x, z - e);
  const hU = terrainHeight(x, z + e);
  return out.set(hL - hR, e * 2, hD - hU).normalize();
}

export function createTerrain(renderer, manager) {
  const geometry = new THREE.PlaneGeometry(WORLD.size, WORLD.size, WORLD.segments, WORLD.segments);
  geometry.rotateX(-Math.PI / 2);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const color = new THREE.Color();
  const olive = new THREE.Color(0x677248);
  const dry = new THREE.Color(0x998257);
  const earth = new THREE.Color(0x6d583e);
  const lush = new THREE.Color(0x5d7441);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);

    const macro = fbm(x * 0.007 + 40, z * 0.007 - 20, 4, 303);
    const detail = fbm(x * 0.03 - 20, z * 0.03 + 50, 3, 441);
    const normal = terrainNormal(x, z);
    const slope = 1 - normal.y;

    color.copy(dry).lerp(olive, THREE.MathUtils.smoothstep(macro, 0.28, 0.78));
    if (macro > 0.64) color.lerp(lush, (macro - 0.64) * 1.55);
    if (detail > 0.58) color.offsetHSL(-0.008, 0.02, 0.03);
    if (detail < 0.34) color.lerp(earth, 0.16);
    if (slope > 0.075) color.lerp(earth, THREE.MathUtils.clamp(slope * 4.5, 0, 0.5));

    const shade = 0.91 + hash2(Math.floor(x * 0.33), Math.floor(z * 0.33), 403) * 0.14;
    color.multiplyScalar(shade);

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.98,
    metalness: 0,
  });

  const textureLoader = new THREE.TextureLoader(manager);
  textureLoader.load(
    ASSETS.steppeGround,
    (texture) => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(115, 115);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      material.map = texture;
      material.needsUpdate = true;
    },
    undefined,
    () => {
      // Vertex colours are intentionally good enough to remain as a clean fallback.
    },
  );

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.name = 'SteppeTerrain';
  return mesh;
}

function mulberry32(a) {
  return function rand() {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createGrassTuftGeometry() {
  const parts = [];
  const addPlane = (angle, width, height, xOffset = 0) => {
    const g = new THREE.PlaneGeometry(width, height, 1, 4);
    g.translate(xOffset, height * 0.5, 0);
    g.rotateY(angle);
    parts.push(g);
  };

  addPlane(0, 0.38, 1.1, 0);
  addPlane(Math.PI / 3, 0.34, 1.0, 0.02);
  addPlane(-Math.PI / 3, 0.34, 0.95, -0.02);
  const geometry = mergeGeometries(parts, false);

  const pos = geometry.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const bottom = new THREE.Color(0x8b7a46);
  const mid = new THREE.Color(0x6f8541);
  const top = new THREE.Color(0x87a85c);
  const c = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = THREE.MathUtils.clamp(y / 1.1, 0, 1);
    c.copy(bottom);
    if (t < 0.52) {
      c.lerp(mid, t / 0.52);
    } else {
      c.copy(mid).lerp(top, (t - 0.52) / 0.48);
    }
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export class GrassField {
  constructor(scene, manager) {
    this.scene = scene;
    this.lastCenter = new THREE.Vector2(1e9, 1e9);
    this.clockTime = 0;

    const geometry = createGrassTuftGeometry();
    const textureLoader = new THREE.TextureLoader(manager);
    const grassMap = textureLoader.load(ASSETS.grassBlade);
    grassMap.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassMap,
      alphaMap: grassMap,
      alphaTest: 0.42,
      transparent: true,
      roughness: 1,
      metalness: 0,
      side: THREE.DoubleSide,
      vertexColors: true,
    });

    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float bend = clamp(position.y / 1.1, 0.0, 1.0);
          float phase = instanceMatrix[3].x * 0.11 + instanceMatrix[3].z * 0.09;
          transformed.x += sin(uTime * 1.15 + phase) * 0.05 * bend * bend;
          transformed.z += cos(uTime * 0.86 + phase * 0.91) * 0.028 * bend * bend;
        #endif`,
      );
      material.userData.shader = shader;
    };

    this.mesh = new THREE.InstancedMesh(geometry, material, WORLD.grassCount);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'DynamicGrass';
    scene.add(this.mesh);

    this.dummy = new THREE.Object3D();
    this.tmpColor = new THREE.Color();
    this.centerCache = new THREE.Vector2();
  }

  update(playerPosition, dt) {
    this.clockTime += dt;
    const shader = this.mesh.material.userData.shader;
    if (shader) shader.uniforms.uTime.value = this.clockTime;

    const cx = Math.round(playerPosition.x / WORLD.grassRefreshDistance) * WORLD.grassRefreshDistance;
    const cz = Math.round(playerPosition.z / WORLD.grassRefreshDistance) * WORLD.grassRefreshDistance;
    this.centerCache.set(cx, cz);
    if (this.lastCenter.distanceToSquared(this.centerCache) < 0.01) return;
    this.lastCenter.copy(this.centerCache);

    const cellX = Math.floor(cx / WORLD.grassRefreshDistance);
    const cellZ = Math.floor(cz / WORLD.grassRefreshDistance);
    const rand = mulberry32((Math.imul(cellX, 73856093) ^ Math.imul(cellZ, 19349663) ^ WORLD.seed) >>> 0);
    const radius = WORLD.grassRadius;

    for (let i = 0; i < WORLD.grassCount; i++) {
      const angle = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * radius;
      const x = cx + Math.cos(angle) * r;
      const z = cz + Math.sin(angle) * r;
      const y = terrainHeight(x, z);

      const density = valueNoise(x * 0.028, z * 0.028, 551);
      const lushMask = valueNoise(x * 0.013 + 6, z * 0.013 - 9, 612);
      const visible = density > 0.16;
      const height = visible ? THREE.MathUtils.lerp(0.48, 1.12, Math.pow(rand(), 0.85)) * (0.92 + lushMask * 0.28) : 0.001;
      const width = THREE.MathUtils.lerp(0.8, 1.28, rand());
      const yaw = rand() * Math.PI;
      const lean = (rand() - 0.5) * 0.08;

      this.dummy.position.set(x, y + 0.015, z);
      this.dummy.rotation.set(0, yaw, lean);
      this.dummy.scale.set(width, height, width);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      const dryness = rand();
      if (dryness < 0.35) {
        this.tmpColor.setRGB(0.96, 0.92, 0.82);
      } else if (dryness < 0.65) {
        this.tmpColor.setRGB(0.88, 0.93, 0.78);
      } else {
        this.tmpColor.setRGB(0.80, 0.91, 0.76);
      }
      this.tmpColor.multiplyScalar(0.82 + lushMask * 0.28);
      this.mesh.setColorAt(i, this.tmpColor);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

export function createRockField(scene) {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0x716858, roughness: 0.96, metalness: 0 });
  const rocks = new THREE.InstancedMesh(geometry, material, WORLD.rockCount);
  rocks.castShadow = true;
  rocks.receiveShadow = true;
  rocks.name = 'SteppeRocks';

  const rand = mulberry32(WORLD.seed * 99);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < WORLD.rockCount; i++) {
    const angle = rand() * Math.PI * 2;
    const r = 35 + Math.sqrt(rand()) * (WORLD.size * 0.46);
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const s = THREE.MathUtils.lerp(0.12, 0.7, Math.pow(rand(), 3));
    dummy.position.set(x, terrainHeight(x, z) + s * 0.22, z);
    dummy.rotation.set(rand() * 0.8, rand() * Math.PI * 2, rand() * 0.8);
    dummy.scale.set(s * (0.8 + rand()), s * (0.45 + rand() * 0.45), s * (0.8 + rand()));
    dummy.updateMatrix();
    rocks.setMatrixAt(i, dummy.matrix);
  }

  scene.add(rocks);
  return rocks;
}
