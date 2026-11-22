import * as THREE from 'three';
import { WORLD, ASSETS } from './config.js';
import { createTerrain, createRockField, GrassField, terrainHeight } from './terrain.js';
import { FirstPersonPlayer } from './player.js';
import { NPCManager } from './npcs.js';

const app = document.querySelector('#app');
const loadingScreen = document.querySelector('#loading');
const loadingText = document.querySelector('#loadingText');
const loadFill = document.querySelector('#loadFill');
const startScreen = document.querySelector('#start');
const enterButton = document.querySelector('#enterButton');
const pauseHint = document.querySelector('#pause');
const debugEl = document.querySelector('#debug');
const crosshair = document.querySelector('#crosshair');

const manager = new THREE.LoadingManager();
manager.onProgress = (_url, loaded, total) => {
  const progress = total > 0 ? loaded / total : 0;
  loadFill.style.width = `${Math.round(progress * 100)}%`;
  loadingText.textContent = `Загрузка 3D-моделей и текстур · ${loaded}/${total}`;
};
manager.onError = (url) => {
  console.warn('Asset failed to load:', url);
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc8d6dd);
scene.fog = new THREE.Fog(0xd7d5c7, WORLD.fogNear, WORLD.fogFar);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.06, 1800);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;
renderer.domElement.id = 'gameCanvas';
app.appendChild(renderer.domElement);

const textureLoader = new THREE.TextureLoader(manager);

// PNG sky and sun: made local on purpose so the mood stays consistent even offline.
const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(900, 48, 28),
  new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }),
);
skyDome.name = 'SkyDome';
scene.add(skyDome);
textureLoader.load(ASSETS.skyPanorama, (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  skyDome.material.map = texture;
  skyDome.material.needsUpdate = true;
});

const sunGroup = new THREE.Group();
sunGroup.name = 'SunGroup';
scene.add(sunGroup);
const sunSprite = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    fog: false,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: 0xfff4d9,
  }),
);
sunSprite.scale.setScalar(92);
sunGroup.add(sunSprite);
const sunHalo = new THREE.Sprite(
  new THREE.SpriteMaterial({
    transparent: true,
    fog: false,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    color: 0xffdfab,
    opacity: 0.42,
  }),
);
sunHalo.scale.setScalar(150);
sunGroup.add(sunHalo);
textureLoader.load(ASSETS.sunGlow, (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  sunSprite.material.map = texture;
  sunSprite.material.needsUpdate = true;
  sunHalo.material.map = texture;
  sunHalo.material.needsUpdate = true;
});

const sunDirection = new THREE.Vector3();
const sunRadius = 620;
const phi = THREE.MathUtils.degToRad(90 - 17);
const theta = THREE.MathUtils.degToRad(228);
sunDirection.setFromSphericalCoords(1, phi, theta);

const hemi = new THREE.HemisphereLight(0xe4edf1, 0x7c6845, 1.42);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffdfb0, 3.55);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -105;
sun.shadow.camera.right = 105;
sun.shadow.camera.top = 105;
sun.shadow.camera.bottom = -105;
sun.shadow.camera.near = 1;
 sun.shadow.camera.far = 310;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.035;
scene.add(sun);
scene.add(sun.target);

const terrain = createTerrain(renderer, manager);
scene.add(terrain);
createRockField(scene);

const grass = new GrassField(scene, manager);
const player = new FirstPersonPlayer(camera, renderer.domElement);
const npcs = new NPCManager(scene, manager);

let ready = false;
let debugVisible = false;
let fps = 0;
let fpsFrames = 0;
let fpsTimer = 0;

async function boot() {
  try {
    loadingText.textContent = 'Загрузка людей, коней и новых текстур…';
    await npcs.init();
    grass.update(player.position, 0);
    ready = true;
    loadingScreen.classList.remove('visible');
    startScreen.classList.add('visible');
  } catch (error) {
    console.error(error);
    loadingText.textContent = 'Не удалось получить 3D-модели. Проверь интернет и перезапусти START_GAME.bat.';
    loadFill.style.width = '100%';
    loadFill.classList.add('error');
  }
}
boot();

enterButton.addEventListener('click', () => {
  if (!ready) return;
  startScreen.classList.remove('visible');
  player.lock();
});

renderer.domElement.addEventListener('click', () => {
  if (ready && !player.locked && !startScreen.classList.contains('visible')) player.lock();
});

window.addEventListener('player-lock-change', (e) => {
  const locked = e.detail;
  pauseHint.classList.toggle('visible', !locked && !startScreen.classList.contains('visible'));
  crosshair.classList.toggle('visible', locked);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'F3') {
    e.preventDefault();
    debugVisible = !debugVisible;
    debugEl.classList.toggle('visible', debugVisible);
  }
});

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
});

const clock = new THREE.Clock();

function updateEnvironmentAnchors() {
  const p = player.position;
  skyDome.position.copy(p);

  const sunPos = sunDirection.clone().multiplyScalar(sunRadius).add(p);
  sunGroup.position.copy(sunPos);
  sun.position.set(p.x - 95, p.y + 145, p.z + 88);
  sun.target.position.set(p.x, terrainHeight(p.x, p.z), p.z);
  sun.target.updateMatrixWorld();
}

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  if (ready) {
    player.update(dt);
    grass.update(player.position, dt);
    npcs.update(dt);
    updateEnvironmentAnchors();
  }

  fpsFrames++;
  fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fps = Math.round(fpsFrames / fpsTimer);
    fpsFrames = 0;
    fpsTimer = 0;
    if (debugVisible) {
      debugEl.innerHTML = [
        `<b>${fps} FPS</b>`,
        `X ${player.position.x.toFixed(1)} · Z ${player.position.z.toFixed(1)}`,
        `высота ${terrainHeight(player.position.x, player.position.z).toFixed(1)} м`,
        `людей ${npcs.people.length} · коней ${npcs.horses.length}`,
      ].join('<br>');
    }
  }

  renderer.render(scene, camera);
}
animate();
