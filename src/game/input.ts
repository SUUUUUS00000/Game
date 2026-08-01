import type { WeaponId } from "./weapons";

export interface InputCallbacks {
  onLook: (dx: number, dy: number) => void;
  onMove: (x: number, z: number) => void;
  onFire: (down: boolean) => void;
  onReload: () => void;
  onSwitch: (w: WeaponId) => void;
  onPause: () => void;
}

/**
 * Unified input: WASD + mouse (pointer lock) on desktop,
 * virtual joystick + right-side look drag on touch.
 */
export class Input {
  private keys = new Set<string>();
  private joyId: number | null = null;
  private joyOrigin = { x: 0, y: 0 };
  private joyVec = { x: 0, y: 0 };
  private lookId: number | null = null;
  private lastLook = { x: 0, y: 0 };
  private joyBase: HTMLDivElement | null = null;
  private joyKnob: HTMLDivElement | null = null;
  isTouch = false;
  private onMoveCb: (x: number, z: number) => void = () => {};

  constructor(
    private cb: InputCallbacks,
    private el: HTMLElement
  ) {
    this.isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointercancel", this.onPointerUp);
    el.addEventListener("contextmenu", this.onCtx);

    // joystick DOM
    this.joyBase = document.createElement("div");
    this.joyBase.className = "joy-base";
    this.joyBase.style.display = "none";
    this.joyKnob = document.createElement("div");
    this.joyKnob.className = "joy-knob";
    this.joyBase.appendChild(this.joyKnob);
    el.appendChild(this.joyBase);

    // continuous move emission
    this.onMoveCb = cb.onMove;
    const emit = () => {
      this.updateMove();
      requestAnimationFrame(emit);
    };
    requestAnimationFrame(emit);
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.el.removeEventListener("pointerdown", this.onPointerDown);
    this.el.removeEventListener("pointermove", this.onPointerMove);
    this.el.removeEventListener("pointerup", this.onPointerUp);
    this.el.removeEventListener("pointercancel", this.onPointerUp);
    this.el.removeEventListener("contextmenu", this.onCtx);
    if (this.joyBase?.parentElement === this.el) this.el.removeChild(this.joyBase);
  }

  private onCtx = (e: Event) => e.preventDefault();

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    this.keys.add(e.code);
    if (e.code === "Space") this.cb.onFire(true);
    if (e.code === "KeyR") this.cb.onReload();
    if (e.code === "Digit1") this.cb.onSwitch("glock");
    if (e.code === "Digit2") this.cb.onSwitch("ak");
    if (e.code === "Digit3") this.cb.onSwitch("awp");
    if (e.code === "Escape" || e.code === "KeyP") this.cb.onPause();
    if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
    if (e.code === "Space") this.cb.onFire(false);
  };

  private updateMove() {
    let x = 0;
    let z = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) z += 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) z -= 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) x -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) x += 1;
    const jx = this.joyVec.x;
    const jz = this.joyVec.y;
    const jl = Math.hypot(jx, jz);
    if (jl > 0.12) {
      x += (jx / jl) * Math.min(1, jl);
      z += (jz / jl) * Math.min(1, jl);
    }
    const l = Math.hypot(x, z);
    if (l > 1) {
      x /= l;
      z /= l;
    }
    this.onMoveCb(x, z);
  }

  getSprint() {
    return !this.keys.has("ShiftLeft") && !this.keys.has("ShiftRight");
  }

  private onPointerDown = (e: PointerEvent) => {
    if (document.pointerLockElement === this.el && e.pointerType === "mouse") {
      if (e.button === 0) this.cb.onFire(true);
      return;
    }

    try {
      this.el.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    const rect = this.el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < rect.width * 0.45) {
      // joystick zone
      this.joyId = e.pointerId;
      this.joyOrigin = { x, y };
      this.joyVec = { x: 0, y: 0 };
      if (this.joyBase) {
        this.joyBase.style.display = "block";
        this.joyBase.style.left = `${x}px`;
        this.joyBase.style.top = `${y}px`;
      }
    } else {
      this.lookId = e.pointerId;
      this.lastLook = { x: e.clientX, y: e.clientY };
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (document.pointerLockElement === this.el && e.pointerType === "mouse") {
      this.cb.onLook(e.movementX, e.movementY);
      return;
    }

    if (e.pointerId === this.lookId) {
      const dx = e.clientX - this.lastLook.x;
      const dy = e.clientY - this.lastLook.y;
      this.lastLook = { x: e.clientX, y: e.clientY };
      this.cb.onLook(dx * 1.5, dy * 1.5);
    } else if (e.pointerId === this.joyId) {
      const dx = e.clientX - (this.joyOrigin.x + this.el.getBoundingClientRect().left);
      const dy = e.clientY - (this.joyOrigin.y + this.el.getBoundingClientRect().top);
      const max = 52;
      const l = Math.hypot(dx, dy);
      const cl = Math.min(l, max);
      const nx = l > 0 ? (dx / l) * cl : 0;
      const ny = l > 0 ? (dy / l) * cl : 0;
      this.joyVec = { x: nx / max, y: ny / max };
      if (this.joyKnob) {
        this.joyKnob.style.transform = `translate(${nx}px, ${ny}px)`;
      }
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (document.pointerLockElement === this.el && e.pointerType === "mouse") {
      if (e.button === 0) this.cb.onFire(false);
      return;
    }
    if (e.pointerId === this.lookId) {
      this.lookId = null;
    } else if (e.pointerId === this.joyId) {
      this.joyId = null;
      this.joyVec = { x: 0, y: 0 };
      if (this.joyBase) this.joyBase.style.display = "none";
      if (this.joyKnob) this.joyKnob.style.transform = "translate(0px, 0px)";
    }
  };

  requestLock() {
    if (!this.isTouch && this.el.requestPointerLock) {
      try {
        this.el.requestPointerLock();
      } catch {
        /* noop */
      }
    }
  }

  unlock() {
    if (document.pointerLockElement === this.el) document.exitPointerLock();
  }
}
