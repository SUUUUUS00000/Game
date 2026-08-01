export type WeaponId = "glock" | "ak" | "awp";

export interface WeaponDef {
  id: WeaponId;
  name: string;
  short: string;
  rpm: number;
  magSize: number;
  reserve: number;
  reloadTime: number;
  auto: boolean;
  baseSpread: number;
  bloomPerShot: number;
  maxBloom: number;
  moveSpread: number;
  recoilPitch: number;
  recoilYaw: number;
  kick: number; // weapon model kick
  shake: number; // screen trauma
  fovPunch: number;
  damage: number;
  headMult: number;
  boltTime: number; // seconds forced between shots (awp bolt)
  tracerColor: number;
  shellColor: number;
  firePitch: number; // audio base pitch
  fireDecay: number;
}

export const WEAPONS: WeaponDef[] = [
  {
    id: "glock",
    name: "Glock-18",
    short: "GLOCK",
    rpm: 420,
    magSize: 20,
    reserve: 120,
    reloadTime: 1.5,
    auto: false,
    baseSpread: 0.008,
    bloomPerShot: 0.0022,
    maxBloom: 0.022,
    moveSpread: 0.016,
    recoilPitch: 0.006,
    recoilYaw: 0.004,
    kick: 0.05,
    shake: 0.1,
    fovPunch: 0.8,
    damage: 30,
    headMult: 3,
    boltTime: 0,
    tracerColor: 0xffe9b0,
    shellColor: 0xd9a441,
    firePitch: 620,
    fireDecay: 0.07,
  },
  {
    id: "ak",
    name: "AK-47",
    short: "AK-47",
    rpm: 600,
    magSize: 30,
    reserve: 120,
    reloadTime: 2.1,
    auto: true,
    baseSpread: 0.012,
    bloomPerShot: 0.0028,
    maxBloom: 0.034,
    moveSpread: 0.026,
    recoilPitch: 0.011,
    recoilYaw: 0.006,
    kick: 0.085,
    shake: 0.16,
    fovPunch: 1.4,
    damage: 36,
    headMult: 2.5,
    boltTime: 0,
    tracerColor: 0xffd9a0,
    shellColor: 0xd9a441,
    firePitch: 340,
    fireDecay: 0.09,
  },
  {
    id: "awp",
    name: "AWP",
    short: "AWP",
    rpm: 41,
    magSize: 5,
    reserve: 20,
    reloadTime: 2.8,
    auto: false,
    baseSpread: 0.0035,
    bloomPerShot: 0.0015,
    maxBloom: 0.012,
    moveSpread: 0.03,
    recoilPitch: 0.02,
    recoilYaw: 0.008,
    kick: 0.16,
    shake: 0.34,
    fovPunch: 2.6,
    damage: 100,
    headMult: 2,
    boltTime: 0.95,
    tracerColor: 0xcfe8ff,
    shellColor: 0xb8a44a,
    firePitch: 160,
    fireDecay: 0.34,
  },
];

export const WEAPON_MAP: Record<WeaponId, WeaponDef> = {
  glock: WEAPONS[0],
  ak: WEAPONS[1],
  awp: WEAPONS[2],
};

export const WEAPON_ORDER: WeaponId[] = ["glock", "ak", "awp"];
