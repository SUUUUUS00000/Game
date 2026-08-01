import * as THREE from "three";

const SPARK_VERT = /* glsl */ `
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vColor = aColor;
  vAlpha = aAlpha;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * (260.0 / max(1.0, -mv.z));
  gl_Position = projectionMatrix * mv;
}`;

const SPARK_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  float a = smoothstep(0.5, 0.08, d) * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor, a);
}`;

interface Particle {
  alive: boolean;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
  size0: number;
  grow: number;
}

/** GPU point-sprite particle pool with per-particle size/color/alpha. */
class ParticleSystem {
  private geo: THREE.BufferGeometry;
  private points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private parts: Particle[] = [];
  private cursor = 0;
  private count: number;

  constructor(count: number, blending: THREE.Blending, color: number, size: number) {
    this.count = count;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(count * 3);
    this.col = new Float32Array(count * 3);
    this.size = new Float32Array(count);
    this.alpha = new Float32Array(count);
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
      this.parts.push({
        alive: false,
        life: 0,
        maxLife: 1,
        vel: new THREE.Vector3(),
        size0: size,
        grow: 0,
      });
    }
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("aColor", new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("aSize", new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("aAlpha", new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      vertexShader: SPARK_VERT,
      fragmentShader: SPARK_FRAG,
      transparent: true,
      depthWrite: false,
      blending,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.points);
  }

  spawn(
    p: THREE.Vector3,
    vel: THREE.Vector3,
    life: number,
    size: number,
    color: THREE.Color,
    grow = 0
  ) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.count;
    const pt = this.parts[i];
    pt.alive = true;
    pt.life = life;
    pt.maxLife = life;
    pt.vel.copy(vel);
    pt.size0 = size;
    pt.grow = grow;
    this.pos[i * 3] = p.x;
    this.pos[i * 3 + 1] = p.y;
    this.pos[i * 3 + 2] = p.z;
    this.col[i * 3] = color.r;
    this.col[i * 3 + 1] = color.g;
    this.col[i * 3 + 2] = color.b;
    this.size[i] = size;
    this.alpha[i] = 1;
  }

  update(dt: number) {
    let anyAlive = false;
    for (let i = 0; i < this.count; i++) {
      const pt = this.parts[i];
      if (!pt.alive) {
        this.alpha[i] = 0;
        continue;
      }
      anyAlive = true;
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.alive = false;
        this.alpha[i] = 0;
        continue;
      }
      const t = 1 - pt.life / pt.maxLife;
      pt.vel.y -= 9.8 * dt * 0.7;
      this.pos[i * 3] += pt.vel.x * dt;
      this.pos[i * 3 + 1] += pt.vel.y * dt;
      this.pos[i * 3 + 2] += pt.vel.z * dt;
      this.size[i] = pt.size0 * (1 + t * pt.grow);
      this.alpha[i] = 1 - t;
    }
    if (anyAlive) {
      (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
      (this.geo.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose() {
    this.geo.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

interface Tracer {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
}

const TRACER_GEO = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
TRACER_GEO.rotateX(Math.PI / 2);

class TracerPool {
  private tracers: Tracer[] = [];
  private cursor = 0;

  constructor(private scene: THREE.Scene, n: number) {
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffd9a0,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(TRACER_GEO, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      scene.add(mesh);
      this.tracers.push({ mesh, life: 0, maxLife: 1 });
    }
  }

  fire(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const t = this.tracers[this.cursor];
    this.cursor = (this.cursor + 1) % this.tracers.length;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    if (len < 0.1) return;
    dir.normalize();
    t.mesh.visible = true;
    t.mesh.position.copy(from).addScaledVector(dir, len / 2);
    t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    t.mesh.scale.set(0.009, 0.009, len);
    (t.mesh.material as THREE.MeshBasicMaterial).color.setHex(color);
    (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
    t.life = 0.07;
    t.maxLife = 0.07;
  }

  update(dt: number) {
    for (const t of this.tracers) {
      if (!t.mesh.visible) continue;
      t.life -= dt;
      if (t.life <= 0) {
        t.mesh.visible = false;
        continue;
      }
      (t.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (t.life / t.maxLife);
    }
  }

  dispose() {
    for (const t of this.tracers) {
      this.scene.remove(t.mesh);
      (t.mesh.material as THREE.Material).dispose();
    }
  }
}

interface Shell {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  spin: THREE.Vector3;
  life: number;
  alive: boolean;
}

const SHELL_GEO = new THREE.BoxGeometry(0.012, 0.012, 0.045);
class ShellPool {
  private shells: Shell[] = [];

  constructor(private scene: THREE.Scene, n: number, color: number) {
    const mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.85,
      roughness: 0.35,
    });
    for (let i = 0; i < n; i++) {
      const mesh = new THREE.Mesh(SHELL_GEO, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.shells.push({ mesh, vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 0, alive: false });
    }
  }

  eject(pos: THREE.Vector3, right: THREE.Vector3) {
    const s = this.shells.find((x) => !x.alive);
    if (!s) return;
    s.alive = true;
    s.mesh.visible = true;
    s.mesh.position.copy(pos);
    s.vel
      .copy(right)
      .multiplyScalar(1.1 + Math.random() * 0.5)
      .add(new THREE.Vector3(0, 2.1 + Math.random() * 0.6, 0))
      .addScaledVector(new THREE.Vector3(0, 0, -1), 0.15);
    s.spin.set(Math.random() * 12, Math.random() * 12, Math.random() * 12);
    s.life = 1.4;
  }

  update(dt: number) {
    for (const s of this.shells) {
      if (!s.alive) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.alive = false;
        s.mesh.visible = false;
        continue;
      }
      s.vel.y -= 9.8 * dt;
      s.mesh.position.addScaledVector(s.vel, dt);
      s.mesh.rotation.x += s.spin.x * dt;
      s.mesh.rotation.y += s.spin.y * dt;
      s.mesh.rotation.z += s.spin.z * dt;
      if (s.mesh.position.y < 0.025 && s.vel.y < 0) {
        s.mesh.position.y = 0.025;
        s.vel.y *= -0.3;
        s.vel.x *= 0.6;
        s.vel.z *= 0.6;
        s.spin.multiplyScalar(0.4);
      }
    }
  }

  dispose() {
    for (const s of this.shells) {
      this.scene.remove(s.mesh);
      s.mesh.geometry.dispose();
      (s.mesh.material as THREE.Material).dispose();
    }
  }
}

interface FloatText {
  sprite: THREE.Sprite;
  life: number;
  maxLife: number;
  vy: number;
}

function makeTextTexture(text: string, color: string, sub: string | null) {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 96;
  const ctx = cv.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 96);
  ctx.textAlign = "center";
  ctx.font = "700 44px 'Chakra Petch', 'Rajdhani', sans-serif";
  ctx.lineWidth = 8;
  ctx.strokeStyle = "rgba(10,8,4,0.9)";
  ctx.strokeText(text, 128, sub ? 44 : 58);
  ctx.fillStyle = color;
  ctx.fillText(text, 128, sub ? 44 : 58);
  if (sub) {
    ctx.font = "600 24px 'Chakra Petch', sans-serif";
    ctx.strokeText(sub, 128, 80);
    ctx.fillStyle = "#ffe9c4";
    ctx.fillText(sub, 128, 80);
  }
  return new THREE.CanvasTexture(cv);
}

class FloatTextPool {
  private items: FloatText[] = [];
  private cursor = 0;

  constructor(private scene: THREE.Scene, n: number) {
    for (let i = 0; i < n; i++) {
      const tex = makeTextTexture("+100", "#fff", null);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(1.1, 0.41, 1);
      sprite.visible = false;
      scene.add(sprite);
      this.items.push({ sprite, life: 0, maxLife: 1, vy: 0 });
    }
  }

  pop(pos: THREE.Vector3, text: string, color: string, sub: string | null = null) {
    const it = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % this.items.length;
    const mat = it.sprite.material as THREE.SpriteMaterial;
    if (mat.map) mat.map.dispose();
    mat.map = makeTextTexture(text, color, sub);
    mat.opacity = 1;
    mat.rotation = (Math.random() - 0.5) * 0.08;
    it.sprite.visible = true;
    it.sprite.position.copy(pos).add(new THREE.Vector3(0, 0.35, 0));
    it.sprite.scale.set(1.0, 0.375, 1);
    it.life = 0.85;
    it.maxLife = 0.85;
    it.vy = 1.3;
  }

  update(dt: number) {
    for (const it of this.items) {
      if (!it.sprite.visible) continue;
      it.life -= dt;
      if (it.life <= 0) {
        it.sprite.visible = false;
        continue;
      }
      const t = 1 - it.life / it.maxLife;
      it.sprite.position.y += it.vy * dt;
      it.vy *= 1 - 1.4 * dt;
      const mat = it.sprite.material as THREE.SpriteMaterial;
      mat.opacity = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.6) / 0.4);
      const s = t < 0.15 ? 0.6 + (t / 0.15) * 0.4 : 1;
      it.sprite.scale.set(1.0 * s, 0.375 * s, 1);
    }
  }

  dispose() {
    for (const it of this.items) {
      this.scene.remove(it.sprite);
      (it.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (it.sprite.material as THREE.SpriteMaterial).dispose();
    }
  }
}

/** Muzzle flash sprite + light. */
class MuzzleFlash {
  private sprites: THREE.Sprite[] = [];
  private cursor = 0;
  private light: THREE.PointLight;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    const cv = document.createElement("canvas");
    cv.width = 64;
    cv.height = 64;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, "rgba(255,255,230,1)");
    g.addColorStop(0.25, "rgba(255,200,90,0.95)");
    g.addColorStop(0.6, "rgba(255,120,20,0.4)");
    g.addColorStop(1, "rgba(255,80,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        opacity: 0,
      });
      const sp = new THREE.Sprite(mat);
      sp.visible = false;
      scene.add(sp);
      this.sprites.push(sp);
    }
    this.light = new THREE.PointLight(0xffc073, 0, 7, 1.8);
    this.light.position.set(0.25, -0.16, -0.62);
    camera.add(this.light);
  }

  fire(pos: THREE.Vector3, dir: THREE.Vector3) {
    const sp = this.sprites[this.cursor];
    this.cursor = (this.cursor + 1) % this.sprites.length;
    sp.visible = true;
    sp.position.copy(pos).addScaledVector(dir, 0.12);
    sp.material.rotation = Math.random() * Math.PI * 2;
    sp.scale.setScalar(0.22 + Math.random() * 0.14);
    (sp.material as THREE.SpriteMaterial).opacity = 1;
    this.light.intensity = 26 + Math.random() * 18;
  }

  update(dt: number) {
    for (const sp of this.sprites) {
      if (!sp.visible) continue;
      const m = sp.material as THREE.SpriteMaterial;
      m.opacity -= dt * 22;
      if (m.opacity <= 0) sp.visible = false;
    }
    this.light.intensity *= Math.exp(-dt * 34);
  }
}

export class Effects {
  sparks: ParticleSystem;
  dust: ParticleSystem;
  smoke: ParticleSystem;
  private tracers: TracerPool;
  private shells: ShellPool;
  private texts: FloatTextPool;
  private muzzle: MuzzleFlash;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.sparks = new ParticleSystem(220, THREE.AdditiveBlending, 0xffb35c, 0.05);
    this.dust = new ParticleSystem(160, THREE.NormalBlending, 0xd9b98a, 0.16);
    this.smoke = new ParticleSystem(80, THREE.NormalBlending, 0xcfc8ba, 0.2);
    this.sparks.addTo(scene);
    this.dust.addTo(scene);
    this.smoke.addTo(scene);
    this.tracers = new TracerPool(scene, 14);
    this.shells = new ShellPool(scene, 14, 0xd9a441);
    this.texts = new FloatTextPool(scene, 10);
    this.muzzle = new MuzzleFlash(scene, camera);
  }

  impact(pos: THREE.Vector3, normal: THREE.Vector3, hard: boolean) {
    const n = normal ?? new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < (hard ? 9 : 5); i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 3.2,
        Math.random() * 2.6,
        (Math.random() - 0.5) * 3.2
      )
        .addScaledVector(n, 1.6)
        .multiplyScalar(1.2);
      this.sparks.spawn(
        pos,
        v,
        0.25 + Math.random() * 0.25,
        0.035 + Math.random() * 0.03,
        new THREE.Color(0xffc27a)
      );
    }
    for (let i = 0; i < 6; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2.4,
        Math.random() * 1.6,
        (Math.random() - 0.5) * 2.4
      );
      this.dust.spawn(pos, v, 0.5 + Math.random() * 0.4, 0.1 + Math.random() * 0.1, new THREE.Color(0xd2b183), 1.6);
    }
  }

  headshotBurst(pos: THREE.Vector3) {
    for (let i = 0; i < 16; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4,
        (Math.random() - 0.5) * 5
      );
      this.sparks.spawn(
        pos,
        v,
        0.3 + Math.random() * 0.3,
        0.04 + Math.random() * 0.04,
        new THREE.Color(Math.random() > 0.5 ? 0xffd24a : 0xfff3b0)
      );
    }
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      this.dust.spawn(pos, v, 0.4, 0.12, new THREE.Color(0xcfc4ae), 1.4);
    }
  }

  muzzleFlash(pos: THREE.Vector3, dir: THREE.Vector3, weapon: number) {
    this.muzzle.fire(pos, dir);
    for (let i = 0; i < 3; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 1.4,
        (Math.random() - 0.5) * 1.4,
        -1.4 - Math.random() * 0.8
      );
      this.smoke.spawn(pos.clone().addScaledVector(dir, 0.1), v, 0.35 + Math.random() * 0.2, 0.12, new THREE.Color(0xcfc8ba), 2.2);
    }
    void weapon;
  }

  tracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    this.tracers.fire(from, to, color);
  }

  shell(pos: THREE.Vector3, right: THREE.Vector3) {
    this.shells.eject(pos, right);
  }

  text(pos: THREE.Vector3, str: string, color: string, sub: string | null = null) {
    this.texts.pop(pos, str, color, sub);
  }

  dustPuff(pos: THREE.Vector3, scale = 1) {
    for (let i = 0; i < 5; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        0.6 + Math.random(),
        (Math.random() - 0.5) * 2
      );
      this.dust.spawn(pos, v, 0.5 + Math.random() * 0.3, 0.14 * scale, new THREE.Color(0xd2b183), 1.8);
    }
  }

  update(dt: number) {
    this.sparks.update(dt);
    this.dust.update(dt);
    this.smoke.update(dt);
    this.tracers.update(dt);
    this.shells.update(dt);
    this.texts.update(dt);
    this.muzzle.update(dt);
  }

  dispose() {
    this.sparks.dispose();
    this.dust.dispose();
    this.smoke.dispose();
    this.tracers.dispose();
    this.shells.dispose();
    this.texts.dispose();
  }
}
