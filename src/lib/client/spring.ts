/**
 * One damped harmonic oscillator, re-targetable mid-flight. Drives numbers, bars, the
 * mobile sheet, segmented thumbs, tilt and toasts. Integrated in small fixed sub-steps so
 * it stays stable on slow frames.
 */
export interface SpringOptions {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Rest threshold, in the same units as the value. */
  precision?: number;
  onUpdate: (value: number) => void;
}

const SUB_STEP = 0.004;
const MAX_FRAME = 0.05;

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export class Spring {
  value: number;
  velocity = 0;
  target: number;
  private readonly k: number;
  private readonly c: number;
  private readonly m: number;
  private readonly eps: number;
  private readonly onUpdate: (value: number) => void;
  private onRest: (() => void) | null = null;
  private raf = 0;
  private last = 0;

  constructor(initial: number, options: SpringOptions) {
    this.value = initial;
    this.target = initial;
    this.k = options.stiffness ?? 170;
    this.c = options.damping ?? 20;
    this.m = options.mass ?? 1;
    this.eps = options.precision ?? 0.01;
    this.onUpdate = options.onUpdate;
  }

  get isMoving(): boolean {
    return this.raf !== 0;
  }

  to(target: number, opts: { velocity?: number; onRest?: () => void } = {}): void {
    this.target = target;
    this.onRest = opts.onRest ?? null;
    if (opts.velocity !== undefined) this.velocity = opts.velocity;
    if (prefersReducedMotion()) {
      this.jump(target);
      return;
    }
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  jump(target: number): void {
    this.stop();
    this.value = this.target = target;
    this.velocity = 0;
    this.onUpdate(target);
    this.finish();
  }

  /** Hold the value still (e.g. while a finger drags it) without notifying. */
  set(value: number): void {
    this.stop();
    this.value = value;
    this.velocity = 0;
  }

  stop(): void {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private finish(): void {
    const cb = this.onRest;
    this.onRest = null;
    cb?.();
  }

  private tick = (now: number): void => {
    const dt = Math.min(MAX_FRAME, (now - this.last) / 1000);
    this.last = now;
    const steps = Math.max(1, Math.ceil(dt / SUB_STEP));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const accel = (-this.k * (this.value - this.target) - this.c * this.velocity) / this.m;
      this.velocity += accel * h;
      this.value += this.velocity * h;
    }
    if (Math.abs(this.velocity) < this.eps * 10 && Math.abs(this.value - this.target) < this.eps) {
      this.raf = 0;
      this.value = this.target;
      this.velocity = 0;
      this.onUpdate(this.value);
      this.finish();
      return;
    }
    this.onUpdate(this.value);
    this.raf = requestAnimationFrame(this.tick);
  };
}
