import * as THREE from "three";

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldData {
  colliders: AABB[];
  impactMeshes: THREE.Mesh[];
  clouds: THREE.Sprite[];
  sunDir: THREE.Vector3;
}

function makeSandTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#d9b98a";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.random();
    ctx.fillStyle = v > 0.5 ? `rgba(190,150,100,${(v - 0.5) * 0.4})` : `rgba(240,214,170,${(0.5 - v) * 0.35})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // dark patches
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 8 + Math.random() * 26;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(170,130,80,0.12)");
    g.addColorStop(1, "rgba(170,130,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(22, 22);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePlasterTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#cbb28e";
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(150,120,85,0.18)" : "rgba(240,225,200,0.16)";
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 3, 3);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWoodTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#8a6a3f";
  ctx.fillRect(0, 0, 128, 128);
  // planks
  for (let i = 0; i < 4; i++) {
    const y = i * 32;
    ctx.fillStyle = i % 2 ? "rgba(120,88,48,0.35)" : "rgba(160,124,74,0.3)";
    ctx.fillRect(0, y + 2, 128, 28);
    ctx.fillStyle = "rgba(70,50,25,0.6)";
    ctx.fillRect(0, y, 128, 2);
  }
  // grain
  for (let i = 0; i < 220; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(90,62,30,0.25)" : "rgba(180,140,90,0.2)";
    ctx.fillRect(Math.random() * 128, Math.random() * 128, 1.5, 8 + Math.random() * 16);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCloudTexture(): THREE.CanvasTexture {
  const cv = document.createElement("canvas");
  cv.width = 128;
  cv.height = 64;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 32, 4, 64, 32, 58);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.5, "rgba(255,255,255,0.32)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 64);
  // puffs
  for (let i = 0; i < 5; i++) {
    const x = 20 + i * 20 + Math.random() * 8;
    const y = 26 + Math.random() * 14;
    const r = 12 + Math.random() * 10;
    const g2 = ctx.createRadialGradient(x, y, 2, x, y, r);
    g2.addColorStop(0, "rgba(255,255,255,0.5)");
    g2.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g2;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildWorld(scene: THREE.Scene): WorldData {
  const colliders: AABB[] = [];
  const impactMeshes: THREE.Mesh[] = [];
  const clouds: THREE.Sprite[] = [];

  // ---- sky ----
  const skyGeo = new THREE.SphereGeometry(420, 24, 14);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2f6cb3) },
      horizonColor: { value: new THREE.Color(0xf2d9a8) },
      sunColor: { value: new THREE.Color(0xffe6b0) },
      sunDir: { value: new THREE.Vector3(0.42, 0.32, 0.32).normalize() },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos);
        float h = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(h, 0.5));
        float sunAmt = pow(max(dot(d, sunDir), 0.0), 6.0);
        float sunCore = pow(max(dot(d, sunDir), 0.0), 700.0);
        col += sunColor * sunAmt * 0.32 + sunColor * sunCore * 1.4;
        // warm haze near horizon
        float haze = smoothstep(0.0, 0.12, h);
        col = mix(horizonColor * 1.05, col, haze);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -10;
  sky.frustumCulled = false;
  scene.add(sky);

  // sun disc sprite
  const sunCv = document.createElement("canvas");
  sunCv.width = 64;
  sunCv.height = 64;
  const sctx = sunCv.getContext("2d")!;
  const sg = sctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  sg.addColorStop(0, "rgba(255,248,225,1)");
  sg.addColorStop(0.25, "rgba(255,232,170,0.9)");
  sg.addColorStop(1, "rgba(255,220,140,0)");
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 64, 64);
  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(sunCv),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  const sunDir = (skyMat.uniforms.sunDir.value as THREE.Vector3).clone().multiplyScalar(360);
  sunSprite.position.copy(sunDir);
  sunSprite.scale.setScalar(70);
  scene.add(sunSprite);

  // clouds
  const cloudTex = makeCloudTexture();
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.5 + Math.random() * 0.3,
        depthWrite: false,
        fog: false,
      })
    );
    sp.position.set((Math.random() - 0.5) * 300, 55 + Math.random() * 45, (Math.random() - 0.5) * 300);
    const s = 40 + Math.random() * 60;
    sp.scale.set(s, s * 0.5, 1);
    scene.add(sp);
    clouds.push(sp);
  }

  // ---- fog ----
  scene.fog = new THREE.Fog(0xf2d9a8, 70, 300);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0xcfe4ff, 0xd8b48a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe0b0, 2.1);
  sun.position.set(36, 42, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -34;
  sun.shadow.camera.right = 34;
  sun.shadow.camera.top = 34;
  sun.shadow.camera.bottom = -34;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffb98a, 0.35);
  fill.position.set(-30, 20, -20);
  scene.add(fill);

  // ---- ground ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(420, 420),
    new THREE.MeshLambertMaterial({ map: makeSandTexture() })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const sand = new THREE.MeshLambertMaterial({ color: 0xcaa878 });

  // ---- perimeter walls (dust-like plaster) ----
  const plaster = new THREE.MeshLambertMaterial({ map: makePlasterTexture() });
  const wallDefs: [number, number, number, number, number][] = [
    // x, z, w, d, h
    [0, -22, 58, 1.4, 3.4],
    [0, 22, 58, 1.4, 3.4],
    [-29, 0, 1.4, 44, 3.4],
    [29, 0, 1.4, 44, 3.4],
  ];
  for (const [x, z, w, d, h] of wallDefs) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), plaster);
    wall.position.set(x, h / 2, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    impactMeshes.push(wall);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
  }

  // ---- cover layout ----
  const wood = new THREE.MeshLambertMaterial({ map: makeWoodTexture() });
  const metal = new THREE.MeshLambertMaterial({ color: 0x5c6355 });
  const darkMetal = new THREE.MeshLambertMaterial({ color: 0x3c4147 });

  const crate = (x: number, z: number, s: number, ry = 0) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), wood);
    c.position.set(x, s / 2, z);
    c.rotation.y = ry;
    c.castShadow = true;
    c.receiveShadow = true;
    scene.add(c);
    impactMeshes.push(c);
    const h = s / 2;
    colliders.push({ minX: x - h, maxX: x + h, minZ: z - h, maxZ: z + h });
  };

  const lowWall = (x: number, z: number, w: number, ry = 0) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 1.25, 0.55), plaster);
    c.position.set(x, 0.625, z);
    c.rotation.y = ry;
    c.castShadow = true;
    c.receiveShadow = true;
    scene.add(c);
    impactMeshes.push(c);
    const hw = w / 2;
    const hd = 0.275;
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  };

  const barrel = (x: number, z: number) => {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 12), metal);
    b.position.set(x, 0.5, z);
    b.castShadow = true;
    scene.add(b);
    impactMeshes.push(b);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.05, 12), darkMetal);
    top.position.set(x, 1.02, z);
    scene.add(top);
    impactMeshes.push(top);
    colliders.push({ minX: x - 0.32, maxX: x + 0.32, minZ: z - 0.32, maxZ: z + 0.32 });
  };

  const sandbag = (x: number, z: number, w: number, ry = 0) => {
    const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.65, 0.6), sand);
    c.position.set(x, 0.325, z);
    c.rotation.y = ry;
    c.castShadow = true;
    scene.add(c);
    impactMeshes.push(c);
    const hw = w / 2;
    colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - 0.3, maxZ: z + 0.3 });
  };

  // center stage
  crate(0, -1, 1.5);
  crate(0, 1.9, 1.5);
  crate(-4.5, 2.4, 1.1, 0.5);
  crate(4.5, 2.4, 1.1, -0.4);
  crate(-7.2, -2.6, 1.7);
  crate(7.2, -2.6, 1.7);

  // low walls
  lowWall(-12, 6.5, 6);
  lowWall(12, 6.5, 6);
  lowWall(-15, -8, 5, 0.5);
  lowWall(15, -8, 5, -0.5);
  lowWall(-19, 12, 4.5, 0.2);
  lowWall(19, 12, 4.5, -0.2);

  // barrels
  barrel(-10.5, 10.5);
  barrel(-8.8, 10.5);
  barrel(10.5, 10.5);
  barrel(12.2, 10.5);
  barrel(-2.5, 14.5);
  barrel(2.5, 14.5);
  barrel(-11, -13, );
  barrel(11, -13);

  // sandbags near walls
  sandbag(-22, 16, 3.6);
  sandbag(22, 16, 3.6);
  sandbag(-24, -14, 3.2, 0.4);
  sandbag(24, -14, 3.2, -0.4);

  // stacked crates near corners (climbable look, tall cover)
  crate(-25.5, 18, 1.2);
  crate(-24.3, 18, 1.2);
  crate(25.5, 18, 1.2);
  crate(24.3, 18, 1.2);

  // ---- dunes / mesas around ----
  const duneMat = new THREE.MeshLambertMaterial({ color: 0xd2ad7e });
  const mesaMat = new THREE.MeshLambertMaterial({ color: 0x8f5f45 });
  const rockMat = new THREE.MeshLambertMaterial({ color: 0xa89a84 });

  const dune = (x: number, z: number, w: number, h: number, ry: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.5), duneMat);
    m.position.set(x, h * 0.42, z);
    m.rotation.y = ry;
    m.rotation.z = 0.03;
    scene.add(m);
  };
  const mesa = (x: number, z: number, w: number, h: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.7), mesaMat);
    m.position.set(x, h / 2, z);
    m.rotation.y = Math.random() * 3;
    scene.add(m);
  };
  const cactus = (x: number, z: number, s: number) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * s, 0.18 * s, 1.6 * s, 7), cactusMat);
    body.position.y = 0.8 * s;
    g.add(body);
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.7 * s, 6), cactusMat);
    arm1.position.set(0.22 * s, 1.05 * s, 0);
    arm1.rotation.z = 0.5;
    g.add(arm1);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 0.55 * s, 6), cactusMat);
    arm2.position.set(-0.2 * s, 0.95 * s, 0);
    arm2.rotation.z = -0.45;
    g.add(arm2);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * 3;
    scene.add(g);
  };
  const cactusMat = new THREE.MeshLambertMaterial({ color: 0x4c7a45 });

  dune(-45, -30, 26, 5, 0.4);
  dune(52, -40, 30, 6, -0.3);
  dune(60, 30, 24, 5, 0.8);
  dune(-60, 40, 30, 6, -0.5);
  dune(0, 55, 40, 7, 0);
  dune(0, -60, 44, 7, 0.2);

  mesa(-120, -90, 60, 34);
  mesa(130, -100, 70, 42);
  mesa(-140, 80, 55, 30);
  mesa(120, 110, 65, 38);
  mesa(-40, 130, 45, 26);

  for (let i = 0; i < 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 42 + Math.random() * 60;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8 + Math.random() * 1.8), rockMat);
    rock.position.set(Math.cos(a) * r, 0.4, Math.sin(a) * r);
    rock.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    scene.add(rock);
  }

  cactus(-18, -17, 1.2);
  cactus(19, -16, 0.9);
  cactus(-20, 4, 1.1);
  cactus(17, 6, 1.0);
  cactus(-5, -18, 1.3);
  cactus(8, 17, 1.1);

  // dust drift particle field (ambient)
  const dustCount = 90;
  const dPos = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 70;
    dPos[i * 3 + 1] = 0.4 + Math.random() * 4;
    dPos[i * 3 + 2] = (Math.random() - 0.5) * 55;
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dPos, 3));
  const dustField = new THREE.Points(
    dGeo,
    new THREE.PointsMaterial({
      color: 0xe8d5b0,
      size: 0.05,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    })
  );
  dustField.frustumCulled = false;
  scene.add(dustField);
  // gentle drift in game loop via userData
  (dustField as any).userData = { dustDrift: 0 };

  return { colliders, impactMeshes, clouds, sunDir: skyMat.uniforms.sunDir.value as THREE.Vector3 };
}
