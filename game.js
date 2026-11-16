import * as THREE from 'three';
import { sfx } from './audio.js';

const canvas = document.getElementById('gameCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1c2c);
scene.fog = new THREE.Fog(0x1a1c2c, 38, 78);

// Camera
const camera = new THREE.PerspectiveCamera(48, window.innerWidth / window.innerHeight, 0.1, 140);
camera.position.set(0, 26, 24);
camera.lookAt(0, 0, 2);

// Lighting
const ambientLight = new THREE.AmbientLight(0xdbe4ff, 0.55);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff4e0, 1.15);
dirLight.position.set(18, 32, 16);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 5;
dirLight.shadow.camera.far = 85;
const d = 28;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

const rimLight = new THREE.DirectionalLight(0x38b6ff, 0.35);
rimLight.position.set(-20, 15, -20);
scene.add(rimLight);

// Arena Dimensions & Difficulty Presets
const ARENA_HALF_W = 22;
const ARENA_HALF_D = 16;
const MAX_SECTORS = 10;
const STARTING_LIVES = 3;
const obstacles = [];

const DIFFICULTIES = {
  recruit: {
    label: 'RECRUIT',
    playerHp: 125,
    enemyDamage: 15,
    enemySpeedMult: 0.82,
    enemyReloadMult: 1.25,
    scoreMult: 0.85
  },
  veteran: {
    label: 'VETERAN',
    playerHp: 100,
    enemyDamage: 25,
    enemySpeedMult: 1.0,
    enemyReloadMult: 1.0,
    scoreMult: 1.0
  },
  ace: {
    label: 'ACE',
    playerHp: 80,
    enemyDamage: 35,
    enemySpeedMult: 1.22,
    enemyReloadMult: 0.78,
    scoreMult: 1.5
  }
};

let currentDifficulty = 'veteran';

function createBoxObstacle(x, z, w, h, d, color = 0x333c57, trimColor = null, destructible = false, isInterior = false) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.65 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, h / 2, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  let trim = null;
  if (trimColor) {
    const trimGeo = new THREE.BoxGeometry(w + 0.08, 0.16, d + 0.08);
    const trimMat = new THREE.MeshStandardMaterial({
      color: trimColor,
      emissive: trimColor,
      emissiveIntensity: 0.25,
      roughness: 0.4
    });
    trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.set(x, h + 0.04, z);
    scene.add(trim);
  }

  obstacles.push({
    x,
    z,
    w,
    h,
    d,
    minX: x - w / 2,
    maxX: x + w / 2,
    minZ: z - d / 2,
    maxZ: z + d / 2,
    mesh,
    trim,
    destructible,
    isInterior,
    hp: destructible ? 3 : Infinity,
    maxHp: 3,
    baseColor: color
  });
}

const SECTOR_LAYOUTS = [
  // Sector 01: Tactical Cross
  [
    { x: -9, z: -6, w: 3.5, h: 2.0, d: 3.5, destructible: true },
    { x: 9, z: -6, w: 3.5, h: 2.0, d: 3.5, destructible: true },
    { x: -9, z: 6, w: 3.5, h: 2.0, d: 3.5, destructible: true },
    { x: 9, z: 6, w: 3.5, h: 2.0, d: 3.5, destructible: true },
    { x: 0, z: 0, w: 4.5, h: 2.4, d: 2.2, destructible: true }
  ],
  // Sector 02: Ricochet Labyrinth
  [
    { x: -11, z: -2, w: 2.0, h: 2.3, d: 13.0, destructible: false },
    { x: 11, z: -2, w: 2.0, h: 2.3, d: 13.0, destructible: false },
    { x: -4.5, z: -5.5, w: 2.0, h: 2.3, d: 9.0, destructible: false },
    { x: 4.5, z: 3.5, w: 2.0, h: 2.3, d: 9.0, destructible: false },
    { x: 0, z: -1, w: 7.0, h: 2.0, d: 2.0, destructible: true },
    { x: -16.5, z: 0, w: 9.0, h: 2.0, d: 2.0, destructible: true },
    { x: 16.5, z: 0, w: 9.0, h: 2.0, d: 2.0, destructible: true }
  ],
  // Sector 03: Twin Chokepoints
  [
    { x: -6.5, z: -3.5, w: 11.0, h: 2.3, d: 2.0, destructible: false },
    { x: 6.5, z: 3.5, w: 11.0, h: 2.3, d: 2.0, destructible: false },
    { x: 0, z: -9.5, w: 2.2, h: 2.3, d: 5.0, destructible: false },
    { x: -16.5, z: -3.5, w: 9.0, h: 2.0, d: 2.0, destructible: true },
    { x: 16.5, z: 3.5, w: 9.0, h: 2.0, d: 2.0, destructible: true },
    { x: 0, z: 0, w: 3.2, h: 2.0, d: 3.2, destructible: true }
  ],
  // Sector 04: Spiral Citadel
  [
    { x: -7, z: -6.5, w: 12.0, h: 2.3, d: 1.8, destructible: false },
    { x: 7, z: 5.5, w: 12.0, h: 2.3, d: 1.8, destructible: false },
    { x: -12.1, z: 1.5, w: 1.8, h: 2.3, d: 11.0, destructible: false },
    { x: 12.1, z: -2.5, w: 1.8, h: 2.3, d: 11.0, destructible: false },
    { x: 0, z: -0.5, w: 4.2, h: 2.2, d: 4.2, destructible: true }
  ],
  // Sector 05 (BOSS 1 - IRON JUGGERNAUT)
  [
    { x: -12, z: -3, w: 2.4, h: 2.3, d: 7.5, destructible: false },
    { x: 12, z: -3, w: 2.4, h: 2.3, d: 7.5, destructible: false },
    { x: -6, z: 3.5, w: 3.2, h: 2.0, d: 2.4, destructible: true },
    { x: 6, z: 3.5, w: 3.2, h: 2.0, d: 2.4, destructible: true }
  ],
  // Sector 06: Diamond Bastion
  [
    { x: 0, z: -6.5, w: 6.5, h: 2.3, d: 2.0, destructible: false },
    { x: 0, z: 5.5, w: 6.5, h: 2.3, d: 2.0, destructible: false },
    { x: -8.5, z: -0.5, w: 2.0, h: 2.3, d: 6.5, destructible: false },
    { x: 8.5, z: -0.5, w: 2.0, h: 2.3, d: 6.5, destructible: false },
    { x: 0, z: -0.5, w: 3.5, h: 2.0, d: 3.5, destructible: true }
  ],
  // Sector 07: Split Trenches
  [
    { x: -7.5, z: -7.5, w: 2.0, h: 2.3, d: 8.0, destructible: false },
    { x: 7.5, z: -7.5, w: 2.0, h: 2.3, d: 8.0, destructible: false },
    { x: -7.5, z: 5.5, w: 2.0, h: 2.3, d: 7.0, destructible: false },
    { x: 7.5, z: 5.5, w: 2.0, h: 2.3, d: 7.0, destructible: false },
    { x: -15.5, z: -1, w: 6.0, h: 2.0, d: 2.2, destructible: true },
    { x: 15.5, z: -1, w: 6.0, h: 2.0, d: 2.2, destructible: true }
  ],
  // Sector 08: Ricochet Gauntlet
  [
    { x: -13, z: -5, w: 6.0, h: 2.3, d: 2.0, destructible: false },
    { x: 13, z: -5, w: 6.0, h: 2.3, d: 2.0, destructible: false },
    { x: -5, z: 1.5, w: 2.0, h: 2.3, d: 8.0, destructible: false },
    { x: 5, z: 1.5, w: 2.0, h: 2.3, d: 8.0, destructible: false },
    { x: 0, z: -6.5, w: 3.5, h: 2.0, d: 3.5, destructible: true },
    { x: -14, z: 5.5, w: 3.2, h: 2.0, d: 3.2, destructible: true },
    { x: 14, z: 5.5, w: 3.2, h: 2.0, d: 3.2, destructible: true }
  ],
  // Sector 09: Outer Fortress
  [
    { x: -10.5, z: -6.5, w: 8.0, h: 2.3, d: 2.0, destructible: false },
    { x: 10.5, z: -6.5, w: 8.0, h: 2.3, d: 2.0, destructible: false },
    { x: -10.5, z: 4.5, w: 8.0, h: 2.3, d: 2.0, destructible: false },
    { x: 10.5, z: 4.5, w: 8.0, h: 2.3, d: 2.0, destructible: false },
    { x: 0, z: -1, w: 4.5, h: 2.1, d: 4.5, destructible: true }
  ],
  // Sector 10 (FINAL BOSS - OMEGA OVERLORD)
  [
    { x: -13.5, z: -4.5, w: 2.4, h: 2.4, d: 8.5, destructible: false },
    { x: 13.5, z: -4.5, w: 2.4, h: 2.4, d: 8.5, destructible: false },
    { x: -7.5, z: 4.0, w: 3.0, h: 2.0, d: 2.2, destructible: true },
    { x: 7.5, z: 4.0, w: 3.0, h: 2.0, d: 2.2, destructible: true },
    { x: 0, z: 4.5, w: 3.0, h: 2.0, d: 2.2, destructible: true }
  ]
];

function rebuildInnerCover(sectorNum = 1) {
  for (let i = obstacles.length - 1; i >= 0; i--) {
    if (obstacles[i].isInterior) {
      scene.remove(obstacles[i].mesh);
      if (obstacles[i].trim) scene.remove(obstacles[i].trim);
      obstacles.splice(i, 1);
    }
  }

  const layout = SECTOR_LAYOUTS[(sectorNum - 1) % SECTOR_LAYOUTS.length];
  for (const b of layout) {
    const isDestructible = b.destructible !== false;
    const bodyColor = isDestructible ? 0xef7d57 : 0x3b405c;
    const trimColor = isDestructible ? 0xffcd75 : 0x38bdf8;
    createBoxObstacle(b.x, b.z, b.w, b.h, b.d, bodyColor, trimColor, isDestructible, true);
  }
}

function buildArena() {
  const floorGeo = new THREE.PlaneGeometry(ARENA_HALF_W * 2, ARENA_HALF_D * 2);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x253063, roughness: 0.85 });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.receiveShadow = true;
  scene.add(floorMesh);

  const gridHelper = new THREE.GridHelper(ARENA_HALF_W * 2, 22, 0x38b6ff, 0x1c244d);
  gridHelper.position.y = 0.02;
  scene.add(gridHelper);

  const wallH = 2.4;
  const wallT = 1.4;
  createBoxObstacle(0, -ARENA_HALF_D - wallT / 2, ARENA_HALF_W * 2 + wallT * 2, wallH, wallT, 0x3b405c, 0x38b6ff, false, false);
  createBoxObstacle(0, ARENA_HALF_D + wallT / 2, ARENA_HALF_W * 2 + wallT * 2, wallH, wallT, 0x3b405c, 0x38b6ff, false, false);
  createBoxObstacle(-ARENA_HALF_W - wallT / 2, 0, wallT, wallH, ARENA_HALF_D * 2, 0x3b405c, 0x38b6ff, false, false);
  createBoxObstacle(ARENA_HALF_W + wallT / 2, 0, wallT, wallH, ARENA_HALF_D * 2, 0x3b405c, 0x38b6ff, false, false);

  rebuildInnerCover(1);
}

buildArena();

// 3D Aim Reticle + Laser Sight Line
const reticleGroup = new THREE.Group();
const outerRing = new THREE.Mesh(
  new THREE.RingGeometry(0.55, 0.75, 24),
  new THREE.MeshBasicMaterial({ color: 0xffcd75, side: THREE.DoubleSide })
);
outerRing.rotation.x = -Math.PI / 2;
const innerDot = new THREE.Mesh(
  new THREE.CircleGeometry(0.16, 16),
  new THREE.MeshBasicMaterial({ color: 0xef7d57, side: THREE.DoubleSide })
);
innerDot.rotation.x = -Math.PI / 2;
reticleGroup.add(outerRing, innerDot);
reticleGroup.position.y = 0.06;
reticleGroup.visible = false;
scene.add(reticleGroup);

const aimLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
const aimLineMat = new THREE.LineBasicMaterial({ color: 0xffcd75, transparent: true, opacity: 0.35 });
const aimLine = new THREE.Line(aimLineGeo, aimLineMat);
aimLine.visible = false;
scene.add(aimLine);

// Raycaster
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.8);
const aimPoint = new THREE.Vector3();

// 3D Voxel Particle System & Screen Shake
const particles = [];
const particleGeo = new THREE.BoxGeometry(1, 1, 1);
let shakeIntensity = 0;

function addScreenShake(amount) {
  shakeIntensity = Math.min(1.2, shakeIntensity + amount);
}

function spawnParticles(x, y, z, color, count = 12, speed = 0.25, size = 0.24, gravity = 0.012) {
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshBasicMaterial({ color });
    const mesh = new THREE.Mesh(particleGeo, mat);
    mesh.position.set(x, y, z);
    const scale = size * (0.6 + Math.random() * 0.8);
    mesh.scale.set(scale, scale, scale);
    scene.add(mesh);

    const angle = Math.random() * Math.PI * 2;
    const spd = speed * (0.4 + Math.random() * 0.9);
    particles.push({
      mesh,
      vx: Math.cos(angle) * spd,
      vy: (0.4 + Math.random() * 0.8) * speed * 1.4,
      vz: Math.sin(angle) * spd,
      gravity,
      life: 22 + Math.floor(Math.random() * 18),
      maxLife: 40
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life--;
    p.vy -= p.gravity;
    p.mesh.position.x += p.vx;
    p.mesh.position.y += p.vy;
    p.mesh.position.z += p.vz;
    p.mesh.rotation.x += 0.15;
    p.mesh.rotation.y += 0.18;

    if (p.mesh.position.y < 0.1) {
      p.mesh.position.y = 0.1;
      p.vy *= -0.45;
      p.vx *= 0.8;
      p.vz *= 0.8;
    }

    const ratio = Math.max(0, p.life / p.maxLife);
    p.mesh.scale.multiplyScalar(0.95);

    if (p.life <= 0 || ratio <= 0.05) {
      scene.remove(p.mesh);
      particles.splice(i, 1);
    }
  }
}

// Tactical 3D Power-Up Crates
const pickups = [];
const PICKUP_TYPES = [
  { id: 'RAPID', label: 'RAPID FIRE', color: 0xf59e0b },
  { id: 'TRIPLE', label: 'TRIPLE SHOT', color: 0xef4444 },
  { id: 'SHIELD', label: 'AEGIS SHIELD', color: 0x38bdf8 },
  { id: 'REPAIR', label: 'HULL REPAIR', color: 0x10b981 }
];

function spawnPickup(x, z) {
  const spec = PICKUP_TYPES[Math.floor(Math.random() * PICKUP_TYPES.length)];
  const group = new THREE.Group();
  group.position.set(x, 0.9, z);

  const coreMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.95, 0.95),
    new THREE.MeshStandardMaterial({
      color: spec.color,
      emissive: spec.color,
      emissiveIntensity: 0.45,
      roughness: 0.25
    })
  );
  coreMesh.castShadow = true;

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 0.95, 24),
    new THREE.MeshBasicMaterial({ color: spec.color, side: THREE.DoubleSide })
  );
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = -0.85;

  group.add(coreMesh, ringMesh);
  scene.add(group);

  pickups.push({
    group,
    coreMesh,
    spec,
    x,
    z,
    bobPhase: Math.random() * Math.PI * 2,
    life: 900
  });
}

function updatePickups() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.life--;
    p.bobPhase += 0.06;
    p.coreMesh.rotation.y += 0.04;
    p.coreMesh.rotation.x += 0.02;
    p.coreMesh.position.y = Math.sin(p.bobPhase) * 0.18;

    if (player && Math.hypot(player.root.position.x - p.x, player.root.position.z - p.z) < 1.9) {
      player.applyPickup(p.spec);
      sfx.playPickup();
      spawnParticles(p.x, 1.0, p.z, p.spec.color, 14, 0.24, 0.22, 0.008);
      scene.remove(p.group);
      pickups.splice(i, 1);
      continue;
    }

    if (p.life <= 0) {
      scene.remove(p.group);
      pickups.splice(i, 1);
    }
  }
}

// Tank Class
class Tank {
  constructor(x, z, color, isPlayer = false, bossConfig = null) {
    const diff = DIFFICULTIES[currentDifficulty];
    this.isPlayer = isPlayer;
    this.bossConfig = bossConfig;
    this.baseColor = color;
    const scale = bossConfig ? bossConfig.scale : 1.0;
    this.scale = scale;
    this.radius = 1.25 * scale;
    this.hp = bossConfig ? bossConfig.hp : (isPlayer ? diff.playerHp : 50);
    this.maxHp = this.hp;
    this.speed = 0;
    this.maxSpeed = isPlayer
      ? 0.18
      : (bossConfig ? bossConfig.speed : 0.11) * diff.enemySpeedMult;
    this.hullAngle = 0;
    this.turretAngle = 0;
    this.reloadTimer = 0;
    this.reloadDuration = isPlayer
      ? 42
      : Math.max(24, Math.round((bossConfig ? bossConfig.reload : 75) * diff.enemyReloadMult));
    this.recoilOffset = 0;
    this.hitFlashTimer = 0;
    this.treadDustTimer = 0;
    this.aiTurnTimer = 0;
    this.aiTurnDir = 1;
    this.bossCycle = 0;
    this.enraged = false;

    this.root = new THREE.Group();
    this.root.position.set(x, 0, z);
    this.root.scale.set(scale, scale, scale);

    this.rapidTimer = 0;
    this.tripleTimer = 0;
    this.shieldTimer = 0;

    // Energy Shield Dome
    this.shieldMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1.85, 20, 16),
      new THREE.MeshBasicMaterial({
        color: bossConfig ? 0xa855f7 : 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      })
    );
    this.shieldMesh.position.y = 0.9;
    this.shieldMesh.visible = false;
    this.root.add(this.shieldMesh);

    // Tank Hull
    const hullGeo = new THREE.BoxGeometry(2.0, 0.85, 2.5);
    this.hullMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45 });
    const hullMesh = new THREE.Mesh(hullGeo, this.hullMat);
    hullMesh.position.y = 0.65;
    hullMesh.castShadow = true;
    hullMesh.receiveShadow = true;
    this.root.add(hullMesh);

    if (bossConfig) {
      const shoulderGeo = new THREE.BoxGeometry(2.45, 0.55, 1.9);
      const shoulderMat = new THREE.MeshStandardMaterial({
        color: bossConfig.tier === 1 ? 0xf59e0b : 0xa855f7,
        metalness: 0.5,
        roughness: 0.3
      });
      const shoulderArmor = new THREE.Mesh(shoulderGeo, shoulderMat);
      shoulderArmor.position.set(0, 0.85, -0.1);
      shoulderArmor.castShadow = true;
      this.root.add(shoulderArmor);
    }

    // Front Visuals (+Z)
    const glacisGeo = new THREE.BoxGeometry(1.75, 0.45, 0.55);
    const glacis = new THREE.Mesh(glacisGeo, new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 }));
    glacis.position.set(0, 0.58, 1.25);
    glacis.rotation.x = 0.38;
    this.root.add(glacis);

    const headlightGeo = new THREE.BoxGeometry(0.32, 0.2, 0.15);
    const headlightMat = new THREE.MeshBasicMaterial({ color: bossConfig ? 0xff4d4d : 0x73eff7 });
    const leftLight = new THREE.Mesh(headlightGeo, headlightMat);
    leftLight.position.set(-0.62, 0.65, 1.32);
    const rightLight = new THREE.Mesh(headlightGeo, headlightMat);
    rightLight.position.set(0.62, 0.65, 1.32);
    this.root.add(leftLight, rightLight);

    // Rear Visuals (-Z)
    const engineVent = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.25, 0.75),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 })
    );
    engineVent.position.set(0, 1.05, -0.75);
    this.root.add(engineVent);

    const exhaustGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.65, 8);
    const exhaustMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6 });
    const leftPipe = new THREE.Mesh(exhaustGeo, exhaustMat);
    leftPipe.position.set(-0.55, 1.05, -1.25);
    leftPipe.rotation.x = -0.3;
    const rightPipe = new THREE.Mesh(exhaustGeo, exhaustMat);
    rightPipe.position.set(0.55, 1.05, -1.25);
    rightPipe.rotation.x = -0.3;
    this.root.add(leftPipe, rightPipe);

    const tailMat = new THREE.MeshBasicMaterial({ color: 0xff3b3b });
    const leftTail = new THREE.Mesh(headlightGeo, tailMat);
    leftTail.position.set(-0.65, 0.58, -1.28);
    const rightTail = new THREE.Mesh(headlightGeo, tailMat);
    rightTail.position.set(0.65, 0.58, -1.28);
    this.root.add(leftTail, rightTail);

    // Treads
    const treadGeo = new THREE.BoxGeometry(0.45, 0.65, 2.7);
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x141622, roughness: 0.9 });
    const leftTread = new THREE.Mesh(treadGeo, treadMat);
    leftTread.position.set(-1.05, 0.35, 0);
    leftTread.castShadow = true;
    const rightTread = new THREE.Mesh(treadGeo, treadMat);
    rightTread.position.set(1.05, 0.35, 0);
    rightTread.castShadow = true;
    this.root.add(leftTread, rightTread);

    // Independent Turret Pivot
    this.turretPivot = new THREE.Group();
    this.turretPivot.position.set(0, 1.25, 0);

    const domeGeo = new THREE.BoxGeometry(1.25, 0.6, 1.35);
    const domeMat = new THREE.MeshStandardMaterial({
      color: bossConfig ? 0x1e293b : 0xf4f4f4,
      roughness: 0.35
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.castShadow = true;
    this.turretPivot.add(domeMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.8, 12);
    barrelGeo.rotateX(Math.PI / 2);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222538, roughness: 0.4 });
    this.barrelMesh = new THREE.Mesh(barrelGeo, barrelMat);
    this.barrelMesh.position.set(0, 0, 1.25);
    this.barrelMesh.castShadow = true;
    this.turretPivot.add(this.barrelMesh);

    if (bossConfig) {
      const sideBarrelGeo = new THREE.CylinderGeometry(0.1, 0.12, 1.4, 10);
      sideBarrelGeo.rotateX(Math.PI / 2);
      const leftCannon = new THREE.Mesh(sideBarrelGeo, barrelMat);
      leftCannon.position.set(-0.52, 0.05, 1.05);
      const rightCannon = new THREE.Mesh(sideBarrelGeo, barrelMat);
      rightCannon.position.set(0.52, 0.05, 1.05);
      this.turretPivot.add(leftCannon, rightCannon);
    }

    const tipGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 12);
    tipGeo.rotateX(Math.PI / 2);
    const tipMesh = new THREE.Mesh(tipGeo, new THREE.MeshStandardMaterial({ color }));
    tipMesh.position.set(0, 0, 0.85);
    this.barrelMesh.add(tipMesh);

    this.root.add(this.turretPivot);

    if (!isPlayer) {
      const barWidth = bossConfig ? 2.6 : 1.8;
      this.hpBarWidth = barWidth - 0.1;
      this.hpBarGroup = new THREE.Group();
      this.hpBarGroup.position.set(0, 2.4, 0);

      const bgMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(barWidth, 0.28),
        new THREE.MeshBasicMaterial({ color: 0x141622, side: THREE.DoubleSide })
      );
      this.hpFillMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(this.hpBarWidth, 0.18),
        new THREE.MeshBasicMaterial({ color: bossConfig ? 0xf59e0b : 0x38b764, side: THREE.DoubleSide })
      );
      this.hpFillMesh.position.z = 0.01;
      this.hpBarGroup.add(bgMesh, this.hpFillMesh);
      this.root.add(this.hpBarGroup);
    }

    scene.add(this.root);
  }

  takeDamage(amount) {
    if (this.shieldTimer > 0) {
      sfx.playShieldDeflect();
      spawnParticles(this.root.position.x, 1.2, this.root.position.z, 0x38bdf8, 10, 0.22, 0.18, 0.005);
      return;
    }

    this.hp -= amount;
    this.hitFlashTimer = 6;
    this.hullMat.emissive.setHex(0xffffff);
    this.hullMat.emissiveIntensity = 0.85;

    if (this.bossConfig && this.bossConfig.tier === 2 && !this.enraged && this.hp <= this.maxHp * 0.5 && this.hp > 0) {
      this.enraged = true;
      this.maxSpeed *= 1.35;
      this.reloadDuration = Math.max(36, Math.floor(this.reloadDuration * 0.72));
      this.shieldTimer = 180;
      sfx.playPickup();
      addScreenShake(0.5);
      spawnParticles(this.root.position.x, 1.5, this.root.position.z, 0xa855f7, 28, 0.35, 0.32, 0.01);
    }

    if (this.hpFillMesh) {
      const ratio = Math.max(0, this.hp / this.maxHp);
      this.hpFillMesh.scale.x = Math.max(0.001, ratio);
      this.hpFillMesh.position.x = -(1 - ratio) * (this.hpBarWidth / 2);
      if (!this.bossConfig) {
        this.hpFillMesh.material.color.setHex(ratio > 0.5 ? 0x38b764 : ratio > 0.25 ? 0xffcd75 : 0xff4d4d);
      }
    }
  }

  resolveObstacleCollisions() {
    const pos = this.root.position;
    for (const obs of obstacles) {
      const closestX = Math.max(obs.minX, Math.min(pos.x, obs.maxX));
      const closestZ = Math.max(obs.minZ, Math.min(pos.z, obs.maxZ));
      const dx = pos.x - closestX;
      const dz = pos.z - closestZ;
      const distSq = dx * dx + dz * dz;

      if (distSq < this.radius * this.radius) {
        const dist = Math.sqrt(distSq) || 0.001;
        const overlap = this.radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      }
    }
  }

  fire() {
    if (this.reloadTimer > 0) return;
    this.recoilOffset = 0.45;
    sfx.playShoot(this.isPlayer);

    let angles = [this.turretAngle];

    if (this.bossConfig) {
      this.bossCycle++;
      if (this.bossConfig.tier === 1) {
        this.reloadTimer = this.reloadDuration;
        angles = [this.turretAngle - 0.24, this.turretAngle, this.turretAngle + 0.24];
      } else if (this.bossConfig.tier === 2) {
        if (this.bossCycle % 3 === 0) {
          this.reloadTimer = this.reloadDuration + 15;
          angles = [
            this.turretAngle - 0.36,
            this.turretAngle - 0.18,
            this.turretAngle,
            this.turretAngle + 0.18,
            this.turretAngle + 0.36
          ];
        } else {
          this.reloadTimer = Math.floor(this.reloadDuration * 0.55);
          angles = [this.turretAngle - 0.09, this.turretAngle + 0.09];
        }
      }
    } else {
      this.reloadTimer = this.rapidTimer > 0 ? 14 : this.reloadDuration;
      if (this.tripleTimer > 0) {
        angles = [this.turretAngle - 0.22, this.turretAngle, this.turretAngle + 0.22];
      }
    }

    const muzzleDist = 2.2 * this.scale;
    for (const ang of angles) {
      const dirX = Math.sin(ang);
      const dirZ = Math.cos(ang);
      const spawnX = this.root.position.x + dirX * muzzleDist;
      const spawnZ = this.root.position.z + dirZ * muzzleDist;
      spawnShell(spawnX, spawnZ, dirX, dirZ, this);
    }

    const frontX = this.root.position.x + Math.sin(this.turretAngle) * muzzleDist;
    const frontZ = this.root.position.z + Math.cos(this.turretAngle) * muzzleDist;
    spawnParticles(frontX, 1.25 * this.scale, frontZ, 0xffcd75, 6, 0.14, 0.18 * this.scale, 0.002);
    if (this.isPlayer) addScreenShake(0.12);
  }

  update(playerTank) {
    if (this.reloadTimer > 0) this.reloadTimer--;

    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - 0.04);
      this.barrelMesh.position.z = 1.25 - this.recoilOffset;
    }

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer--;
      if (this.hitFlashTimer === 0) {
        this.hullMat.emissiveIntensity = 0;
      }
    }

    if (this.hpBarGroup) {
      this.hpBarGroup.quaternion.copy(camera.quaternion);
    }

    if (this.rapidTimer > 0) this.rapidTimer--;
    if (this.tripleTimer > 0) this.tripleTimer--;
    if (this.shieldTimer > 0) {
      this.shieldTimer--;
      this.shieldMesh.visible = true;
      this.shieldMesh.rotation.y += 0.04;
    } else {
      this.shieldMesh.visible = false;
    }
    if (this.isPlayer) {
      updateHUD();
    }

    if (this.isPlayer) {
      const forward = (keys['w'] || keys['ArrowUp'] ? 1 : 0) - (keys['s'] || keys['ArrowDown'] ? 1 : 0);
      const turn = (keys['a'] || keys['ArrowLeft'] ? 1 : 0) - (keys['d'] || keys['ArrowRight'] ? 1 : 0);

      this.hullAngle += turn * 0.045;
      this.speed = forward * this.maxSpeed;

      this.root.position.x += Math.sin(this.hullAngle) * this.speed;
      this.root.position.z += Math.cos(this.hullAngle) * this.speed;
      this.root.rotation.y = this.hullAngle;

      if (Math.abs(this.speed) > 0.05) {
        this.treadDustTimer++;
        if (this.treadDustTimer % 8 === 0) {
          const backX = this.root.position.x - Math.sin(this.hullAngle) * 1.3;
          const backZ = this.root.position.z - Math.cos(this.hullAngle) * 1.3;
          spawnParticles(backX, 0.2, backZ, 0x5d6b99, 1, 0.04, 0.16, -0.002);
        }
      }

      const dx = aimPoint.x - this.root.position.x;
      const dz = aimPoint.z - this.root.position.z;
      this.turretAngle = Math.atan2(dx, dz);
      this.turretPivot.rotation.y = this.turretAngle - this.hullAngle;

      aimLine.geometry.setFromPoints([
        new THREE.Vector3(this.root.position.x, 1.25, this.root.position.z),
        new THREE.Vector3(aimPoint.x, 0.2, aimPoint.z)
      ]);
    } else if (playerTank) {
      const dx = playerTank.root.position.x - this.root.position.x;
      const dz = playerTank.root.position.z - this.root.position.z;
      const distToPlayer = Math.hypot(dx, dz);

      if (this.bossConfig) {
        const desiredAngle = Math.atan2(dx, dz) + (distToPlayer < 13 ? 1.1 : 0.25);
        let diff = desiredAngle - this.hullAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.hullAngle += Math.sign(diff) * Math.min(Math.abs(diff), 0.025);
      } else {
        this.aiTurnTimer--;
        if (this.aiTurnTimer <= 0) {
          this.aiTurnTimer = 45 + Math.floor(Math.random() * 60);
          this.aiTurnDir = (Math.random() - 0.5) * 2;
        }
        this.hullAngle += this.aiTurnDir * 0.03;
      }

      this.root.position.x += Math.sin(this.hullAngle) * this.maxSpeed;
      this.root.position.z += Math.cos(this.hullAngle) * this.maxSpeed;
      this.root.rotation.y = this.hullAngle;

      this.turretAngle = Math.atan2(dx, dz);
      this.turretPivot.rotation.y = this.turretAngle - this.hullAngle;

      const fireRange = this.bossConfig ? 38 : 28;
      if (this.reloadTimer === 0 && distToPlayer < fireRange) {
        this.fire();
      }
    }

    this.resolveObstacleCollisions();
  }

  applyPickup(spec) {
    if (spec.id === 'REPAIR') {
      this.hp = Math.min(this.maxHp, this.hp + 35);
      updateHUD();
      return;
    }

    this.rapidTimer = 0;
    this.tripleTimer = 0;
    this.shieldTimer = 0;

    if (spec.id === 'RAPID') this.rapidTimer = 480;
    if (spec.id === 'TRIPLE') this.tripleTimer = 480;
    if (spec.id === 'SHIELD') this.shieldTimer = 480;
    updateHUD();
  }

  destroy() {
    const burstCount = this.bossConfig ? 36 : 18;
    const burstScale = this.bossConfig ? 0.45 : 0.32;
    spawnParticles(this.root.position.x, 1.0, this.root.position.z, this.baseColor, burstCount, 0.36, burstScale, 0.014);
    spawnParticles(this.root.position.x, 1.2, this.root.position.z, 0xffcd75, burstCount, 0.32, burstScale * 0.85, 0.01);
    addScreenShake(this.bossConfig ? 0.9 : 0.45);
    scene.remove(this.root);
  }
}

// Ricochet Shells
const shells = [];
const shellGeo = new THREE.SphereGeometry(0.28, 12, 12);

function spawnShell(x, z, dirX, dirZ, owner) {
  const shellColor = owner.isPlayer
    ? 0xffcd75
    : owner.bossConfig
      ? (owner.bossConfig.tier === 2 ? 0xc084fc : 0xf59e0b)
      : 0xff4d4d;
  const mat = new THREE.MeshStandardMaterial({
    color: shellColor,
    emissive: owner.isPlayer ? 0xef7d57 : shellColor,
    emissiveIntensity: 0.85
  });
  const mesh = new THREE.Mesh(shellGeo, mat);
  mesh.position.set(x, 1.25, z);
  mesh.castShadow = true;
  scene.add(mesh);

  const speedMult = owner.bossConfig && owner.bossConfig.tier === 2 ? 0.5 : 0.44;

  shells.push({
    mesh,
    color: shellColor,
    vx: dirX * speedMult,
    vz: dirZ * speedMult,
    bounces: 2,
    owner,
    graceFrames: 6,
    trailTick: 0
  });
}

function handlePlayerDestroyed() {
  lives--;
  updateHUD();

  if (lives > 0) {
    // Respawn player at south staging pad with 3-second Aegis Shield
    shells.forEach(s => scene.remove(s.mesh));
    shells.length = 0;

    player = new Tank(0, 9, 0x38b6ff, true);
    player.hullAngle = Math.PI;
    player.root.rotation.y = Math.PI;
    player.shieldTimer = 180; // 3 seconds spawn invulnerability
    player.shieldMesh.visible = true;
    updateHUD();
    beginSectorCountdown(wave, `UNIT RESPAWNED // ${lives} ${lives === 1 ? 'LIFE' : 'LIVES'} REMAINING`, 1200);
  } else {
    player = null;
    endGame('GAME OVER // ALL LIVES LOST');
  }
}

function updateShells() {
  const diff = DIFFICULTIES[currentDifficulty];
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    if (s.graceFrames > 0) s.graceFrames--;
    s.trailTick++;

    if (s.trailTick % 2 === 0) {
      spawnParticles(s.mesh.position.x, 1.25, s.mesh.position.z, s.color, 1, 0.02, 0.14, 0);
    }

    const prevX = s.mesh.position.x;
    const prevZ = s.mesh.position.z;
    s.mesh.position.x += s.vx;
    s.mesh.position.z += s.vz;

    let hitObs = null;
    for (const obs of obstacles) {
      if (
        s.mesh.position.x + 0.25 > obs.minX &&
        s.mesh.position.x - 0.25 < obs.maxX &&
        s.mesh.position.z + 0.25 > obs.minZ &&
        s.mesh.position.z - 0.25 < obs.maxZ
      ) {
        if (prevX + 0.25 <= obs.minX || prevX - 0.25 >= obs.maxX) s.vx *= -1;
        if (prevZ + 0.25 <= obs.minZ || prevZ - 0.25 >= obs.maxZ) s.vz *= -1;
        s.mesh.position.x = prevX + s.vx;
        s.mesh.position.z = prevZ + s.vz;
        hitObs = obs;
        break;
      }
    }

    if (hitObs) {
      s.bounces--;
      sfx.playRicochet();
      spawnParticles(s.mesh.position.x, 1.25, s.mesh.position.z, 0x73eff7, 8, 0.2, 0.16, 0.01);

      if (hitObs.destructible) {
        hitObs.hp--;
        if (hitObs.hp > 0) {
          const scaleRatio = 0.72 + (hitObs.hp / hitObs.maxHp) * 0.28;
          hitObs.mesh.scale.set(scaleRatio, scaleRatio, scaleRatio);
          if (hitObs.trim) hitObs.trim.scale.set(scaleRatio, 1, scaleRatio);
          spawnParticles(hitObs.x, 1.2, hitObs.z, hitObs.baseColor, 8, 0.18, 0.22, 0.012);
        } else {
          sfx.playExplosion(false);
          spawnParticles(hitObs.x, 1.2, hitObs.z, hitObs.baseColor, 20, 0.3, 0.34, 0.014);
          addScreenShake(0.25);
          scene.remove(hitObs.mesh);
          if (hitObs.trim) scene.remove(hitObs.trim);
          const obsIdx = obstacles.indexOf(hitObs);
          if (obsIdx !== -1) obstacles.splice(obsIdx, 1);
          if (Math.random() < 0.55) spawnPickup(hitObs.x, hitObs.z);
        }
      }

      if (s.bounces < 0) {
        scene.remove(s.mesh);
        shells.splice(i, 1);
        continue;
      }
    }

    const targets = player ? [player, ...enemies] : enemies;
    let hit = false;
    for (let j = targets.length - 1; j >= 0; j--) {
      const t = targets[j];
      if (t === s.owner) {
        if (!selfDamageEnabled || s.graceFrames > 0) continue;
      }
      if (!s.owner.isPlayer && !t.isPlayer) continue;

      const dist = Math.hypot(
        s.mesh.position.x - t.root.position.x,
        s.mesh.position.z - t.root.position.z
      );

      if (dist < t.radius + 0.25) {
        const dmg = s.owner.isPlayer ? 25 : diff.enemyDamage;
        t.takeDamage(dmg);
        spawnParticles(s.mesh.position.x, 1.25, s.mesh.position.z, 0xef7d57, 10, 0.22, 0.2, 0.01);
        addScreenShake(0.22);
        hit = true;

        if (t.hp <= 0) {
          sfx.playExplosion(true);
          t.destroy();
          if (t.isPlayer) {
            scene.remove(s.mesh);
            shells.splice(i, 1);
            handlePlayerDestroyed();
            return;
          } else {
            const idx = enemies.indexOf(t);
            if (idx !== -1) enemies.splice(idx, 1);
            const basePts = t.bossConfig ? (t.bossConfig.tier === 2 ? 1500 : 750) : 100;
            score += Math.round(basePts * diff.scoreMult);
            if (t.bossConfig || Math.random() < 0.45) {
              spawnPickup(t.root.position.x, t.root.position.z);
            }
          }
        } else {
          sfx.playExplosion(false);
        }
        updateHUD();
        break;
      }
    }

    if (hit) {
      scene.remove(s.mesh);
      shells.splice(i, 1);
    }
  }
}

// Game State
let onTitleScreen = true;
let titleOrbitAngle = 0;
let gameRunning = false;
let isPaused = false;
let selfDamageEnabled = false;
let sectorCountdown = 0;
let countdownEndTime = 0;
let player = null;
let enemies = [];
let wave = 1;
let score = 0;
let lives = STARTING_LIVES;
const keys = {};

function beginSectorCountdown(sectorNum, subText, durationMs = 3000) {
  sectorCountdown = Math.ceil((durationMs / 1000) * 60);
  countdownEndTime = performance.now() + durationMs;
  const banner = document.getElementById('sector-banner');
  const isBossSector = sectorNum % 5 === 0;
  document.getElementById('banner-title').textContent = isBossSector
    ? `SECTOR ${String(sectorNum).padStart(2, '0')} // BOSS`
    : `SECTOR ${String(sectorNum).padStart(2, '0')} / ${MAX_SECTORS}`;
  document.getElementById('banner-sub').textContent = subText;
  document.getElementById('banner-count').textContent = durationMs > 2000 ? '3' : 'READY';
  banner.classList.remove('hidden');
}

function updateHUD() {
  const hp = Math.max(0, player ? player.hp : 0);
  const maxHp = player ? player.maxHp : DIFFICULTIES[currentDifficulty].playerHp;
  const pct = (hp / maxHp) * 100;
  const buffEl = document.getElementById('buff-status');
  if (buffEl && player) {
    if (player.shieldTimer > 0) {
      buffEl.textContent = `SHIELD ACTIVE ${(player.shieldTimer / 60).toFixed(1)}S`;
      buffEl.style.background = '#38bdf8';
      buffEl.classList.remove('hidden');
    } else if (player.tripleTimer > 0) {
      buffEl.textContent = `TRIPLE SHOT ${(player.tripleTimer / 60).toFixed(1)}S`;
      buffEl.style.background = '#ef4444';
      buffEl.classList.remove('hidden');
    } else if (player.rapidTimer > 0) {
      buffEl.textContent = `RAPID FIRE ${(player.rapidTimer / 60).toFixed(1)}S`;
      buffEl.style.background = '#f59e0b';
      buffEl.classList.remove('hidden');
    } else {
      buffEl.classList.add('hidden');
    }
  }

  document.getElementById('hp-val').textContent = hp;
  const hpFill = document.getElementById('hp-bar-fill');
  if (hpFill) {
    hpFill.style.width = `${pct}%`;
    hpFill.style.background = pct > 50 ? '#38bdf8' : pct > 25 ? '#f59e0b' : '#ef4444';
  }

  const livesEl = document.getElementById('lives-val');
  if (livesEl) {
    livesEl.innerHTML = lives > 0 ? Array(lives).fill('&#9830;').join(' ') : 'DEPLETED';
    livesEl.style.color = lives === 1 ? '#ef4444' : '#38bdf8';
  }

  const diffBadge = document.getElementById('diff-badge');
  if (diffBadge) diffBadge.textContent = DIFFICULTIES[currentDifficulty].label;

  document.getElementById('wave-val').textContent = `${String(wave).padStart(2, '0')}/${MAX_SECTORS}`;
  const activeBoss = enemies.find(e => e.bossConfig);
  document.getElementById('enemies-val').textContent = activeBoss
    ? `${activeBoss.bossConfig.name} (${Math.max(0, activeBoss.hp)} HP)`
    : enemies.length;
  document.getElementById('score-val').textContent = String(score).padStart(4, '0');
}

function spawnWave(waveNum) {
  if (waveNum === 5) {
    enemies.push(new Tank(0, -10.5, 0xd97706, false, {
      tier: 1,
      name: 'IRON JUGGERNAUT',
      hp: 250,
      scale: 1.45,
      reload: 68,
      speed: 0.085
    }));
    enemies.push(new Tank(-16, -9, 0xff4d4d, false));
    enemies.push(new Tank(16, -9, 0xff4d4d, false));
    updateHUD();
    return;
  }

  if (waveNum === 10) {
    enemies.push(new Tank(0, -10.5, 0x6d28d9, false, {
      tier: 2,
      name: 'OMEGA OVERLORD',
      hp: 450,
      scale: 1.75,
      reload: 54,
      speed: 0.1
    }));
    const guard1 = new Tank(-16, -9, 0xef4444, false);
    const guard2 = new Tank(16, -9, 0xef4444, false);
    guard1.hp = 75;
    guard1.maxHp = 75;
    guard1.reloadDuration = Math.round(58 * DIFFICULTIES[currentDifficulty].enemyReloadMult);
    guard2.hp = 75;
    guard2.maxHp = 75;
    guard2.reloadDuration = Math.round(58 * DIFFICULTIES[currentDifficulty].enemyReloadMult);
    enemies.push(guard1, guard2);
    updateHUD();
    return;
  }

  const spawnPoints = [
    { x: -16, z: -11 },
    { x: 16, z: -11 },
    { x: -16, z: 11 },
    { x: 16, z: 11 },
    { x: 0, z: -12 },
    { x: -9, z: -12 }
  ];

  const count = Math.min(spawnPoints.length, waveNum <= 4 ? waveNum + 1 : waveNum - 2);
  const isEliteTier = waveNum >= 6;
  for (let i = 0; i < count; i++) {
    const sp = spawnPoints[i];
    const enemy = new Tank(sp.x, sp.z, isEliteTier ? 0xe11d48 : 0xff4d4d, false);
    if (isEliteTier) {
      enemy.hp = 75;
      enemy.maxHp = 75;
      enemy.maxSpeed *= 1.18;
      enemy.reloadDuration = Math.max(24, Math.round(enemy.reloadDuration * 0.78));
    }
    enemies.push(enemy);
  }
  updateHUD();
}

function clearArenaEntities() {
  if (player) {
    scene.remove(player.root);
    player = null;
  }
  enemies.forEach(e => scene.remove(e.root));
  enemies = [];
  shells.forEach(s => scene.remove(s.mesh));
  shells.length = 0;
  particles.forEach(p => scene.remove(p.mesh));
  particles.length = 0;
  pickups.forEach(p => scene.remove(p.group));
  pickups.length = 0;
}

function showMainTitleScreen() {
  gameRunning = false;
  isPaused = false;
  onTitleScreen = true;
  sectorCountdown = 0;

  clearArenaEntities();
  rebuildInnerCover(1);

  document.getElementById('hud').classList.add('hidden');
  document.getElementById('pause-overlay').classList.add('hidden');
  document.getElementById('sector-banner').classList.add('hidden');
  reticleGroup.visible = false;
  aimLine.visible = false;

  document.getElementById('overlay-sys-tag').textContent = 'SYS.ONLINE // 10-SECTOR ARMOR CAMPAIGN';
  document.getElementById('overlay-title').innerHTML = 'POLY TANK<br /><span>ARENA 3D</span>';
  document.getElementById('overlay-sub').textContent = 'CLEAR ALL 10 SECTORS • DEFEAT SECTOR 05 & 10 BOSSES • 3 LIVES';
  document.getElementById('btn-start').textContent = 'START CAMPAIGN';
  document.getElementById('btn-title-return').classList.add('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

function startGame() {
  sfx.init();
  onTitleScreen = false;
  isPaused = false;
  document.getElementById('pause-overlay').classList.add('hidden');

  clearArenaEntities();

  wave = 1;
  score = 0;
  lives = STARTING_LIVES;
  rebuildInnerCover(wave);

  player = new Tank(0, 9, 0x38b6ff, true);
  player.hullAngle = Math.PI;
  player.root.rotation.y = Math.PI;
  spawnWave(wave);
  updateHUD();

  document.getElementById('overlay').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  reticleGroup.visible = true;
  aimLine.visible = true;
  gameRunning = true;
  beginSectorCountdown(wave, `DIFFICULTY: ${DIFFICULTIES[currentDifficulty].label} // 3 LIVES`);
}

function endGame(title) {
  gameRunning = false;
  sectorCountdown = 0;
  document.getElementById('sector-banner').classList.add('hidden');
  reticleGroup.visible = false;
  aimLine.visible = false;

  document.getElementById('overlay-sys-tag').textContent = `FINAL SCORE: ${String(score).padStart(4, '0')} // ${DIFFICULTIES[currentDifficulty].label}`;
  document.getElementById('overlay-title').textContent = title;
  document.getElementById('overlay-sub').textContent = `REACHED SECTOR ${String(wave).padStart(2, '0')} OF ${MAX_SECTORS}`;
  document.getElementById('btn-start').textContent = 'PLAY AGAIN';
  document.getElementById('btn-title-return').classList.remove('hidden');
  document.getElementById('overlay').classList.remove('hidden');
}

// Difficulty Button Selection
document.querySelectorAll('.diff-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    currentDifficulty = btn.dataset.diff;
    document.querySelectorAll('.diff-btn').forEach((b) => {
      b.classList.toggle('active', b.dataset.diff === currentDifficulty);
    });
  });
});

// Input Listeners
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' && gameRunning && !isPaused && sectorCountdown <= 0 && player) {
    e.preventDefault();
    player.fire();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.key] = false;
  keys[e.key.toLowerCase()] = false;
});

window.addEventListener('mousemove', (e) => {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera);
  if (raycaster.ray.intersectPlane(aimPlane, aimPoint)) {
    reticleGroup.position.set(aimPoint.x, 0.06, aimPoint.z);
  }
});

window.addEventListener('mousedown', (e) => {
  if (e.button === 0 && gameRunning && !isPaused && sectorCountdown <= 0 && player) {
    player.fire();
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('btn-start').addEventListener('click', startGame);
document.getElementById('btn-title-return').addEventListener('click', showMainTitleScreen);

function togglePause() {
  if (!gameRunning) return;
  isPaused = !isPaused;
  document.getElementById('pause-overlay').classList.toggle('hidden', !isPaused);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
    togglePause();
  }
});

document.querySelectorAll('.btn-self-dmg').forEach((btn) => {
  btn.addEventListener('click', () => {
    selfDamageEnabled = !selfDamageEnabled;
    document.querySelectorAll('.btn-self-dmg').forEach((b) => {
      b.textContent = `SELF-DAMAGE: ${selfDamageEnabled ? 'ON' : 'OFF'}`;
      b.classList.toggle('active-warn', selfDamageEnabled);
    });
  });
});

document.querySelectorAll('.btn-mute').forEach((btn) => {
  btn.addEventListener('click', () => {
    sfx.init();
    const muted = sfx.toggleMute();
    document.querySelectorAll('.btn-mute').forEach((b) => {
      b.textContent = `AUDIO: ${muted ? 'OFF' : 'ON'}`;
      b.classList.toggle('active-warn', muted);
    });
  });
});

document.getElementById('btn-resume').addEventListener('click', () => {
  if (isPaused) togglePause();
});

document.getElementById('btn-abort').addEventListener('click', () => {
  showMainTitleScreen();
});

// Fixed-Timestep Simulation & 3D Render Loop
function stepSimulation() {
  if (isPaused) return;

  reticleGroup.rotation.y += 0.03;
  updateParticles();
  updatePickups();

  if (!gameRunning || !player) return;

  if (sectorCountdown > 0) {
    const remainingMs = countdownEndTime - performance.now();
    sectorCountdown = Math.max(0, Math.ceil((remainingMs / 1000) * 60));
    const countEl = document.getElementById('banner-count');
    if (remainingMs > 2000) countEl.textContent = '3';
    else if (remainingMs > 1000) countEl.textContent = '2';
    else if (remainingMs > 250) countEl.textContent = '1';
    else countEl.textContent = 'ENGAGE!';

    if (remainingMs <= 0) {
      sectorCountdown = 0;
      document.getElementById('sector-banner').classList.add('hidden');
    }
    return;
  }

  player.update();
  enemies.forEach(e => e.update(player));
  updateShells();

  if (gameRunning && player && enemies.length === 0) {
    if (wave >= MAX_SECTORS) {
      sfx.playPickup();
      endGame('ARENA LIBERATED! VICTORY!');
      return;
    }

    wave++;
    player.hp = player.maxHp;
    player.rapidTimer = 0;
    player.tripleTimer = 0;
    player.shieldTimer = 0;
    player.shieldMesh.visible = false;

    player.root.position.set(0, 0, 9);
    player.hullAngle = Math.PI;
    player.root.rotation.y = Math.PI;

    shells.forEach(s => scene.remove(s.mesh));
    shells.length = 0;

    pickups.forEach(p => scene.remove(p.group));
    pickups.length = 0;

    rebuildInnerCover(wave);
    spawnWave(wave);
    updateHUD();

    const bannerSub = wave === 5
      ? 'WARNING: IRON JUGGERNAUT DETECTED'
      : wave === 10
        ? 'FINAL BOSS: OMEGA OVERLORD'
        : 'HULL RESTORED TO 100%';
    beginSectorCountdown(wave, bannerSub);
  }
}

setInterval(stepSimulation, 1000 / 60);

function renderLoop() {
  requestAnimationFrame(renderLoop);

  if (onTitleScreen) {
    titleOrbitAngle += 0.004;
    camera.position.x = Math.sin(titleOrbitAngle) * 28;
    camera.position.y = 24;
    camera.position.z = Math.cos(titleOrbitAngle) * 28;
    camera.lookAt(0, 0, 0);
  } else if (gameRunning && player) {
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    shakeIntensity *= 0.86;

    camera.position.x += (player.root.position.x * 0.55 - camera.position.x) * 0.1 + shakeX;
    camera.position.y += (26 - camera.position.y) * 0.1 + shakeY;
    camera.position.z += (player.root.position.z * 0.55 + 22 - camera.position.z) * 0.1;
    camera.lookAt(player.root.position.x * 0.4, 0, player.root.position.z * 0.4);
  }

  renderer.render(scene, camera);
}

showMainTitleScreen();
renderLoop();