export const WORLD = {
  seed: 1486,
  size: 1500,
  segments: 280,
  boundaryPadding: 18,
  fogNear: 155,
  fogFar: 900,
  grassCount: 30000,
  grassRadius: 120,
  grassRefreshDistance: 18,
  rockCount: 360,
};

export const PLAYER = {
  eyeHeight: 1.68,
  crouchEyeHeight: 1.12,
  walkSpeed: 4.25,
  sprintSpeed: 7.2,
  crouchSpeed: 2.25,
  acceleration: 13,
  airAcceleration: 3.2,
  friction: 10,
  gravity: 22,
  jumpSpeed: 7.0,
  mouseSensitivity: 0.0020,
};

export const ASSETS = {
  // Realistic, rigged CC0 human base. We add a deel-like coat, belt and steppe hat in code.
  mongolBase: 'https://cdn.3dassets.dev/assets/32901/v1/model.glb',

  // Realistic CC0 horse studies. Multiple poses keep a quiet herd from looking cloned.
  horseStandingBay: 'https://cdn.3dassets.dev/assets/29169/v1/model.glb',
  horseGrazingBay: 'https://cdn.3dassets.dev/assets/29170/v1/model.glb',
  horseGrazingChestnut: 'https://cdn.3dassets.dev/assets/29179/v1/model.glb',
  horseTrottingBay: 'https://cdn.3dassets.dev/assets/29168/v1/model.glb',
  horseTrottingGrey: 'https://cdn.3dassets.dev/assets/29178/v1/model.glb',

  // Local PNG textures so the sky/sun work instantly without extra setup.
  steppeGround: './assets/steppe_ground.png',
  grassBlade: './assets/grass_blade.png',
  skyPanorama: './assets/sky_panorama.png',
  sunGlow: './assets/sun_glow.png',
};
