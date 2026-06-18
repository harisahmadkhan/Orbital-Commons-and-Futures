import type { Particle, ParticleType } from '../types';

const PARTICLE_COLORS: Record<ParticleType, string> = {
  solar: '#FFD700',
  grid: '#D4A017',
  water: '#4A90D9',
  waste_heat: '#FF6B35',
  radiative: '#FFB6C1',
  data_up: '#00E5FF',
  data_down: '#008B9E',
  compute: '#FFFFFF',
};

const MAX_PARTICLES = 600;

export class ParticleSystem {
  private particles: Particle[] = [];
  private spawnAccumulators: Partial<Record<ParticleType, number>> = {};

  getParticles(): readonly Particle[] {
    return this.particles;
  }

  clear() {
    this.particles.length = 0;
  }

  spawnBurst(
    type: ParticleType,
    x: number,
    y: number,
    count: number,
    options?: {
      vx?: number;
      vy?: number;
      spread?: number;
      life?: number;
      size?: number;
    }
  ) {
    const spread = options?.spread ?? 2;
    const life = options?.life ?? 120;
    const size = options?.size ?? 2;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) break;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (options?.vx ?? 0) + (Math.random() - 0.5) * spread,
        vy: (options?.vy ?? 0) + (Math.random() - 0.5) * spread,
        type,
        alpha: 1,
        life,
        maxLife: life,
        size,
      });
    }
  }

  spawnContinuous(
    type: ParticleType,
    x: number,
    y: number,
    rate: number,
    dt: number,
    options?: {
      vx?: number;
      vy?: number;
      spread?: number;
      life?: number;
      size?: number;
    }
  ) {
    const acc = (this.spawnAccumulators[type] ?? 0) + rate * dt;
    const count = Math.floor(acc);
    this.spawnAccumulators[type] = acc - count;

    if (count > 0) {
      this.spawnBurst(type, x, y, count, options);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt * 60;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0) {
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const color = PARTICLE_COLORS[p.type];
      ctx.globalAlpha = p.alpha * 0.85;
      ctx.fillStyle = color;

      if (p.type === 'compute') {
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (p.type === 'compute') {
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
  }
}
