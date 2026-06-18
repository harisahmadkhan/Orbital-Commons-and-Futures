import { useEffect, useRef, useCallback } from 'react';
import type { OrbitType, SimMetrics } from '../types';
import { OrbitalMechanics } from '../engine/OrbitalMechanics';
import { ParticleSystem } from '../engine/ParticleSystem';

interface SimulationProps {
  orbitType: OrbitType;
  isPaused: boolean;
  timeScale: number;
  onMetricsUpdate: (metrics: SimMetrics) => void;
}

const BG_COLOR = '#0F0F0F';
const EARTH_COLOR_TOP = '#1a3a5c';
const EARTH_COLOR_BOTTOM = '#0a1628';
const ATMOSPHERE_GRADIENT_HEIGHT = 60;

export function Simulation({
  orbitType,
  isPaused,
  timeScale,
  onMetricsUpdate,
}: SimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mechanicsRef = useRef(new OrbitalMechanics());
  const particlesRef = useRef(new ParticleSystem());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const metricsAccRef = useRef({
    solar_kwh: 0,
    grid_kwh: 0,
    water_total: 0,
    elapsed: 0,
  });

  useEffect(() => {
    mechanicsRef.current.setOrbitType(orbitType);
  }, [orbitType]);

  const render = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      const mechanics = mechanicsRef.current;
      const horizonY = h * 0.65;

      ctx.fillStyle = BG_COLOR;
      ctx.fillRect(0, 0, w, h);

      const atmosGrad = ctx.createLinearGradient(
        0,
        horizonY - ATMOSPHERE_GRADIENT_HEIGHT,
        0,
        horizonY + 20
      );
      atmosGrad.addColorStop(0, 'transparent');
      atmosGrad.addColorStop(0.5, 'rgba(60, 130, 200, 0.08)');
      atmosGrad.addColorStop(0.8, 'rgba(40, 90, 160, 0.15)');
      atmosGrad.addColorStop(1, EARTH_COLOR_TOP);
      ctx.fillStyle = atmosGrad;
      ctx.fillRect(0, horizonY - ATMOSPHERE_GRADIENT_HEIGHT, w, ATMOSPHERE_GRADIENT_HEIGHT + 20);

      const earthGrad = ctx.createLinearGradient(0, horizonY, 0, h);
      earthGrad.addColorStop(0, EARTH_COLOR_TOP);
      earthGrad.addColorStop(1, EARTH_COLOR_BOTTOM);
      ctx.fillStyle = earthGrad;
      ctx.fillRect(0, horizonY, w, h - horizonY);

      drawStars(ctx, w, horizonY);
      drawOrbitPath(ctx, w, horizonY);
      drawOrbitalPlatform(ctx, mechanics, w, horizonY);
      drawGroundDataCenter(ctx, w, h, horizonY);
      drawGroundStations(ctx, w, horizonY);

      particlesRef.current.render(ctx);

      if (mechanics.isInEclipse()) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, w, horizonY);
        ctx.fillStyle = 'rgba(255, 200, 50, 0.6)';
        ctx.font = '11px "DM Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ECLIPSE', w / 2, 20);
        ctx.textAlign = 'start';
      }

      if (mechanics.isCoverageActive(Math.PI * 0.25)) {
        drawDownlink(ctx, mechanics, w, horizonY);
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const rawDt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = timestamp;

      const dt = isPaused ? 0 : rawDt;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const mechanics = mechanicsRef.current;
      const particles = particlesRef.current;

      mechanics.update(dt, timeScale);
      spawnParticles(mechanics, particles, dt, timeScale, w, h);
      particles.update(dt);

      const acc = metricsAccRef.current;
      acc.elapsed += dt * timeScale;
      const irradiance = mechanics.getSolarIrradiance();
      const solarPower = irradiance > 0 ? 40 * (irradiance / 1361) : 0;
      acc.solar_kwh += solarPower * dt * timeScale / 3600;
      acc.grid_kwh += 38 * dt * timeScale / 3600;
      acc.water_total += 50 * dt * timeScale;

      const hours = Math.max(acc.elapsed / 3600, 0.001);
      onMetricsUpdate({
        solar_kwh: Math.round(acc.solar_kwh * 10) / 10,
        grid_kwh: Math.round(acc.grid_kwh * 10) / 10,
        water_liters_per_hour: Math.round(acc.water_total / hours),
        carbon_per_tflop: Math.round(420 * (1 - solarPower / 80)),
        latency_ms: mechanics.getLatencyMs(),
        downlink_utilization:
          mechanics.isCoverageActive(Math.PI * 0.25)
            ? Math.min(1, 0.4 + Math.random() * 0.3)
            : 0,
        orbital_compute_tflops: irradiance > 0 ? 312 : 0,
        ground_compute_tflops: 2400,
      });

      render(ctx, w, h);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isPaused, timeScale, render, onMetricsUpdate]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        background: BG_COLOR,
      }}
    />
  );
}

let starPositions: { x: number; y: number; r: number; b: number }[] = [];

function drawStars(ctx: CanvasRenderingContext2D, w: number, maxY: number) {
  if (starPositions.length === 0) {
    for (let i = 0; i < 200; i++) {
      starPositions.push({
        x: Math.random() * 2000,
        y: Math.random() * 1200,
        r: Math.random() * 1.2 + 0.3,
        b: Math.random() * 0.5 + 0.3,
      });
    }
  }
  ctx.fillStyle = '#ffffff';
  for (const s of starPositions) {
    const sx = (s.x / 2000) * w;
    const sy = (s.y / 1200) * maxY;
    if (sy < maxY - 20) {
      ctx.globalAlpha = s.b;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawOrbitPath(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number
) {
  const cx = w / 2;
  const cy = horizonY - 20;
  const rx = w * 0.4;
  const ry = rx * 0.3;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawOrbitalPlatform(
  ctx: CanvasRenderingContext2D,
  mechanics: OrbitalMechanics,
  w: number,
  horizonY: number
) {
  const cx = w / 2;
  const cy = horizonY - 20;
  const rx = w * 0.4;
  const ry = rx * 0.3;
  const angle = mechanics.getAngle();

  const x = cx + Math.cos(angle) * rx;
  const y = cy - Math.sin(angle) * ry;

  if (y > horizonY - 10) return;

  const inEclipse = mechanics.isInEclipse();
  const glow = inEclipse ? 'rgba(100, 100, 120, 0.3)' : 'rgba(255, 215, 0, 0.3)';

  ctx.shadowColor = glow;
  ctx.shadowBlur = 12;
  ctx.fillStyle = inEclipse ? '#555' : '#e0c050';
  ctx.fillRect(x - 4, y - 3, 8, 6);
  ctx.shadowBlur = 0;

  ctx.fillStyle = inEclipse ? '#444' : '#3a7bd5';
  ctx.fillRect(x - 14, y - 1.5, 10, 3);
  ctx.fillRect(x + 4, y - 1.5, 10, 3);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.font = '9px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(mechanics.getOrbitType(), x, y - 10);
  ctx.textAlign = 'start';
}

function drawGroundDataCenter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number
) {
  const dcX = w * 0.2;
  const dcY = horizonY + (h - horizonY) * 0.3;
  const bw = 50;
  const bh = 30;

  ctx.fillStyle = '#1e2a3a';
  ctx.fillRect(dcX - bw / 2, dcY - bh, bw, bh);
  ctx.strokeStyle = '#2a4060';
  ctx.lineWidth = 1;
  ctx.strokeRect(dcX - bw / 2, dcY - bh, bw, bh);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#00cc66' : '#cc6600';
    ctx.beginPath();
    ctx.arc(dcX - 15 + i * 12, dcY - bh + 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#334455';
  ctx.fillRect(dcX - bw / 2 - 5, dcY - bh - 15, 12, 15);
  ctx.fillRect(dcX + bw / 2 - 7, dcY - bh - 20, 12, 20);

  ctx.fillStyle = 'rgba(150, 200, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(dcX - bw / 2 - 0, dcY - bh - 15, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = '9px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GROUND DC', dcX, dcY + 14);
  ctx.textAlign = 'start';
}

function drawGroundStations(
  ctx: CanvasRenderingContext2D,
  w: number,
  horizonY: number
) {
  const stations = [
    { name: 'GS-1', x: w * 0.55 },
    { name: 'GS-2', x: w * 0.75 },
  ];

  for (const gs of stations) {
    const y = horizonY + 8;
    ctx.fillStyle = '#2a5a3a';
    ctx.beginPath();
    ctx.moveTo(gs.x, y - 8);
    ctx.lineTo(gs.x - 5, y);
    ctx.lineTo(gs.x + 5, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0, 230, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(gs.x, y - 8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '8px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(gs.name, gs.x, y + 12);
    ctx.textAlign = 'start';
  }
}

function drawDownlink(
  ctx: CanvasRenderingContext2D,
  mechanics: OrbitalMechanics,
  w: number,
  horizonY: number
) {
  const cx = w / 2;
  const cy = horizonY - 20;
  const rx = w * 0.4;
  const ry = rx * 0.3;
  const angle = mechanics.getAngle();
  const px = cx + Math.cos(angle) * rx;
  const py = cy - Math.sin(angle) * ry;

  if (py > horizonY - 10) return;

  const gsX = w * 0.55;
  const gsY = horizonY + 8;
  const beamWidth = mechanics.getDownlinkBeamWidth();

  ctx.strokeStyle = `rgba(0, 230, 255, ${0.15 * beamWidth})`;
  ctx.lineWidth = 1 + beamWidth * 2;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(gsX, gsY);
  ctx.stroke();
  ctx.setLineDash([]);
}

function spawnParticles(
  mechanics: OrbitalMechanics,
  particles: ParticleSystem,
  dt: number,
  timeScale: number,
  w: number,
  h: number
) {
  const scaledDt = dt * timeScale;
  if (scaledDt === 0) return;

  const horizonY = h * 0.65;
  const cx = w / 2;
  const cy = horizonY - 20;
  const rx = w * 0.4;
  const ry = rx * 0.3;
  const angle = mechanics.getAngle();
  const px = cx + Math.cos(angle) * rx;
  const py = cy - Math.sin(angle) * ry;

  if (!mechanics.isInEclipse() && py < horizonY - 10) {
    particles.spawnContinuous('solar', px - 14, py, 8, scaledDt, {
      vx: 0,
      vy: -0.5,
      spread: 0.8,
      life: 40,
      size: 1.5,
    });
    particles.spawnContinuous('solar', px + 14, py, 8, scaledDt, {
      vx: 0,
      vy: -0.5,
      spread: 0.8,
      life: 40,
      size: 1.5,
    });
  }

  if (py < horizonY - 10) {
    particles.spawnContinuous('compute', px, py, 3, scaledDt, {
      spread: 0.3,
      life: 20,
      size: 1,
    });

    particles.spawnContinuous('radiative', px, py, 4, scaledDt, {
      vx: 0,
      vy: -1,
      spread: 1.5,
      life: 60,
      size: 1,
    });
  }

  const dcX = w * 0.2;
  const dcY = horizonY + (h - horizonY) * 0.3;

  particles.spawnContinuous('grid', dcX - 25, dcY - 30, 5, scaledDt, {
    vx: 0.3,
    vy: -0.3,
    spread: 0.5,
    life: 30,
    size: 1.5,
  });

  particles.spawnContinuous('water', dcX + 10, dcY - 15, 3, scaledDt, {
    vx: 0.2,
    vy: -0.1,
    spread: 0.4,
    life: 50,
    size: 1.3,
  });

  particles.spawnContinuous('waste_heat', dcX, dcY - 30, 4, scaledDt, {
    vx: 0,
    vy: -0.8,
    spread: 1,
    life: 45,
    size: 1.8,
  });

  if (mechanics.isCoverageActive(Math.PI * 0.25) && py < horizonY - 10) {
    const gsX = w * 0.55;
    const gsY = horizonY + 8;
    const dx = gsX - px;
    const dy = gsY - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      particles.spawnContinuous('data_up', gsX, gsY, 2, scaledDt, {
        vx: (-dx / dist) * 2,
        vy: (-dy / dist) * 2,
        spread: 0.3,
        life: 35,
        size: 1.5,
      });
      particles.spawnContinuous('data_down', px, py, 2, scaledDt, {
        vx: (dx / dist) * 2,
        vy: (dy / dist) * 2,
        spread: 0.3,
        life: 35,
        size: 1.2,
      });
    }
  }
}
