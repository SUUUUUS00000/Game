import * as THREE from "three";

export type MannequinPart = "head" | "body" | "limb";

const BODY_COL = 0x26282e;
const HEAD_COL = 0xe9e7df;
const ACCENT_COL = 0xff8a1e;

interface PartMesh extends THREE.Mesh {
  userData: { part: MannequinPart };
}

export class Mannequin {
  group: THREE.Group;
  parts: PartMesh[] = [];
  private basePos: THREE.Vector3;
  private state: "stand" | "fall" | "down" | "hide" | "pop" = "stand";
  private stateT = 0;
  private fallTarget = new THREE.Quaternion();
  private fallStart = new THREE.Quaternion();
  private hitDir = new THREE.Vector3(0, 0, -1);
  private path: [THREE.Vector3, THREE.Vector3] | null = null;
  private phase = Math.random() * 10;
  alive = true;

  constructor(pos: THREE.Vector3, walker = false) {
    this.basePos = pos.clone();
    this.group = new THREE.Group();
    (this.group as any).__mannequin = this;
    this.group.position.copy(pos);
    this.group.rotation.y = Math.random() * Math.PI * 2;

    const bodyMat = new THREE.MeshLambertMaterial({ color: BODY_COL });
    const headMat = new THREE.MeshLambertMaterial({ color: HEAD_COL });
    const accentMat = new THREE.MeshLambertMaterial({
      color: ACCENT_COL,
      emissive: new THREE.Color(0xff5a00).multiplyScalar(0.35),
    });

    // legs
    const legGeo = new THREE.BoxGeometry(0.1, 0.44, 0.12);
    const l1 = this.makeMesh(legGeo, bodyMat, "limb", -0.09, 0.42, 0);
    const l2 = this.makeMesh(legGeo, bodyMat, "limb", 0.09, 0.42, 0);
    l1.rotation.x = 0.04;
    l2.rotation.x = -0.04;

    // torso
    const torsoGeo = new THREE.BoxGeometry(0.32, 0.48, 0.19);
    const torso = this.makeMesh(torsoGeo, bodyMat, "body", 0, 0.86, 0);

    // chest accent stripe
    const stripeGeo = new THREE.BoxGeometry(0.021, 0.26, 0.335);
    const stripe = new THREE.Mesh(stripeGeo, accentMat);
    stripe.position.set(0, 0.88, 0.075);
    this.group.add(stripe);

    // arms
    const armGeo = new THREE.BoxGeometry(0.09, 0.46, 0.1);
    const a1 = this.makeMesh(armGeo, bodyMat, "limb", -0.225, 0.9, 0);
    const a2 = this.makeMesh(armGeo, bodyMat, "limb", 0.225, 0.9, 0);
    a1.rotation.z = 0.09;
    a2.rotation.z = -0.09;

    // shoulders
    const shGeo = new THREE.BoxGeometry(0.36, 0.09, 0.2);
    this.makeMesh(shGeo, bodyMat, "body", 0, 1.12, 0);

    // head (blocky training head with visor)
    const headGeo = new THREE.BoxGeometry(0.2, 0.24, 0.21);
    const head = this.makeMesh(headGeo, headMat, "head", 0, 1.35, 0);
    const visorGeo = new THREE.BoxGeometry(0.21, 0.06, 0.02);
    const visor = new THREE.Mesh(visorGeo, bodyMat);
    visor.position.set(0, 1.34, -0.105);
    this.group.add(visor);

    // stand disc
    const discGeo = new THREE.CylinderGeometry(0.2, 0.24, 0.04, 10);
    const disc = new THREE.Mesh(discGeo, bodyMat);
    disc.position.y = 0.02;
    this.group.add(disc);

    // walkers shuffle between two points nearby
    if (walker) {
      const a = pos.clone();
      const b = pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 8, 0, (Math.random() - 0.5) * 8));
      this.path = [a, b];
    }
    void head;
    void torso;
  }

  private makeMesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    part: MannequinPart,
    x: number,
    y: number,
    z: number
  ): PartMesh {
    const m = new THREE.Mesh(geo, mat) as PartMesh;
    m.position.set(x, y, z);
    m.userData.part = part;
    m.castShadow = true;
    this.group.add(m);
    this.parts.push(m);
    return m;
  }

  hit(fromPos: THREE.Vector3) {
    if (!this.alive) return;
    this.alive = false;
    const toCenter = new THREE.Vector3()
      .subVectors(this.group.position, fromPos);
    toCenter.y = 0;
    if (toCenter.lengthSq() < 0.01) toCenter.set(0, 0, 1);
    this.hitDir.copy(toCenter).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    this.fallTarget.setFromUnitVectors(up, this.hitDir);
    const tumble = new THREE.Quaternion().setFromAxisAngle(this.hitDir, (Math.random() - 0.5) * 0.8);
    this.fallTarget.multiply(tumble);
    this.fallStart.copy(this.group.quaternion);
    this.state = "fall";
    this.stateT = 0;
  }

  respawn(pos: THREE.Vector3) {
    this.basePos.copy(pos);
    this.group.position.copy(pos);
    this.group.quaternion.set(0, 0, 0, 1);
    this.group.rotation.y = Math.random() * Math.PI * 2;
    this.group.scale.setScalar(0.01);
    this.alive = true;
    this.state = "pop";
    this.stateT = 0;
  }

  getPos() {
    return this.group.position;
  }

  update(dt: number) {
    if (this.path && this.state === "stand") {
      this.phase += dt * 0.85;
      const p = (Math.sin(this.phase) + 1) / 2;
      const a = this.path[0];
      const b = this.path[1];
      const nx = a.x + (b.x - a.x) * p;
      const nz = a.z + (b.z - a.z) * p;
      const dx = nx - this.group.position.x;
      const dz = nz - this.group.position.z;
      this.group.position.x = nx;
      this.group.position.z = nz;
      if (Math.abs(dx) + Math.abs(dz) > 0.001) {
        this.group.rotation.y = Math.atan2(dx, dz);
      }
      // gentle walk sway
      this.group.rotation.z = Math.sin(this.phase * 2) * 0.02;
      this.group.position.y = Math.abs(Math.sin(this.phase)) * 0.015;
    } else {
      this.group.rotation.z *= 1 - Math.min(1, dt * 6);
    }

    switch (this.state) {
      case "fall": {
        this.stateT += dt / 0.42;
        const t = Math.min(1, this.stateT);
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const e = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        this.group.quaternion.slerpQuaternions(this.fallStart, this.fallTarget, Math.min(1, e));
        if (t >= 1) {
          this.state = "down";
          this.stateT = 0;
        }
        break;
      }
      case "down": {
        this.stateT += dt;
        if (this.stateT > 1.0) {
          this.state = "hide";
          this.stateT = 0;
        }
        break;
      }
      case "hide": {
        this.stateT += dt / 0.35;
        const s = 1 - Math.min(1, this.stateT);
        this.group.scale.setScalar(Math.max(0.01, s));
        if (this.stateT >= 1) {
          this.state = "stand";
          this.stateT = 0;
          this.group.scale.setScalar(1);
          this.alive = true;
        }
        break;
      }
      case "pop": {
        this.stateT += dt / 0.28;
        const t = Math.min(1, this.stateT);
        const c1 = 1.70158;
        const c3 = c1 + 1;
        const e = 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
        this.group.scale.setScalar(Math.max(0.01, e));
        if (t >= 1) {
          this.state = "stand";
          this.stateT = 0;
          this.group.scale.setScalar(1);
        }
        break;
      }
      default:
        break;
    }
  }
}
