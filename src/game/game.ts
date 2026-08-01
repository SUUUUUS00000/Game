import * as THREE from "three";
import { Input } from "./input";
import { Sfx } from "./audio";
import { Effects } from "./effects";
import { Mannequin } from "./mannequin";
import { WeaponRig } from "./weaponrig";
import { buildWorld, type AABB } from "./world";
import { WEAPON_MAP, type WeaponDef, type WeaponId } from "./weapons";

export interface HudState {
  score: number;
  kills: number;
  headshots: number;
  timeLeft: number;
  mag: number;
  reserve: number;
  reloading: boolean;
  reloadProgress: number;
  weapon: WeaponId;
  combo: number;
  comboMult: number;
  comboT: number; // 0..1 fraction of combo window remaining
  bestCombo: number;
  spreadNorm: number; // 0..1 crosshair spread
  muted: boolean;
}

export interface RoundStats {
  score: number;
  kills: number;
  headshots: number;
  accuracy: number; // 0-100
  bestCombo: number;
  weapon: WeaponId;
}

export type GameEvent =
  | { type: "hud"; hud: HudState }
  | { type: "hitmarker"; head: boolean }
  | { type: "banner"; text: string; sub?: string; gold?: boolean }
  | { type: "gameover"; stats: RoundStats }
  | { type: "pause"; paused: boolean };

type EventsCb = (e: GameEvent) => void;

const ROUND_TIME = 75;
const COMBO_WINDOW = 2.5;
const EYE = 1.6;
const PLAYER_R = 0.38;
const BODY_SCORE = 100;
const HEAD_SCORE = 250;

interface SpawnPoint {
  x: number;
  y: number;
  z: number;
  walker: boolean;
}

const SPAWNS: SpawnPoint[] = [
  { x: 0, y: 0, z: 6, walker: false },
  { x: 7, y: 0, z: -8, walker: true },
  { x: -7, y: 0, z: -8, walker: false },
  { x: 11, y: 0, z: 2, walker: false },
  { x: -11, y: 0, z: 2, walker: true },
  { x: 5, y: 0, z: 12, walker: false },
  { x: -5, y: 0, z: 12, walker: false },
  { x: 16, y: 0, z: 10, walker: false },
  { x: -16, y: 0, z: 10, walker: false },
  { x: 2, y: 0, z: -14, walker: true },
  { x: -2, y: 0, z: -14, walker: false },
  { x: 10, y: 0, z: -14, walker: false },
  { x: -10, y: 0, z: -14, walker: false },
  { x: 0.4, y: 1.5, z: 2.6, walker: false }, // on crate
  { x: -4.4, y: 1.1, z: 3.2, walker: false }, // on crate
  { x: 4.6, y: 1.1, z: 3.1, walker: false }, // on crate
];

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private input: Input;
  private sfx = new Sfx();
  private effects: Effects;
  private rig = new WeaponRig();
  private world: ReturnType<typeof buildWorld>;
  private mannequins: Mannequin[] = [];
  private hittables: THREE.Mesh[] = [];
  private raf = 0;
  private clock = new THREE.Clock();
  private paused = false;
  private mode: "menu" | "playing" | "over" = "menu";

  // player state
  private pos = new THREE.Vector3(0, EYE, 13);
  private yaw = 0;
  private pitch = 0;
  private moveIn = { x: 0, z: 0 };
  private moveSmooth = { x: 0, z: 0 };
  private lookVel = { x: 0, y: 0 };

  // weapon state
  private weaponId: WeaponId = "ak";
  private mags: Record<WeaponId, { mag: number; reserve: number }> = {
    glock: { mag: 20, reserve: 120 },
    ak: { mag: 30, reserve: 120 },
    awp: { mag: 5, reserve: 20 },
  };
  private cooldown = 0;
  private boltTimer = 0;
  private bloom = 0;
  private reloading = false;
  private reloadT = 0;
  private reloadDur = 1;
  private reloadDelay = 0;
  private firing = false;

  // feedback
  private trauma = 0;
  private viewPunch = 0;
  private fov = 74;

  // round state
  private timeLeft = ROUND_TIME;
  private score = 0;
  private kills = 0;
  private headshots = 0;
  private shots = 0;
  private hits = 0;
  private combo = 0;
  private comboT = 0;
  private bestCombo = 0;
  private lastTickSec = -1;
  private hudAccum = 0;
  private menuT = 0;
  private bobPhase = 0;

  private tmpV = new THREE.Vector3();
  private tmpV2 = new THREE.Vector3();
  private ray = new THREE.Raycaster();
  private colliders: AABB[] = [];

  constructor(
    private container: HTMLElement,
    private emit: EventsCb
  ) {
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isTouch,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.75 : 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(74, container.clientWidth / container.clientHeight, 0.05, 600);
    this.camera.rotation.order = "YXZ";
    this.camera.position.copy(this.pos);
    this.scene.add(this.camera);

    this.world = buildWorld(this.scene);
    this.colliders = this.world.colliders;
    this.effects = new Effects(this.scene, this.camera);

    // mannequins
    const shuffled = shuffle([...SPAWNS]);
    for (let i = 0; i < 12; i++) {
      const s = shuffled[i % shuffled.length];
      const m = new Mannequin(new THREE.Vector3(s.x, s.y, s.z), s.walker);
      this.scene.add(m.group);
      this.mannequins.push(m);
      this.hittables.push(...m.parts);
    }

    // weapon rig
    this.rig.group.position.set(0.205, -0.19, -0.42);
    this.camera.add(this.rig.group);
    this.rig.setWeapon(WEAPON_MAP[this.weaponId]);

    // input
    this.input = new Input(
      {
        onLook: (dx, dy) => this.applyLook(dx, dy),
        onMove: (x, z) => {
          this.moveIn.x = x;
          this.moveIn.z = z;
        },
        onFire: (down) => {
          this.firing = down;
        },
        onReload: () => this.reload(),
        onSwitch: (w) => this.switchWeapon(w),
        onPause: () => this.togglePause(),
      },
      this.renderer.domElement
    );

    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVis);
    document.addEventListener("pointerlockchange", this.onLockChange);

    this.sfx.windStart();
    this.loop();
  }

  // ---------------------------------------------------------- public API

  beginRound(weapon: WeaponId) {
    this.sfx.unlock();
    this.weaponId = weapon;
    this.mags = {
      glock: { mag: 20, reserve: 120 },
      ak: { mag: 30, reserve: 120 },
      awp: { mag: 5, reserve: 20 },
    };
    this.rig.setWeapon(WEAPON_MAP[weapon]);
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shots = 0;
    this.hits = 0;
    this.combo = 0;
    this.comboT = 0;
    this.bestCombo = 0;
    this.timeLeft = ROUND_TIME;
    this.lastTickSec = -1;
    this.reloading = false;
    this.bloom = 0;
    this.cooldown = 0;
    this.boltTimer = 0;
    this.trauma = 0;
    this.viewPunch = 0;
    this.pos.set(0, EYE, 13);
    this.yaw = 0;
    this.pitch = 0;
    this.moveIn = { x: 0, z: 0 };
    this.moveSmooth = { x: 0, z: 0 };
    this.mode = "playing";
    this.paused = false;
    this.firing = false;

    const shuffled = shuffle([...SPAWNS]);
    this.mannequins.forEach((m, i) => {
      const s = shuffled[i % shuffled.length];
      m.respawn(new THREE.Vector3(s.x, s.y, s.z));
    });
    this.effects.dustPuff(new THREE.Vector3(0, 0.1, 12), 1.4);

    this.emitHud();
    this.sfx.roundStart();
    this.input.requestLock();
  }

  toMenu() {
    this.mode = "menu";
    this.paused = false;
    this.firing = false;
    this.input.unlock();
  }

  togglePause() {
    if (this.mode !== "playing") return;
    // debounce: ESC exits pointer lock AND delivers a keydown → avoid double-toggle
    const now = performance.now();
    if (now - this.lastPauseT < 260) return;
    this.lastPauseT = now;
    this.paused = !this.paused;
    this.emit({ type: "pause", paused: this.paused });
    if (this.paused) this.input.unlock();
    else this.input.requestLock();
  }

  setPaused(p: boolean) {
    if (this.mode !== "playing" || this.paused === p) return;
    this.togglePause();
  }

  setFiring(down: boolean) {
    this.firing = down;
  }

  reload() {
    if (this.mode !== "playing" || this.reloading) return;
    const ws = this.mags[this.weaponId];
    const def = WEAPON_MAP[this.weaponId];
    if (ws.mag >= def.magSize || ws.reserve <= 0) return;
    this.reloading = true;
    this.reloadT = 0;
    this.reloadDur = def.reloadTime;
    this.rig.startReload(def.reloadTime);
    this.sfx.reloadStart();
    this.emitHud();
  }

  switchWeapon(id: WeaponId) {
    if (this.mode !== "playing" || id === this.weaponId) return;
    this.weaponId = id;
    this.rig.setWeapon(WEAPON_MAP[id]);
    this.bloom = 0;
    this.reloading = false;
    this.boltTimer = 0;
    this.cooldown = Math.max(this.cooldown, 0.12);
    this.sfx.switchWeapon();
    this.emitHud();
  }

  cycleWeapon() {
    const order: WeaponId[] = ["glock", "ak", "awp"];
    const i = order.indexOf(this.weaponId);
    this.switchWeapon(order[(i + 1) % order.length]);
  }

  setMuted(m: boolean) {
    this.sfx.setMuted(m);
    this.emitHud();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVis);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    this.input.destroy();
    this.sfx.windStop();
    this.scene.traverse((obj) => {
      const m = obj as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = (m as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // ---------------------------------------------------------- events

  private emitHud() {
    const ws = this.mags[this.weaponId];
    const hud: HudState = {
      score: this.score,
      kills: this.kills,
      headshots: this.headshots,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      mag: ws.mag,
      reserve: ws.reserve,
      reloading: this.reloading,
      reloadProgress: this.reloading ? Math.min(1, this.reloadT) : 0,
      weapon: this.weaponId,
      combo: this.combo,
      comboMult: Math.min(5, this.combo),
      comboT: this.comboT > 0 ? Math.max(0, Math.min(1, this.comboT / COMBO_WINDOW)) : 0,
      bestCombo: this.bestCombo,
      spreadNorm: Math.min(1, (this.bloom + WEAPON_MAP[this.weaponId].baseSpread) / 0.04),
      muted: this.sfx.isMuted(),
    };
    this.emit({ type: "hud", hud });
  }

  private applyLook(dx: number, dy: number) {
    if (this.mode !== "playing" || this.paused) return;
    this.yaw -= dx * 0.0021;
    this.pitch -= dy * 0.0021;
    this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch));
    this.lookVel.x = dx;
    this.lookVel.y = dy;
  }

  // ---------------------------------------------------------- loop

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (!this.paused) {
      if (this.mode === "menu") this.updateMenu(dt);
      else if (this.mode === "playing") this.updatePlaying(dt);
      else this.updateAmbient(dt);
      this.updateWorldAmbient(dt);
      this.effects.update(dt);
      this.renderer.render(this.scene, this.camera);
    }
  };

  private updateMenu(dt: number) {
    this.menuT += dt;
    const r = 12.5;
    const a = this.menuT * 0.14;
    this.camera.position.set(Math.sin(a) * r, 3.6 + Math.sin(this.menuT * 0.3) * 0.5, Math.cos(a) * r);
    this.camera.lookAt(0, 1.4, 0);
    for (const m of this.mannequins) m.update(dt);
  }

  private updateAmbient(dt: number) {
    for (const m of this.mannequins) m.update(dt);
    void dt;
  }

  private updateWorldAmbient(dt: number) {
    for (const c of this.world.clouds) {
      c.position.x += dt * (0.6 + (c.scale.x / 90) * 0.8);
      if (c.position.x > 220) c.position.x = -220;
    }
  }

  private updatePlaying(dt: number) {
    // ---- timer
    this.timeLeft -= dt;
    const sec = Math.max(0, Math.ceil(this.timeLeft));
    if (sec !== this.lastTickSec) {
      this.lastTickSec = sec;
      if (sec <= 5 && sec > 0) (sec % 2 === 0 ? this.sfx.tickLow() : this.sfx.tickHigh());
      this.emitHud();
    }
    if (this.timeLeft <= 0) {
      this.mode = "over";
      this.firing = false;
      this.input.unlock();
      this.sfx.gameOver();
      const stats: RoundStats = {
        score: this.score,
        kills: this.kills,
        headshots: this.headshots,
        accuracy: this.shots > 0 ? Math.round((this.hits / this.shots) * 100) : 0,
        bestCombo: this.bestCombo,
        weapon: this.weaponId,
      };
      this.emit({ type: "gameover", stats });
      return;
    }

    // ---- combo timer
    if (this.comboT > 0) {
      this.comboT -= dt;
      if (this.comboT <= 0) {
        this.combo = 0;
        this.emitHud();
      }
    }

    // ---- movement
    const sprint = this.input.getSprint() ? 5.6 : 2.3;
    const targetX = this.moveIn.x * sprint;
    const targetZ = this.moveIn.z * sprint;
    this.moveSmooth.x += (targetX - this.moveSmooth.x) * Math.min(1, dt * 11);
    this.moveSmooth.z += (targetZ - this.moveSmooth.z) * Math.min(1, dt * 11);
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // world velocity = right * strafe + forward * walk
    this.pos.x += (cos * this.moveSmooth.x - sin * this.moveSmooth.z) * dt;
    this.pos.z += (-sin * this.moveSmooth.x - cos * this.moveSmooth.z) * dt;
    this.pos.x = Math.max(-27.5, Math.min(27.5, this.pos.x));
    this.pos.z = Math.max(-20.5, Math.min(20.5, this.pos.z));
    this.collideWalls();

    const speed = Math.hypot(this.moveSmooth.x, this.moveSmooth.z);
    const moving = speed > 0.3;

    // walk bob + footsteps
    if (moving) this.bobPhase += dt * (5.5 + speed * 0.9);
    const prevBob = Math.sin(this.bobPhase - (5.5 + speed * 0.9) * dt);
    const curBob = Math.sin(this.bobPhase);
    if (prevBob > 0 && curBob <= 0 && speed > 1.2) this.sfx.foot();

    // ---- camera
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    const sh = this.trauma * this.trauma;
    const roll = (Math.random() - 0.5) * sh * 0.06;
    const jit = (Math.random() - 0.5) * sh * 0.03;
    this.viewPunch *= Math.exp(-dt * 9);
    this.camera.rotation.set(
      this.pitch + this.viewPunch + jit,
      this.yaw,
      roll - this.moveSmooth.x * 0.006
    );
    this.camera.position.set(this.pos.x, this.pos.y + Math.abs(Math.sin(this.bobPhase)) * 0.028 * Math.min(1, speed * 0.25), this.pos.z);

    // fov recovery
    this.fov += (74 - this.fov) * Math.min(1, dt * 9);
    if (Math.abs(this.camera.fov - this.fov) > 0.02) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    // ---- weapon rig
    this.lookVel.x *= Math.exp(-dt * 12);
    this.lookVel.y *= Math.exp(-dt * 12);
    this.rig.update(dt, {
      moving,
      speed: speed / sprint,
      moveX: this.moveSmooth.x,
      lookVelX: this.lookVel.x,
      lookVelY: this.lookVel.y,
      time: this.clock.elapsedTime,
    });

    // ---- reload logic
    if (this.reloading) {
      this.reloadT += dt / this.reloadDur;
      if (this.reloadT >= 0.55 && this.reloadT - dt / this.reloadDur < 0.55) this.sfx.reloadEnd();
      if (this.reloadT >= 1) {
        this.reloading = false;
        const ws = this.mags[this.weaponId];
        const def = WEAPON_MAP[this.weaponId];
        const need = def.magSize - ws.mag;
        const take = Math.min(need, ws.reserve);
        ws.mag += take;
        ws.reserve -= take;
        this.emitHud();
      }
    } else if (this.mags[this.weaponId].mag === 0 && this.mags[this.weaponId].reserve > 0) {
      this.reloadDelay += dt;
      if (this.reloadDelay > 0.45) {
        this.reloadDelay = 0;
        this.reload();
      }
    } else {
      this.reloadDelay = 0;
    }

    // ---- shooting
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.boltTimer = Math.max(0, this.boltTimer - dt);
    if (this.boltTimer === 0 && this.prevBolt > 0) {
      this.sfx.bolt();
    }
    this.prevBolt = this.boltTimer;
    if (!this.reloading) this.bloom *= Math.exp(-dt * 3);

    const def = WEAPON_MAP[this.weaponId];
    const wantFire = this.firing && (def.auto || true);
    if (wantFire && this.cooldown <= 0 && this.boltTimer <= 0 && !this.reloading) {
      const ws = this.mags[this.weaponId];
      if (ws.mag <= 0) {
        this.sfx.dryFire();
        this.cooldown = 0.25;
        this.firing = false;
      } else {
        this.fire(def);
      }
    }

    // ---- mannequins
    for (const m of this.mannequins) m.update(dt);

    // ---- hud cadence
    this.hudAccum += dt;
    if (this.hudAccum > 0.1) {
      this.hudAccum = 0;
      this.emitHud();
    }
  }

  private prevBolt = 0;
  private lastPauseT = 0;

  private fire(def: WeaponDef) {
    const ws = this.mags[this.weaponId];
    ws.mag--;
    this.shots++;
    this.cooldown = 60 / def.rpm;
    if (def.boltTime > 0) {
      this.boltTimer = def.boltTime;
      this.rig.pumpBolt();
    }
    this.bloom = Math.min(def.maxBloom, this.bloom + def.bloomPerShot);
    const spread = def.baseSpread + this.bloom + (Math.hypot(this.moveSmooth.x, this.moveSmooth.z) > 0.6 ? def.moveSpread : 0);

    this.scene.updateMatrixWorld();
    const dir = this.camera.getWorldDirection(this.tmpV).clone();
    dir.x += (Math.random() - 0.5) * 2 * spread;
    dir.y += (Math.random() - 0.5) * 2 * spread;
    dir.z += (Math.random() - 0.5) * 2 * spread;
    dir.normalize();

    const origin = this.camera.getWorldPosition(this.tmpV2);
    this.ray.set(origin, dir);
    this.ray.far = 150;
    const all = [...this.hittables, ...this.world.impactMeshes];
    const hits = this.ray.intersectObjects(all, false);

    // find first valid target
    let target: THREE.Mesh | null = null;
    let point = new THREE.Vector3();
    let normal = new THREE.Vector3(0, 1, 0);
    for (const h of hits) {
      const mesh = h.object as THREE.Mesh;
      const owner = (mesh.parent as any)?.__mannequin as Mannequin | undefined;
      if (this.hittables.includes(mesh)) {
        if (owner && owner.alive) {
          target = mesh;
          point = h.point;
          normal = h.face ? h.face.normal.clone().transformDirection(mesh.matrixWorld) : normal;
          break;
        }
        continue;
      }
      // world impact
      point = h.point;
      normal = h.face ? h.face.normal.clone().transformDirection(mesh.matrixWorld) : normal;
      break;
    }

    // ---- feedback: recoil, shake, effects, sound
    this.viewPunch += def.recoilPitch;
    this.yaw += (Math.random() - 0.5) * def.recoilYaw * 2;
    this.trauma = Math.min(1, this.trauma + def.shake);
    this.fov = Math.min(90, this.fov + def.fovPunch);
    this.rig.fire();
    this.sfx.shot(def);

    // muzzle
    const muzzlePos = this.rig.getMuzzleWorld(this.tmpV).clone();
    this.effects.muzzleFlash(muzzlePos, dir, def.id === "awp" ? 2 : 1);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const shellPos = this.rig.getShellWorld(this.tmpV2).clone();
    this.effects.shell(shellPos, right);

    // tracer
    const end = target ? point : origin.clone().addScaledVector(dir, 60);
    this.effects.tracer(muzzlePos, end, def.tracerColor);

    if (target) {
      const man = (target.parent as any)?.__mannequin as Mannequin;
      this.onTargetHit(target, point, normal, man);
    } else {
      this.effects.impact(point, normal, false);
    }
    this.emitHud();
  }

  private onTargetHit(mesh: THREE.Mesh, point: THREE.Vector3, normal: THREE.Vector3, man: Mannequin) {
    this.hits++;
    const isHead = mesh.userData.part === "head";

    // combo
    this.combo = this.comboT > 0 ? this.combo + 1 : 1;
    this.comboT = COMBO_WINDOW;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const mult = Math.min(5, this.combo);
    const base = isHead ? HEAD_SCORE : BODY_SCORE;
    const gained = base * mult;

    this.score += gained;
    this.kills++;
    if (isHead) this.headshots++;

    man.hit(this.camera.getWorldPosition(this.tmpV));
    this.effects.impact(point, normal, true);
    if (isHead) this.effects.headshotBurst(point);
    this.effects.dustPuff(man.getPos().clone().setY(0.05), 0.7);

    this.effects.text(
      point,
      `+${gained}`,
      isHead ? "#ffb35c" : "#ffffff",
      mult > 1 ? `COMBO ×${mult}` : isHead ? "HEADSHOT" : null
    );
    this.sfx.bodyHit();
    if (isHead) {
      this.sfx.headshot();
      this.emit({ type: "banner", text: "HEADSHOT", sub: `+${gained}`, gold: true });
    }
    if (mult >= 2 && (this.combo === mult)) {
      this.sfx.combo(mult);
      if (mult > 2) this.emit({ type: "banner", text: `COMBO ×${mult}`, sub: "keep chaining!", gold: false });
    }
    this.emit({ type: "hitmarker", head: isHead });
    this.emitHud();
  }

  private collideWalls() {
    const r = PLAYER_R;
    for (const b of this.colliders) {
      if (this.pos.x > b.minX - r && this.pos.x < b.maxX + r && this.pos.z > b.minZ - r && this.pos.z < b.maxZ + r) {
        const dx1 = this.pos.x - (b.maxX + r);
        const dx2 = b.minX - r - this.pos.x;
        const dz1 = this.pos.z - (b.maxZ + r);
        const dz2 = b.minZ - r - this.pos.z;
        const m = Math.min(dx1, dx2, dz1, dz2);
        if (m === dx1) this.pos.x = b.maxX + r;
        else if (m === dx2) this.pos.x = b.minX - r;
        else if (m === dz1) this.pos.z = b.maxZ + r;
        else this.pos.z = b.minZ - r;
      }
    }
  }

  private onResize = () => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onVis = () => {
    if (document.hidden && this.mode === "playing" && !this.paused) this.togglePause();
  };

  private hadLock = false;
  private onLockChange = () => {
    if (document.pointerLockElement === this.renderer.domElement) {
      this.hadLock = true;
      return;
    }
    // if pointer lock was lost unexpectedly mid-round (e.g. ESC) → pause
    if (this.hadLock && this.mode === "playing" && !this.paused) {
      this.hadLock = false;
      this.togglePause();
    }
  };
}
