import * as THREE from "three";
import type { WeaponDef } from "./weapons";

/**
 * First-person weapon model + hands rig attached to the camera.
 * Handles recoil kick, reload dip, AWP bolt, walk bob and mouse sway.
 */
export class WeaponRig {
  group: THREE.Group;
  private gun: THREE.Group = new THREE.Group();
  private muzzleObj: THREE.Object3D;
  private shellObj: THREE.Object3D;
  private leftHand: THREE.Group;
  private rightHand: THREE.Group;
  private gunMat = {
    metal: new THREE.MeshStandardMaterial({ color: 0x2e3138, metalness: 0.75, roughness: 0.35 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1c1e23, metalness: 0.5, roughness: 0.5 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x7a4f26, metalness: 0.1, roughness: 0.7 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xc98d68, roughness: 0.85 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x3a3f47, roughness: 0.8 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xff8a1e, metalness: 0.4, roughness: 0.4 }),
  };
  private kick = 0;
  private reloadT = -1;
  private reloadDur = 1;
  private boltT = 0;
  private switchT = 0;
  private bobPhase = 0;
  private swayX = 0;
  private swayY = 0;
  private geos: THREE.BufferGeometry[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.position.set(0, -0.19, -0.42);
    this.muzzleObj = new THREE.Object3D();
    this.shellObj = new THREE.Object3D();
    this.leftHand = new THREE.Group();
    this.rightHand = new THREE.Group();
    this.gun.add(this.muzzleObj, this.shellObj, this.leftHand, this.rightHand);
    this.group.add(this.gun);
  }

  setWeapon(def: WeaponDef) {
    // dispose old
    for (const g of this.geos) g.dispose();
    this.geos = [];
    for (const c of [...this.gun.children]) {
      if (c !== this.muzzleObj && c !== this.shellObj && c !== this.leftHand && c !== this.rightHand) {
        this.gun.remove(c);
      }
    }
    this.clearHands();
    this.buildGun(def);
    this.switchT = 0.01;
  }

  private clearHands() {
    for (const c of [...this.leftHand.children]) this.leftHand.remove(c);
    for (const c of [...this.rightHand.children]) this.rightHand.remove(c);
  }

  private geo(g: THREE.BufferGeometry) {
    this.geos.push(g);
    return g;
  }

  private box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(this.geo(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  }

  private cyl(r: number, h: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D, rx = 0, rz = 0) {
    const m = new THREE.Mesh(this.geo(new THREE.CylinderGeometry(r, r, h, 10)), mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, 0, rz);
    parent.add(m);
    return m;
  }

  private addFinger(parent: THREE.Object3D, x: number, y: number, z: number, len: number, rx: number) {
    this.box(0.016, len, 0.018, this.gunMat.skin, x, y - len / 2, z, parent, rx);
  }

  private buildHands() {
    // RIGHT hand (trigger grip)
    const rp = new THREE.Group();
    rp.position.set(0, -0.02, 0);
    this.box(0.052, 0.07, 0.09, this.gunMat.glove, 0, -0.03, -0.005, rp);
    for (let i = 0; i < 4; i++) {
      this.addFinger(rp, -0.02 + i * 0.013, -0.045, 0.005 + (i % 2) * 0.004, 0.052, 0.5);
    }
    this.box(0.024, 0.06, 0.02, this.gunMat.skin, 0.028, -0.05, -0.012, rp, 0, 0, 0.5);
    this.rightHand.add(rp);

    // LEFT hand (support)
    const lp = new THREE.Group();
    this.box(0.05, 0.065, 0.085, this.gunMat.glove, 0, -0.02, 0, lp);
    for (let i = 0; i < 4; i++) {
      this.addFinger(lp, -0.019 + i * 0.013, -0.04, 0.005, 0.046, -0.4);
    }
    this.box(0.022, 0.055, 0.02, this.gunMat.skin, -0.027, -0.045, -0.01, lp, 0, 0, -0.4);
    this.leftHand.add(lp);
  }

  private buildGun(def: WeaponDef) {
    const M = this.gunMat;
    if (def.id === "glock") {
      // slide
      this.box(0.034, 0.036, 0.2, M.dark, 0, 0, 0, this.gun);
      // slide top serrations
      this.box(0.036, 0.012, 0.06, M.metal, 0, 0.024, 0.02, this.gun);
      // barrel tip
      this.cyl(0.009, 0.03, M.metal, 0, -0.004, -0.115, this.gun, Math.PI / 2);
      // frame
      this.box(0.03, 0.028, 0.13, M.metal, 0, -0.018, 0.01, this.gun);
      // grip
      this.box(0.032, 0.1, 0.045, M.dark, 0, -0.085, 0.045, this.gun, 0.22);
      // trigger guard
      this.box(0.026, 0.012, 0.05, M.metal, 0, -0.042, 0.03, this.gun, 0, 0, 0.3);
      // sight nubs
      this.box(0.008, 0.012, 0.012, M.metal, 0, 0.026, -0.09, this.gun);
      this.box(0.008, 0.012, 0.012, M.metal, 0, 0.026, 0.09, this.gun);
      this.muzzleObj.position.set(0, 0, -0.135);
      this.shellObj.position.set(0.022, 0.012, 0.02);
      // hands
      this.rightHand.position.set(0, -0.045, 0.06);
      this.rightHand.rotation.x = -0.3;
      this.leftHand.position.set(0, -0.02, -0.03);
      this.leftHand.rotation.x = -0.35;
      this.gun.scale.setScalar(1.25);
      this.buildHands();
    } else if (def.id === "ak") {
      // receiver
      this.box(0.055, 0.062, 0.3, M.metal, 0, 0.01, -0.02, this.gun);
      // top rail
      this.box(0.035, 0.02, 0.22, M.dark, 0, 0.052, -0.03, this.gun);
      // barrel
      this.cyl(0.012, 0.36, M.metal, 0, 0.01, -0.36, this.gun, Math.PI / 2);
      // gas tube
      this.cyl(0.014, 0.24, M.dark, 0, 0.048, -0.22, this.gun, Math.PI / 2);
      // wood handguard
      this.box(0.052, 0.05, 0.22, M.wood, 0, -0.008, -0.2, this.gun);
      // mag (angled)
      this.box(0.045, 0.2, 0.075, M.wood, 0, -0.1, 0.0, this.gun, 0.18);
      // stock
      this.box(0.05, 0.1, 0.22, M.wood, 0, 0.0, 0.22, this.gun, -0.06);
      // pistol grip
      this.box(0.045, 0.1, 0.05, M.dark, 0, -0.085, 0.07, this.gun, 0.35);
      // sights
      this.box(0.01, 0.02, 0.02, M.metal, 0, 0.075, -0.14, this.gun);
      this.box(0.02, 0.02, 0.02, M.metal, 0, 0.075, 0.1, this.gun);
      // muzzle brake
      this.cyl(0.017, 0.07, M.dark, 0, 0.01, -0.53, this.gun, Math.PI / 2);
      this.muzzleObj.position.set(0, 0.01, -0.57);
      this.shellObj.position.set(0.035, 0.045, -0.02);
      this.rightHand.position.set(0.008, -0.075, 0.1);
      this.rightHand.rotation.x = -0.4;
      this.leftHand.position.set(-0.005, -0.015, -0.22);
      this.leftHand.rotation.x = -0.2;
      this.gun.scale.setScalar(0.95);
      this.buildHands();
    } else {
      // AWP
      // receiver
      this.box(0.05, 0.06, 0.3, M.metal, 0, 0.02, -0.02, this.gun);
      // barrel
      this.cyl(0.014, 0.62, M.metal, 0, 0.01, -0.42, this.gun, Math.PI / 2);
      // barrel shroud
      this.cyl(0.022, 0.3, M.dark, 0, 0.01, -0.42, this.gun, Math.PI / 2);
      // scope
      this.cyl(0.03, 0.24, M.dark, 0, 0.085, 0.0, this.gun, Math.PI / 2);
      this.cyl(0.034, 0.06, M.metal, 0, 0.085, -0.02, this.gun, Math.PI / 2);
      this.cyl(0.034, 0.06, M.metal, 0, 0.085, 0.02, this.gun, Math.PI / 2);
      // scope lens
      this.cyl(0.022, 0.02, M.accent, 0, 0.085, -0.13, this.gun, Math.PI / 2);
      // stock
      this.box(0.05, 0.11, 0.3, M.wood, 0, -0.01, 0.24, this.gun, -0.05);
      // cheek pad
      this.box(0.04, 0.03, 0.18, M.dark, 0, 0.045, 0.22, this.gun);
      // grip
      this.box(0.045, 0.09, 0.05, M.dark, 0, -0.08, 0.08, this.gun, 0.3);
      // bolt handle
      this.box(0.012, 0.07, 0.07, M.metal, 0.04, 0.055, -0.1, this.gun, 0, 0, Math.PI / 2);
      // bipod folded
      this.box(0.03, 0.06, 0.03, M.dark, 0, -0.05, -0.28, this.gun);
      this.muzzleObj.position.set(0, 0.01, -0.74);
      this.shellObj.position.set(0.03, 0.05, 0.05);
      this.rightHand.position.set(0.005, -0.07, 0.1);
      this.rightHand.rotation.x = -0.35;
      this.leftHand.position.set(-0.004, -0.01, -0.3);
      this.leftHand.rotation.x = -0.25;
      this.gun.scale.setScalar(0.85);
      this.buildHands();
    }
  }

  getMuzzleWorld(out: THREE.Vector3) {
    this.muzzleObj.getWorldPosition(out);
    return out;
  }

  getShellWorld(out: THREE.Vector3) {
    this.shellObj.getWorldPosition(out);
    return out;
  }

  fire() {
    this.kick = 1;
  }

  startReload(dur: number) {
    this.reloadT = 0;
    this.reloadDur = dur;
  }

  pumpBolt() {
    this.boltT = 0.01;
  }

  get isReloading() {
    return this.reloadT >= 0;
  }

  update(dt: number, opts: {
    moving: boolean;
    speed: number; // 0..1
    moveX: number;
    lookVelX: number;
    lookVelY: number;
    time: number;
  }) {
    // recoil kick spring
    this.kick = Math.max(0, this.kick - dt * 7);
    const k = this.kick;

    // bob
    if (opts.moving && opts.speed > 0.05) {
      this.bobPhase += dt * (6 + opts.speed * 6);
    }
    const bob = opts.moving ? Math.sin(this.bobPhase) : 0;
    const bobAmp = 0.011 + opts.speed * 0.008;

    // sway toward mouse velocity
    this.swayX += (opts.lookVelX * 0.02 - this.swayX) * Math.min(1, dt * 9);
    this.swayY += (opts.lookVelY * 0.02 - this.swayY) * Math.min(1, dt * 9);

    // base transform
    const idle = Math.sin(opts.time * 1.7) * 0.0016;
    this.group.position.set(
      0.205 + this.swayX + bob * bobAmp * 0.35 + opts.moveX * 0.008,
      -0.19 + this.swayY + Math.abs(bob) * bobAmp * 0.8 + idle + k * 0.004,
      -0.42 + k * 0.028
    );
    this.group.rotation.set(
      k * 0.075 + this.swayY * 0.35 + Math.sin(opts.time * 1.7) * 0.0012,
      -this.swayX * 0.3 + k * 0.02 + opts.moveX * 0.012,
      k * 0.05 + this.swayX * 0.12
    );

    // gun-local kick (rotation on gun group)
    this.gun.rotation.x = k * 0.12;
    this.gun.position.z = -k * 0.015;

    // reload animation
    if (this.reloadT >= 0) {
      this.reloadT += dt / this.reloadDur;
      const t = this.reloadT;
      if (t >= 1) {
        this.reloadT = -1;
      } else {
        const dip = Math.sin(Math.min(1, t) * Math.PI) * 0.55;
        this.gun.rotation.x = k * 0.12 - dip * 0.55;
        this.gun.position.y = -dip * 0.075;
        this.gun.rotation.z = dip * 0.18;
        // left hand slides to mag
        this.leftHand.position.y = -0.03 - dip * 0.05;
        this.leftHand.position.x = 0.01 + dip * 0.02;
      }
    }

    // AWP bolt
    if (this.boltT > 0) {
      this.boltT += dt / 0.3;
      const bt = Math.min(1, this.boltT);
      const pull = Math.sin(bt * Math.PI);
      this.gun.rotation.y = pull * 0.22;
      this.gun.position.x = pull * 0.012;
      if (bt >= 1) this.boltT = 0;
    }

    // weapon switch dip
    if (this.switchT > 0) {
      this.switchT += dt / 0.22;
      if (this.switchT >= 1) this.switchT = 0;
      const s = Math.sin(Math.min(1, this.switchT) * Math.PI);
      this.group.position.y = -0.19 - s * 0.12;
      this.group.rotation.x = s * 0.4;
    }
  }

  dispose() {
    for (const g of this.geos) g.dispose();
    for (const key of Object.keys(this.gunMat) as (keyof typeof this.gunMat)[]) {
      this.gunMat[key].dispose();
    }
  }
}
