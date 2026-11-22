import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSETS, WORLD } from './config.js';
import { terrainHeight } from './terrain.js';

function randRange(a, b) {
  return a + Math.random() * (b - a);
}

function setupMeshShadows(root) {
  root.traverse((obj) => {
    if (!obj.isMesh && !obj.isSkinnedMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;

    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      const cloned = mats.map((m) => {
        const c = m.clone();
        if (c.color) c.color.multiplyScalar(0.88);
        c.roughness = Math.max(c.roughness ?? 0.7, 0.76);
        return c;
      });
      obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
    }
  });
}

function mat(color, roughness = 0.88, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addMesh(parent, geometry, material, position, rotation = null, scale = null, name = '') {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position.x, position.y, position.z);
  if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  if (scale) mesh.scale.set(scale.x, scale.y, scale.z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (name) mesh.name = name;
  parent.add(mesh);
  return mesh;
}

// Stylized steppe NPC made only from simple geometry.
// The silhouette is intentionally broad and readable from a distance.
function createSteppePerson(variant = 0) {
  const palettes = [
    {
      coat: 0x28483f,
      lower: 0x203c36,
      trim: 0xa0523d,
      trim2: 0xd2b07a,
      fur: 0xc7b292,
      leather: 0x3c2519,
      leather2: 0x6a3f27,
      hat: 0x27453f,
      hatBand: 0x4a2f22,
      skin: 0xa97755,
      scarf: 0x465c75,
      metal: 0xb48742,
    },
    {
      coat: 0x5a4334,
      lower: 0x49362b,
      trim: 0x7d3030,
      trim2: 0xc8a66b,
      fur: 0xbda682,
      leather: 0x34231a,
      leather2: 0x64402a,
      hat: 0x4b392f,
      hatBand: 0x2f211a,
      skin: 0xa57050,
      scarf: 0x3e5660,
      metal: 0xa77738,
    },
    {
      coat: 0x4d5130,
      lower: 0x3f4328,
      trim: 0x884a34,
      trim2: 0xd0ad72,
      fur: 0xc2ad88,
      leather: 0x3b281b,
      leather2: 0x68472d,
      hat: 0x46462f,
      hatBand: 0x3b2b20,
      skin: 0xab7857,
      scarf: 0x4d566e,
      metal: 0xb18749,
    },
    {
      coat: 0x4c3438,
      lower: 0x3f2b2f,
      trim: 0x8e5634,
      trim2: 0xd4b47d,
      fur: 0xcab696,
      leather: 0x34231a,
      leather2: 0x69442c,
      hat: 0x3c3431,
      hatBand: 0x4a2f25,
      skin: 0xa97555,
      scarf: 0x384f66,
      metal: 0xb68845,
    },
  ];

  const p = palettes[variant % palettes.length];
  const root = new THREE.Group();
  root.name = 'SteppePerson';

  const coatMat = mat(p.coat, 0.96);
  const lowerMat = mat(p.lower, 0.97);
  const trimMat = mat(p.trim, 0.92);
  const trim2Mat = mat(p.trim2, 0.90);
  const furMat = mat(p.fur, 1.0);
  const leatherMat = mat(p.leather, 0.86);
  const leather2Mat = mat(p.leather2, 0.82);
  const hatMat = mat(p.hat, 0.96);
  const hatBandMat = mat(p.hatBand, 0.92);
  const skinMat = mat(p.skin, 0.90);
  const scarfMat = mat(p.scarf, 0.95);
  const metalMat = mat(p.metal, 0.5, 0.28);
  const eyeMat = mat(0x16130f, 0.75);
  const mouthMat = mat(0x4c2d24, 0.95);
  const bootMat = mat(0x221a16, 0.94);

  // Tiny boots: visible enough to ground the figurine, but the robe is still the main shape.
  addMesh(root, new THREE.BoxGeometry(0.22, 0.14, 0.31), bootMat,
    { x: -0.17, y: 0.10, z: 0.04 }, null, { x: 1, y: 1, z: 1 }, 'bootL');
  addMesh(root, new THREE.BoxGeometry(0.22, 0.14, 0.31), bootMat,
    { x: 0.17, y: 0.10, z: 0.04 }, null, { x: 1, y: 1, z: 1 }, 'bootR');

  // Wide skirt/deel: octagonal frustum instead of a smooth tube.
  addMesh(root, new THREE.CylinderGeometry(0.39, 0.49, 0.74, 8, 1, false), lowerMat,
    { x: 0, y: 0.52, z: 0 }, { x: 0, y: Math.PI / 8, z: 0 });

  // Bottom trim band.
  addMesh(root, new THREE.CylinderGeometry(0.485, 0.50, 0.095, 8), trimMat,
    { x: 0, y: 0.19, z: 0 }, { x: 0, y: Math.PI / 8, z: 0 });

  // Broad-shouldered upper robe: wide at the top, a little narrower at the waist.
  addMesh(root, new THREE.CylinderGeometry(0.48, 0.35, 0.58, 8, 1, false), coatMat,
    { x: 0, y: 1.03, z: 0 }, { x: 0, y: Math.PI / 8, z: 0 });

  // Belt wraps the whole figure but is very thin, so it reads as a belt rather than another cylinder body.
  addMesh(root, new THREE.CylinderGeometry(0.365, 0.365, 0.105, 12), leatherMat,
    { x: 0, y: 0.79, z: 0 });

  // Round metal buckle on the front.
  addMesh(root, new THREE.CylinderGeometry(0.09, 0.09, 0.025, 20), metalMat,
    { x: 0, y: 0.79, z: 0.355 }, { x: Math.PI / 2, y: 0, z: 0 });
  addMesh(root, new THREE.TorusGeometry(0.052, 0.010, 6, 16), leather2Mat,
    { x: 0, y: 0.79, z: 0.372 }, { x: Math.PI / 2, y: 0, z: 0 });

  // Diagonal decorative sash on the chest.
  addMesh(root, new THREE.BoxGeometry(0.60, 0.105, 0.035), trimMat,
    { x: 0.02, y: 1.07, z: 0.39 }, { x: 0, y: 0, z: -0.56 });
  addMesh(root, new THREE.BoxGeometry(0.61, 0.022, 0.041), trim2Mat,
    { x: 0.02, y: 1.07, z: 0.405 }, { x: 0, y: 0, z: -0.56 });

  // Neck scarf sits inside the collar and visually connects the head to the body.
  addMesh(root, new THREE.BoxGeometry(0.31, 0.14, 0.18), scarfMat,
    { x: 0, y: 1.34, z: 0.05 }, { x: 0, y: 0, z: Math.PI / 4 });

  // Fur collar is made from two soft pads rather than one giant torus.
  addMesh(root, new THREE.SphereGeometry(0.18, 12, 8), furMat,
    { x: -0.23, y: 1.33, z: 0.08 }, null, { x: 1.30, y: 0.72, z: 1.05 });
  addMesh(root, new THREE.SphereGeometry(0.18, 12, 8), furMat,
    { x: 0.23, y: 1.33, z: 0.08 }, null, { x: 1.30, y: 0.72, z: 1.05 });

  // Short integrated sleeves. No long stick-like arms.
  const sleeveGeo = new THREE.CylinderGeometry(0.16, 0.135, 0.47, 8, 1, false);
  const leftSleeve = addMesh(root, sleeveGeo, coatMat,
    { x: -0.47, y: 1.01, z: 0 }, { x: 0, y: 0, z: -0.18 }, null, 'armL');
  const rightSleeve = addMesh(root, sleeveGeo, coatMat,
    { x: 0.47, y: 1.01, z: 0 }, { x: 0, y: 0, z: 0.18 }, null, 'armR');

  // Cuffs.
  addMesh(leftSleeve, new THREE.CylinderGeometry(0.145, 0.145, 0.095, 8), trimMat,
    { x: 0, y: -0.22, z: 0 });
  addMesh(rightSleeve, new THREE.CylinderGeometry(0.145, 0.145, 0.095, 8), trimMat,
    { x: 0, y: -0.22, z: 0 });
  addMesh(leftSleeve, new THREE.CylinderGeometry(0.149, 0.149, 0.025, 8), trim2Mat,
    { x: 0, y: -0.17, z: 0 });
  addMesh(rightSleeve, new THREE.CylinderGeometry(0.149, 0.149, 0.025, 8), trim2Mat,
    { x: 0, y: -0.17, z: 0 });

  // Rounded simple hands.
  addMesh(leftSleeve, new THREE.SphereGeometry(0.105, 10, 8), skinMat,
    { x: 0, y: -0.31, z: 0 }, null, { x: 1, y: 1.10, z: 0.90 });
  addMesh(rightSleeve, new THREE.SphereGeometry(0.105, 10, 8), skinMat,
    { x: 0, y: -0.31, z: 0 }, null, { x: 1, y: 1.10, z: 0.90 });

  // Head: wide, slightly flattened front-to-back, still deliberately simple.
  addMesh(root, new THREE.SphereGeometry(0.225, 16, 12), skinMat,
    { x: 0, y: 1.58, z: 0.02 }, null, { x: 1.06, y: 1.16, z: 0.90 }, 'head');

  // Ears.
  addMesh(root, new THREE.SphereGeometry(0.052, 10, 8), skinMat,
    { x: -0.225, y: 1.58, z: 0.02 }, null, { x: 0.75, y: 1.15, z: 0.70 });
  addMesh(root, new THREE.SphereGeometry(0.052, 10, 8), skinMat,
    { x: 0.225, y: 1.58, z: 0.02 }, null, { x: 0.75, y: 1.15, z: 0.70 });

  // Narrow eyes: two short dark ellipsoids, intentionally readable and not uncanny.
  addMesh(root, new THREE.SphereGeometry(0.040, 10, 6), eyeMat,
    { x: -0.084, y: 1.61, z: 0.215 }, null, { x: 1.45, y: 0.30, z: 0.23 });
  addMesh(root, new THREE.SphereGeometry(0.040, 10, 6), eyeMat,
    { x: 0.084, y: 1.61, z: 0.215 }, null, { x: 1.45, y: 0.30, z: 0.23 });

  // Brows.
  addMesh(root, new THREE.BoxGeometry(0.092, 0.014, 0.014), leatherMat,
    { x: -0.084, y: 1.66, z: 0.221 }, { x: 0, y: 0, z: -0.08 });
  addMesh(root, new THREE.BoxGeometry(0.092, 0.014, 0.014), leatherMat,
    { x: 0.084, y: 1.66, z: 0.221 }, { x: 0, y: 0, z: 0.08 });

  // Simple nose wedge and short mouth.
  addMesh(root, new THREE.ConeGeometry(0.034, 0.10, 4), skinMat,
    { x: 0, y: 1.56, z: 0.231 }, { x: Math.PI / 2, y: 0, z: Math.PI / 4 });
  addMesh(root, new THREE.BoxGeometry(0.092, 0.010, 0.012), mouthMat,
    { x: 0, y: 1.49, z: 0.226 });

  // Hat: smaller and wider than the old giant cone.
  addMesh(root, new THREE.CylinderGeometry(0.222, 0.232, 0.095, 16), hatBandMat,
    { x: 0, y: 1.80, z: 0.01 });
  addMesh(root, new THREE.ConeGeometry(0.195, 0.27, 16), hatMat,
    { x: 0, y: 1.96, z: 0.01 });
  addMesh(root, new THREE.SphereGeometry(0.035, 10, 8), metalMat,
    { x: 0, y: 2.11, z: 0.01 });

  // Small red tassel/ribbon on the back-right of the hat.
  const tasselAnchor = new THREE.Group();
  tasselAnchor.position.set(0.11, 2.01, -0.08);
  tasselAnchor.rotation.z = -0.34;
  root.add(tasselAnchor);
  addMesh(tasselAnchor, new THREE.CylinderGeometry(0.018, 0.022, 0.18, 8), trimMat,
    { x: 0, y: -0.08, z: 0 });
  addMesh(tasselAnchor, new THREE.CylinderGeometry(0.015, 0.019, 0.15, 8), trim2Mat,
    { x: 0.035, y: -0.075, z: -0.01 });

  // Small side pouch so the figure has one asymmetrical detail.
  addMesh(root, new THREE.BoxGeometry(0.16, 0.20, 0.08), leather2Mat,
    { x: 0.37, y: 0.65, z: 0.18 }, { x: 0, y: -0.18, z: 0.05 });
  addMesh(root, new THREE.SphereGeometry(0.018, 8, 6), metalMat,
    { x: 0.37, y: 0.68, z: 0.225 });

  root.scale.setScalar(0.90);
  root.userData.armL = leftSleeve;
  root.userData.armR = rightSleeve;
  root.userData.baseY = 0;
  root.userData.phase = Math.random() * Math.PI * 2;

  return root;
}

class Wanderer {
  constructor(group, visual, home, speed = 1.15) {
    this.group = group;
    this.visual = visual;
    this.home = home.clone();
    this.target = home.clone();
    this.speed = speed;
    this.state = 'idle';
    this.timer = randRange(2, 7);
    this.phase = Math.random() * Math.PI * 2;
    this.walkTime = 0;
  }

  chooseTarget() {
    const a = Math.random() * Math.PI * 2;
    const r = randRange(7, 28);
    this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
    const half = WORLD.size * 0.43;
    this.target.x = THREE.MathUtils.clamp(this.target.x, -half, half);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -half, half);
    this.state = 'walk';
  }

  animateVisual(dt) {
    const armL = this.visual.userData.armL;
    const armR = this.visual.userData.armR;

    if (this.state === 'walk') {
      this.walkTime += dt * 6.0;
      const swing = Math.sin(this.walkTime + this.phase) * 0.16;
      if (armL) armL.rotation.x = swing;
      if (armR) armR.rotation.x = -swing;
      this.visual.position.y = Math.abs(Math.sin(this.walkTime * 2)) * 0.018;
      this.visual.rotation.z = Math.sin(this.walkTime) * 0.012;
    } else {
      this.walkTime += dt * 1.2;
      if (armL) armL.rotation.x *= Math.max(0, 1 - dt * 5);
      if (armR) armR.rotation.x *= Math.max(0, 1 - dt * 5);
      this.visual.position.y = Math.sin(this.walkTime + this.phase) * 0.004;
      this.visual.rotation.z *= Math.max(0, 1 - dt * 4);
    }
  }

  update(dt) {
    this.animateVisual(dt);

    if (this.state === 'idle') {
      this.timer -= dt;
      if (this.timer <= 0) this.chooseTarget();
      return;
    }

    const dx = this.target.x - this.group.position.x;
    const dz = this.target.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.7) {
      this.state = 'idle';
      this.timer = randRange(2.5, 8);
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    this.group.position.x += nx * this.speed * dt;
    this.group.position.z += nz * this.speed * dt;
    this.group.position.y = terrainHeight(this.group.position.x, this.group.position.z) + 0.01;

    const desiredYaw = Math.atan2(nx, nz);
    let diff = desiredYaw - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * Math.min(1, dt * 4.5);
  }
}

class HorseNPC {
  constructor(group, type, home) {
    this.group = group;
    this.type = type;
    this.home = home.clone();
    this.target = home.clone();
    this.timer = randRange(5, 14);
    this.phase = Math.random() * Math.PI * 2;
    this.speed = randRange(0.65, 1.0);
    if (type === 'trot') this.chooseTarget();
  }

  chooseTarget() {
    const a = Math.random() * Math.PI * 2;
    const r = randRange(9, 30);
    this.target.set(this.home.x + Math.cos(a) * r, 0, this.home.z + Math.sin(a) * r);
  }

  update(dt, elapsed) {
    if (this.type !== 'trot') {
      const breath = 1 + Math.sin(elapsed * 1.15 + this.phase) * 0.003;
      this.group.scale.y = breath;
      return;
    }

    this.timer -= dt;
    const dx = this.target.x - this.group.position.x;
    const dz = this.target.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5 || this.timer <= 0) {
      this.chooseTarget();
      this.timer = randRange(9, 18);
      return;
    }

    const nx = dx / dist;
    const nz = dz / dist;
    this.group.position.x += nx * this.speed * dt;
    this.group.position.z += nz * this.speed * dt;
    const ground = terrainHeight(this.group.position.x, this.group.position.z);
    this.group.position.y = ground + Math.sin(elapsed * 5.4 + this.phase) * 0.018;

    const desiredYaw = Math.atan2(nx, nz);
    let diff = desiredYaw - this.group.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    this.group.rotation.y += diff * Math.min(1, dt * 2.2);
  }
}

export class NPCManager {
  constructor(scene, manager) {
    this.scene = scene;
    this.loader = new GLTFLoader(manager);
    this.people = [];
    this.horses = [];
    this.elapsed = 0;
  }

  async loadGLB(url) {
    return await this.loader.loadAsync(url);
  }

  async init() {
    // People are now procedural, so the awkward human-base GLB is no longer needed.
    this.spawnPeople();

    const [standing, grazing, grazingChestnut, trotting, trottingGrey] = await Promise.all([
      this.loadGLB(ASSETS.horseStandingBay),
      this.loadGLB(ASSETS.horseGrazingBay),
      this.loadGLB(ASSETS.horseGrazingChestnut),
      this.loadGLB(ASSETS.horseTrottingBay),
      this.loadGLB(ASSETS.horseTrottingGrey),
    ]);

    this.spawnHorses({ standing, grazing, grazingChestnut, trotting, trottingGrey });
  }


spawnPeople() {
    
const spots = [
  new THREE.Vector3(22, 0, -29),
  new THREE.Vector3(-34, 0, -42),
  new THREE.Vector3(48, 0, 18),
  new THREE.Vector3(-58, 0, 24),

  new THREE.Vector3(10, 0, 10),
  new THREE.Vector3(-10, 0, 10),
  new THREE.Vector3(20, 0, 15),
  new THREE.Vector3(-20, 0, 15),
  new THREE.Vector3(30, 0, 10),
  new THREE.Vector3(-30, 0, 10),
  new THREE.Vector3(15, 0, -10),
  new THREE.Vector3(-15, 0, -10),
  new THREE.Vector3(25, 0, -15),
  new THREE.Vector3(-25, 0, -15),
  new THREE.Vector3(35, 0, -20),
  new THREE.Vector3(-35, 0, -20),
  new THREE.Vector3(5, 0, 20),
  new THREE.Vector3(-5, 0, 20),
  new THREE.Vector3(40, 0, 25),
  new THREE.Vector3(-40, 0, 25),
  new THREE.Vector3(12, 0, 30),
  new THREE.Vector3(-12, 0, 30),
  new THREE.Vector3(22, 0, 35),
  new THREE.Vector3(-22, 0, 35),
  new THREE.Vector3(32, 0, 30),
  new THREE.Vector3(-32, 0, 30),
  new THREE.Vector3(8, 0, -30),
  new THREE.Vector3(-8, 0, -30),
  new THREE.Vector3(18, 0, -35),
  new THREE.Vector3(-18, 0, -35),
  new THREE.Vector3(28, 0, -30),
  new THREE.Vector3(-28, 0, -30),
  new THREE.Vector3(38, 0, -35),
  new THREE.Vector3(-38, 0, -35),
  new THREE.Vector3(45, 0, 5),
  new THREE.Vector3(-45, 0, 5),
  new THREE.Vector3(5, 0, 40),
  new THREE.Vector3(-5, 0, 40),
  new THREE.Vector3(15, 0, 45),
  new THREE.Vector3(-15, 0, 45),
  new THREE.Vector3(25, 0, 45),
  new THREE.Vector3(-25, 0, 45),
  new THREE.Vector3(35, 0, 40),
  new THREE.Vector3(-35, 0, 40),
  new THREE.Vector3(0, 0, -45),
  new THREE.Vector3(0, 0, 45)
];


    spots.forEach((spot, i) => {
      const group = new THREE.Group();
      const person = createSteppePerson(i);

      // Tiny variation keeps them from looking like exact clones.
      const s = 0.94 + Math.random() * 0.08;
      person.scale.multiplyScalar(s);
      group.add(person);

      group.position.set(spot.x, terrainHeight(spot.x, spot.z) + 0.01, spot.z);
      group.rotation.y = Math.random() * Math.PI * 2;
      this.scene.add(group);

      this.people.push(new Wanderer(group, person, spot, 1.05 + Math.random() * 0.18));
    });
  }

  addHorse(sourceScene, x, z, yaw, type = 'still') {
    const group = new THREE.Group();
    const model = sourceScene.clone(true);
    setupMeshShadows(model);
    group.add(model);
    group.position.set(x, terrainHeight(x, z), z);
    group.rotation.y = yaw;
    this.scene.add(group);
    this.horses.push(new HorseNPC(group, type, new THREE.Vector3(x, 0, z)));
  }


spawnHorses(models) {
    // Оригинальные лошади
    this.addHorse(models.grazing.scene, 16, -47, 0.4, 'graze');
    this.addHorse(models.grazingChestnut.scene, -12, -59, -0.5, 'graze');
    this.addHorse(models.standing.scene, 37, -62, 1.8, 'still');
    this.addHorse(models.standing.scene, -43, -72, 2.4, 'still');
    this.addHorse(models.grazing.scene, 66, 41, -1.2, 'graze');
    this.addHorse(models.trotting.scene, 118, -74, -0.8, 'trot');
    this.addHorse(models.trottingGrey.scene, -137, 63, 1.9, 'trot');

    // Ещё 93 лошади
    const types = [
        [models.grazing.scene, 'graze'],
        [models.grazingChestnut.scene, 'graze'],
        [models.standing.scene, 'still'],
        [models.trotting.scene, 'trot'],
        [models.trottingGrey.scene, 'trot']
    ];

    for (let i = 0; i < 93; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 20 + Math.random() * 65;

        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        const [model, type] = types[
            Math.floor(Math.random() * types.length)
        ];

        this.addHorse(
            model,
            x,
            z,
            Math.random() * Math.PI * 2,
            type
        );
    }
}


  update(dt) {
    this.elapsed += dt;
    for (const p of this.people) p.update(dt);
    for (const h of this.horses) h.update(dt, this.elapsed);
  }
}
