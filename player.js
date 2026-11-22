import * as THREE from 'three';
import { PLAYER, WORLD } from './config.js';
import { terrainHeight } from './terrain.js';

export class FirstPersonPlayer {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.position = new THREE.Vector3(0, terrainHeight(0, 0) + PLAYER.eyeHeight, 0);
    this.velocity = new THREE.Vector3();
    this.keys = new Set();
    this.yaw = Math.PI * 0.15;
    this.pitch = -0.035;
    this.grounded = true;
    this.locked = false;
    this.eyeHeight = PLAYER.eyeHeight;
    this.targetEyeHeight = PLAYER.eyeHeight;
    this.walkPhase = 0;
    this.horizontalSpeed = 0;

    camera.rotation.order = 'YXZ';
    camera.position.copy(this.position);
    this.applyRotation();

    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === domElement;
      window.dispatchEvent(new CustomEvent('player-lock-change', { detail: this.locked }));
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * PLAYER.mouseSensitivity;
      this.pitch -= e.movementY * PLAYER.mouseSensitivity;
      this.pitch = THREE.MathUtils.clamp(this.pitch, -Math.PI * 0.48, Math.PI * 0.48);
      this.applyRotation();
    });

    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (e.code === 'Space' && this.locked && this.grounded) {
        this.velocity.y = PLAYER.jumpSpeed;
        this.grounded = false;
      }
    });

    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
  }

  lock() {
    this.domElement.requestPointerLock();
  }

  applyRotation() {
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  update(dt) {
    dt = Math.min(dt, 0.04);

    const crouching = this.keys.has('ControlLeft') || this.keys.has('ControlRight');
    const sprinting = !crouching && (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'));
    this.targetEyeHeight = crouching ? PLAYER.crouchEyeHeight : PLAYER.eyeHeight;
    this.eyeHeight = THREE.MathUtils.damp(this.eyeHeight, this.targetEyeHeight, 12, dt);

    let speed = crouching ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
    const inputX = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0);
    const inputZ = (this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('KeyW') ? 1 : 0);
    const inputLen = Math.hypot(inputX, inputZ);

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wish = new THREE.Vector3();
    if (inputLen > 0) {
      wish.addScaledVector(right, inputX / inputLen);
      wish.addScaledVector(forward, -inputZ / inputLen);
    }

    const accel = this.grounded ? PLAYER.acceleration : PLAYER.airAcceleration;
    const targetVX = wish.x * speed;
    const targetVZ = wish.z * speed;
    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, targetVX, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, targetVZ, accel, dt);

    if (inputLen === 0 && this.grounded) {
      this.velocity.x = THREE.MathUtils.damp(this.velocity.x, 0, PLAYER.friction, dt);
      this.velocity.z = THREE.MathUtils.damp(this.velocity.z, 0, PLAYER.friction, dt);
    }

    this.velocity.y -= PLAYER.gravity * dt;
    this.position.addScaledVector(this.velocity, dt);

    const half = WORLD.size * 0.5 - WORLD.boundaryPadding;
    this.position.x = THREE.MathUtils.clamp(this.position.x, -half, half);
    this.position.z = THREE.MathUtils.clamp(this.position.z, -half, half);

    const ground = terrainHeight(this.position.x, this.position.z);
    const desiredY = ground + this.eyeHeight;
    if (this.position.y <= desiredY && this.velocity.y <= 0) {
      this.position.y = desiredY;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    this.horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);

    // Restrained head motion; enough to feel grounded without a nauseating camera.
    let bobX = 0;
    let bobY = 0;
    if (this.grounded && this.horizontalSpeed > 0.35) {
      const cadence = sprinting ? 11.5 : crouching ? 6.5 : 8.4;
      this.walkPhase += dt * cadence * THREE.MathUtils.clamp(this.horizontalSpeed / PLAYER.walkSpeed, 0.5, 1.7);
      const amount = sprinting ? 0.033 : crouching ? 0.012 : 0.021;
      bobY = Math.abs(Math.sin(this.walkPhase)) * amount;
      bobX = Math.sin(this.walkPhase * 0.5) * amount * 0.42;
    }

    const localRight = right;
    this.camera.position.copy(this.position).addScaledVector(localRight, bobX);
    this.camera.position.y += bobY;

    const targetFov = sprinting && this.horizontalSpeed > 4.8 ? 76 : 70;
    this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
    this.camera.updateProjectionMatrix();
  }
}
